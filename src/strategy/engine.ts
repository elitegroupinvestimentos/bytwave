import { env } from '../config/env';
import { botLog } from '../services/logs/logger';
import { getBinanceClient } from '../services/binance/factory';
import { BinanceApiError, BinanceFuturesClient } from '../services/binance/client';
import {
  createCycle,
  getOpenCycle,
  insertAccountSnapshot,
  listOrdersByCycle,
  listConfigsToProcess,
  setConfigStatus,
  updateCycle,
  updateOrder,
} from '../services/supabase/service';
import { consumeTokens, getTokenBalance } from '../services/supabase/tokens';
import { placeAndRecordOrder, refreshOrderStatus } from './orderManager';
import { buildSafetyLadder, weightedAveragePrice } from './safetyOrderManager';
import { takeProfitPrice } from './profitManager';
import type { CycleRow, CycleSide, OrderRow, StrategyConfig } from '../types';
import type { SymbolFilters } from '../utils/precision';

// Trava por usuário+symbol+side para evitar concorrência no mesmo tick.
const locks = new Set<string>();
const lockKey = (cfg: StrategyConfig, side: CycleSide) => `${cfg.user_id}:${cfg.symbol}:${side}`;

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  if (locks.has(key)) return null;
  locks.add(key);
  try {
    return await fn();
  } finally {
    locks.delete(key);
  }
}

/**
 * Executa um tick para todas as configs com status='running'.
 * Para cada config processa LONG e SHORT.
 */
export async function runTick(): Promise<void> {
  // Inclui configs running + configs com ciclos abertos (mesmo paused/stopped),
  // pra reconciliação com Binance acontecer mesmo com bot pausado.
  const configs = await listConfigsToProcess();
  if (!configs.length) return;

  for (const cfg of configs) {
    let client: BinanceFuturesClient;
    try {
      client = await getBinanceClient(cfg.user_id);
    } catch (err: any) {
      await botLog({
        level: 'error',
        scope: 'engine',
        user_id: cfg.user_id,
        message: `Sem cliente Binance: ${err.message}`,
      });
      continue;
    }

    let filters: SymbolFilters;
    try {
      filters = await client.getSymbolFilters(cfg.symbol);
    } catch (err: any) {
      await botLog({
        level: 'error',
        scope: 'engine',
        user_id: cfg.user_id,
        message: `Falha ao obter filtros do símbolo: ${err.message}`,
      });
      continue;
    }

    // Persiste snapshot de conta (não-bloqueante para o tick).
    persistSnapshot(cfg.user_id, client).catch(() => {});

    for (const side of ['LONG', 'SHORT'] as CycleSide[]) {
      const key = lockKey(cfg, side);
      await withLock(key, async () => {
        try {
          await processSide(cfg, side, client, filters);
        } catch (err: any) {
          const msg = err instanceof BinanceApiError ? `${err.code} ${err.message}` : err.message;
          await botLog({
            level: 'error',
            scope: 'engine',
            user_id: cfg.user_id,
            message: `Erro processando ${cfg.symbol} ${side}: ${msg}`,
            data: { err: String(err) },
          });
        }
      });
    }
  }
}

/**
 * Processa um lado (LONG ou SHORT). Abre ciclo se não existir, ou avança
 * o ciclo aberto (atualiza preço médio, recoloca TP, fecha se TP filled).
 */
async function processSide(
  cfg: StrategyConfig,
  side: CycleSide,
  client: BinanceFuturesClient,
  filters: SymbolFilters,
): Promise<void> {
  let cycle = await getOpenCycle(cfg.user_id, cfg.symbol, side);

  if (!cycle) {
    // Sem ciclo aberto: só abre novo se config está RUNNING.
    // Se estiver paused/stopped, não faz nada nesse lado.
    if (cfg.status !== 'running') return;
    if (!(await chargeForCycleOpen(cfg, side))) return;
    if (!(await preTradeChecks(cfg, client))) return;
    await ensureAccountReady(cfg, client);
    cycle = await openCycle(cfg, side, client, filters);
    return;
  }

  // Tem ciclo aberto: SEMPRE roda advanceCycle (mesmo com bot pausado/parado),
  // pra reconciliar com a Binance. Se o usuário fechou manualmente, o
  // ciclo é detectado e marcado como closed automaticamente.
  await advanceCycle(cfg, cycle, side, client, filters);
}

// ─── Token gate: cobra tokens antes de abrir ciclo ──────────────────────────
//
// Estratégia por enquanto: 1 ciclo = N tokens (env.TOKENS_PER_CYCLE).
// Para mudar a regra (por ordem, por tick, etc.), substituir este helper —
// o engine só chama esta função, não conhece a regra de cobrança.
//
// IMPORTANTE: a função RPC `consume_tokens` no Postgres faz lock pessimista
// (FOR UPDATE) na linha do usuário, garantindo que dois ciclos simultâneos
// (LONG + SHORT no mesmo tick) não façam consumo duplicado / saldo negativo.
const userPausedNoToken = new Set<string>();

// Pré-check para abrir ciclo: NÃO deduz tokens (cobrança é no fechamento).
// Só verifica que o usuário tem o mínimo de saldo configurado.
async function chargeForCycleOpen(cfg: StrategyConfig, _side: CycleSide): Promise<boolean> {
  if (env.TOKENS_PER_CYCLE <= 0) return true;

  const balance = await getTokenBalance(cfg.user_id).catch(() => 0);
  if (balance < env.TOKENS_PER_CYCLE) {
    await onInsufficientTokens(cfg, balance);
    return false;
  }
  userPausedNoToken.delete(cfg.user_id);
  return true;
}

// Cobrança no fechamento do ciclo, proporcional ao lucro:
// 1 token = TOKEN_USDT_RATIO USDT de lucro. Ciclos com prejuízo não pagam.
// Se o usuário tiver menos saldo do que o custo, debita o que tiver (parcial).
async function chargeForCycleProfit(
  cfg: StrategyConfig,
  cycleId: string,
  pnlUsdt: number,
): Promise<void> {
  if (pnlUsdt <= 0) return;
  if (env.TOKEN_USDT_RATIO <= 0) return;

  const cost = Math.ceil(pnlUsdt / env.TOKEN_USDT_RATIO);
  if (cost <= 0) return;

  const balance = await getTokenBalance(cfg.user_id).catch(() => 0);
  const toCharge = Math.min(cost, balance);
  if (toCharge <= 0) return;

  const result = await consumeTokens({
    user_id: cfg.user_id,
    amount: toCharge,
    reason: 'cycle_profit',
    cycle_id: cycleId,
    metadata: {
      pnl_usdt: pnlUsdt,
      ratio: env.TOKEN_USDT_RATIO,
      full_cost: cost,
      partial: toCharge < cost,
    },
  }).catch(() => ({ success: false, balance_after: balance, message: 'rpc_error' }));

  await botLog({
    level: result.success ? 'info' : 'warn',
    scope: 'tokens',
    user_id: cfg.user_id,
    cycle_id: cycleId,
    message: `Cobrado ${toCharge}/${cost} token(s) por lucro de $${pnlUsdt.toFixed(
      2,
    )} (1 token = $${env.TOKEN_USDT_RATIO}). Saldo: ${result.balance_after}`,
  });
}

async function onInsufficientTokens(cfg: StrategyConfig, balance: number) {
  // Pausa a config para parar de tentar abrir ciclos a cada tick.
  // Usuário precisa comprar tokens e clicar em Iniciar de novo.
  if (!userPausedNoToken.has(cfg.user_id)) {
    userPausedNoToken.add(cfg.user_id);
    await setConfigStatus(cfg.id, 'paused').catch(() => undefined);
    await botLog({
      level: 'warn',
      scope: 'tokens',
      user_id: cfg.user_id,
      message: `Tokens insuficientes (saldo=${balance}, necessário=${env.TOKENS_PER_CYCLE}). Bot pausado para ${cfg.symbol}.`,
      data: { balance, required: env.TOKENS_PER_CYCLE, action: 'auto_paused' },
    });
  }
}

// ─── Pre-trade checks (saldo, exposição, alavancagem) ───────────────────────
async function preTradeChecks(cfg: StrategyConfig, client: BinanceFuturesClient): Promise<boolean> {
  const { available } = await client.getUsdtBalance();
  if (available < cfg.base_order_usdt) {
    await botLog({
      level: 'warn',
      scope: 'engine',
      user_id: cfg.user_id,
      message: `Saldo disponível ${available} < base order ${cfg.base_order_usdt}. Pulando.`,
    });
    return false;
  }

  if (env.MAX_EXPOSURE_USDT > 0) {
    // Soma do invested_usdt de ciclos abertos.
    const positions = await client.positions(cfg.symbol);
    const exposure = positions.reduce(
      (acc: number, p: any) => acc + Math.abs(Number(p.notional ?? 0)),
      0,
    );
    if (exposure >= env.MAX_EXPOSURE_USDT) {
      await botLog({
        level: 'warn',
        scope: 'engine',
        user_id: cfg.user_id,
        message: `Exposição ${exposure} >= MAX_EXPOSURE_USDT ${env.MAX_EXPOSURE_USDT}. Pulando.`,
      });
      return false;
    }
  }
  return true;
}

let hedgeEnabledOnce = new Set<string>();
async function ensureAccountReady(cfg: StrategyConfig, client: BinanceFuturesClient) {
  const userKey = `${cfg.user_id}`;
  if (!hedgeEnabledOnce.has(userKey)) {
    await client.enableHedgeMode().catch(() => undefined);
    hedgeEnabledOnce.add(userKey);
  }
  // Define alavancagem do par (idempotente).
  await client.setLeverage(cfg.symbol, cfg.leverage).catch(async (err: any) => {
    await botLog({
      level: 'warn',
      scope: 'engine',
      user_id: cfg.user_id,
      message: `Falha ao definir alavancagem: ${err.message}`,
    });
  });
}

// ─── Abertura de ciclo ──────────────────────────────────────────────────────
async function openCycle(
  cfg: StrategyConfig,
  side: CycleSide,
  client: BinanceFuturesClient,
  filters: SymbolFilters,
): Promise<CycleRow> {
  const refPrice = await client.tickerPrice(cfg.symbol);

  const cycle = await createCycle({
    user_id: cfg.user_id,
    config_id: cfg.id,
    symbol: cfg.symbol,
    side,
  });

  // BASE order: MARKET com qty derivada do base_order_usdt
  const baseQty = cfg.base_order_usdt / refPrice;
  await placeAndRecordOrder({
    user_id: cfg.user_id,
    cycle_id: cycle.id,
    client,
    filters,
    symbol: cfg.symbol,
    side,
    role: 'BASE',
    type: 'MARKET',
    qty: baseQty,
  });

  // SOs NÃO são colocadas no book aqui — o bot vai DISPARAR cada SO como
  // MARKET no advanceCycle quando o preço cruzar o nível. Isso evita N
  // ordens pendentes (só o TP fica no book).

  // TP inicial — será reajustado conforme preço médio mudar
  await refreshAndPlaceTakeProfit(cfg, cycle.id, side, client, filters, refPrice, baseQty);

  await botLog({
    level: 'info',
    scope: 'engine',
    user_id: cfg.user_id,
    cycle_id: cycle.id,
    message: `Ciclo ${side} aberto em ${cfg.symbol} @ ~${refPrice}`,
  });
  return cycle;
}

// ─── Avanço de ciclo ────────────────────────────────────────────────────────
async function advanceCycle(
  cfg: StrategyConfig,
  cycle: CycleRow,
  side: CycleSide,
  client: BinanceFuturesClient,
  filters: SymbolFilters,
) {
  // 1) Sincroniza ordens locais com a Binance
  const orders = await listOrdersByCycle(cycle.id);
  const refreshed: OrderRow[] = [];
  for (const o of orders) refreshed.push(await refreshOrderStatus(client, o));

  // 1.5) RECONCILIAÇÃO: se o usuário fechou manualmente na Binance,
  // a posição vai sumir mesmo com o ciclo aberto no DB. Detectamos isso
  // comparando "tinha qty preenchida" no DB vs posição real na Binance.
  const filledTotalQty = refreshed
    .filter((o) => o.role === 'BASE' || o.role === 'SAFETY')
    .reduce((s, o) => s + Number(o.filled_qty || 0), 0);

  if (filledTotalQty > 0) {
    const positions = await client.positions(cfg.symbol).catch(() => [] as any[]);
    const sidePos = (positions as any[]).find((p) => p.positionSide === side);
    const realQty = sidePos ? Math.abs(Number(sidePos.positionAmt ?? 0)) : 0;

    if (realQty === 0) {
      // Posição fechada externamente — limpa ordens órfãs + fecha ciclo no DB.
      for (const o of refreshed) {
        if (o.binance_order_id && o.status !== 'FILLED' && o.status !== 'CANCELED') {
          await client.cancelOrder(cfg.symbol, o.binance_order_id).catch(() => undefined);
          await updateOrder(o.id, { status: 'CANCELED' });
        }
      }

      // PnL aproximado: usa mark/preço atual como preço de saída.
      const markPrice = sidePos
        ? Number(sidePos.markPrice ?? 0)
        : await client.tickerPrice(cfg.symbol).catch(() => 0);
      const fills = refreshed
        .filter((o) => o.role === 'BASE' || o.role === 'SAFETY')
        .filter((o) => o.filled_qty > 0 && o.avg_fill_price)
        .map((o) => ({ price: Number(o.avg_fill_price), qty: Number(o.filled_qty) }));
      const { avg, totalQty } = weightedAveragePrice(fills);
      const approxPnl =
        markPrice > 0 && avg > 0
          ? side === 'LONG'
            ? (markPrice - avg) * totalQty
            : (avg - markPrice) * totalQty
          : 0;

      await updateCycle(cycle.id, {
        status: 'closed',
        closed_at: new Date().toISOString(),
        avg_price: avg,
        total_qty: totalQty,
        realized_pnl_usdt: approxPnl,
      });

      // Cobra tokens proporcional ao lucro (se houver)
      await chargeForCycleProfit(cfg, cycle.id, approxPnl);

      // AUTO-PAUSE: usuário fechou manualmente → provavelmente NÃO quer
      // que o bot abra ciclo novo automaticamente. Pausa a config.
      // Se quiser voltar a operar, basta clicar em Iniciar.
      if (cfg.status === 'running') {
        await setConfigStatus(cfg.id, 'paused').catch(() => undefined);
      }

      await botLog({
        level: 'info',
        scope: 'engine',
        user_id: cfg.user_id,
        cycle_id: cycle.id,
        message: `Ciclo ${side} fechado externamente — bot pausado. PnL aprox ${approxPnl.toFixed(2)} USDT (mark ${markPrice}, avg ${avg.toFixed(2)})`,
      });
      return;
    }
  }

  // 2) Calcula posição (BASE + SOs filled)
  const fills = refreshed
    .filter((o) => o.role === 'BASE' || o.role === 'SAFETY')
    .filter((o) => o.filled_qty > 0 && o.avg_fill_price)
    .map((o) => ({ price: Number(o.avg_fill_price), qty: Number(o.filled_qty) }));

  const { avg, totalQty, invested } = weightedAveragePrice(fills);
  const filledSO = refreshed.filter(
    (o) => o.role === 'SAFETY' && o.status === 'FILLED',
  ).length;

  await updateCycle(cycle.id, {
    avg_price: avg,
    total_qty: totalQty,
    invested_usdt: invested,
    base_qty: Number(refreshed.find((o) => o.role === 'BASE')?.filled_qty ?? 0),
    filled_safety_count: filledSO,
  });

  // Ações ATIVAS (trigger SOs, recolocar TP) só rodam se bot estiver running.
  // Se estiver paused/stopped, mantemos posição/ordem como estão e só
  // reconciliamos quando algo fechar (manual ou TP).
  if (cfg.status === 'running') {
    // 2.5) Dispara próximas SOs como MARKET se o preço cruzou o nível.
    await triggerSafetyOrders(cfg, cycle, side, client, filters, refreshed);

    // 3) Ajusta o TAKE_PROFIT se preço médio mudou
    const tp = refreshed.find((o) => o.role === 'TAKE_PROFIT');
    const newTpPrice = takeProfitPrice(cfg, avg || 0, side);
    if (avg > 0 && tp && tp.status !== 'FILLED') {
      const tpPrice = Number(tp.stop_price ?? tp.price ?? 0);
      const driftPct = tpPrice > 0 ? Math.abs(tpPrice - newTpPrice) / tpPrice : 1;
      // Se drift > 0.05% recoloca o TP.
      if (driftPct > 0.0005) {
        try {
          if (tp.binance_order_id) {
            await client.cancelOrder(cfg.symbol, tp.binance_order_id).catch(() => undefined);
            await updateOrder(tp.id, { status: 'CANCELED' });
          }
          await refreshAndPlaceTakeProfit(cfg, cycle.id, side, client, filters, avg, totalQty);
        } catch (err: any) {
          await botLog({
            level: 'warn',
            scope: 'engine',
            user_id: cfg.user_id,
            cycle_id: cycle.id,
            message: `Falha ao reposicionar TP: ${err.message}`,
          });
        }
      }
    }
  }

  // 4) Fecha o ciclo se o TP foi filled
  const filledTp = refreshed.find((o) => o.role === 'TAKE_PROFIT' && o.status === 'FILLED');
  if (filledTp) {
    const closePrice = Number(filledTp.avg_fill_price ?? 0);
    const pnl =
      side === 'LONG'
        ? (closePrice - avg) * totalQty
        : (avg - closePrice) * totalQty;

    // Cancela quaisquer SOs pendentes do ciclo.
    for (const o of refreshed) {
      if (o.role === 'SAFETY' && o.status !== 'FILLED' && o.binance_order_id) {
        await client.cancelOrder(cfg.symbol, o.binance_order_id).catch(() => undefined);
        await updateOrder(o.id, { status: 'CANCELED' });
      }
    }

    await updateCycle(cycle.id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      realized_pnl_usdt: pnl,
    });

    // Cobra tokens proporcional ao lucro (TP fechou no positivo)
    await chargeForCycleProfit(cfg, cycle.id, pnl);

    await botLog({
      level: 'info',
      scope: 'engine',
      user_id: cfg.user_id,
      cycle_id: cycle.id,
      message: `Ciclo ${side} fechado. PnL ≈ ${pnl.toFixed(4)} USDT`,
    });
  }
}

/**
 * Dispara MARKET pra cada SO que teve seu nível tocado pelo preço atual.
 * SOs são ordenadas (LONG: descendentes, SHORT: ascendentes), então paramos
 * no primeiro que ainda não foi atingido — todas as próximas também não foram.
 *
 * Tracking: usamos a quantidade de ordens com role='SAFETY' já registradas
 * no DB (independente do status) como índice da próxima SO a verificar.
 */
async function triggerSafetyOrders(
  cfg: StrategyConfig,
  cycle: CycleRow,
  side: CycleSide,
  client: BinanceFuturesClient,
  filters: SymbolFilters,
  orders: OrderRow[],
) {
  const placedSO = orders.filter((o) => o.role === 'SAFETY').length;
  if (placedSO >= cfg.max_safety_orders) return;

  // Preço de entrada da BASE — referência fixa pra escada.
  const baseOrder = orders.find(
    (o) => o.role === 'BASE' && (o.status === 'FILLED' || Number(o.filled_qty) > 0),
  );
  if (!baseOrder?.avg_fill_price) return;
  const basePrice = Number(baseOrder.avg_fill_price);

  let currentPrice: number;
  try {
    currentPrice = await client.tickerPrice(cfg.symbol);
  } catch {
    return;
  }

  const ladder = buildSafetyLadder(cfg, basePrice, side);
  for (let i = placedSO; i < ladder.length; i++) {
    const so = ladder[i];
    const triggered = side === 'LONG' ? currentPrice <= so.price : currentPrice >= so.price;
    if (!triggered) break; // escada ordenada — se essa não atingiu, próximas tb não

    try {
      await placeAndRecordOrder({
        user_id: cfg.user_id,
        cycle_id: cycle.id,
        client,
        filters,
        symbol: cfg.symbol,
        side,
        role: 'SAFETY',
        type: 'MARKET',
        qty: so.qty,
      });
      await botLog({
        level: 'info',
        scope: 'engine',
        user_id: cfg.user_id,
        cycle_id: cycle.id,
        message: `SO #${so.index} disparada (MARKET) — preço ${currentPrice} cruzou ${so.price.toFixed(2)}`,
      });
    } catch (err: any) {
      await botLog({
        level: 'warn',
        scope: 'engine',
        user_id: cfg.user_id,
        cycle_id: cycle.id,
        message: `SO #${so.index} falhou: ${err.message ?? err}`,
      });
      break;
    }
  }
}

async function refreshAndPlaceTakeProfit(
  cfg: StrategyConfig,
  cycle_id: string,
  side: CycleSide,
  client: BinanceFuturesClient,
  filters: SymbolFilters,
  avgPrice: number,
  qty: number,
) {
  const tpPrice = takeProfitPrice(cfg, avgPrice, side);
  // TP é uma ordem LIMIT no preço alvo. Quando o mercado atinge o preço,
  // a ordem é casada e fecha a posição (em hedge mode, side oposto +
  // positionSide=LONG/SHORT já fecha o lado certo).
  // Usamos LIMIT em vez de TAKE_PROFIT_MARKET porque a Binance retorna
  // -4120 ("use Algo Orders API") pra TAKE_PROFIT_MARKET em alguns casos
  // — LIMIT é universalmente aceita e ainda paga maker fee.
  await placeAndRecordOrder({
    user_id: cfg.user_id,
    cycle_id,
    client,
    filters,
    symbol: cfg.symbol,
    side,
    role: 'TAKE_PROFIT',
    type: 'LIMIT',
    qty,
    price: tpPrice,
  });
}

async function persistSnapshot(user_id: string, client: BinanceFuturesClient) {
  try {
    const { total, available } = await client.getUsdtBalance();
    const acc = await client.accountInfo();
    const unrealized = Number(acc.totalUnrealizedProfit ?? 0);
    const exposure = (acc.positions ?? []).reduce(
      (s: number, p: any) => s + Math.abs(Number(p.notional ?? 0)),
      0,
    );
    await insertAccountSnapshot({
      user_id,
      total_balance: total,
      available,
      unrealized_pnl: unrealized,
      exposure_usdt: exposure,
      raw: { totalWalletBalance: acc.totalWalletBalance },
    });
  } catch {
    // snapshot é best-effort
  }
}
