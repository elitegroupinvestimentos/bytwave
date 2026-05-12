import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createUserSchema,
  saveBinanceKeysSchema,
  strategyConfigSchema,
  botActionSchema,
} from '../utils/validators';
import {
  createUser,
  getUser,
  getUserByEmail,
  saveBinanceKeys,
  upsertStrategyConfig,
  getStrategyConfig,
  listStrategiesForUser,
  setConfigStatus,
  listOpenOrders,
  listOrderHistory,
  listOpenCyclesForUser,
  listClosedCyclesForUser,
  getPerformanceSummary,
  getOpenCycle,
  updateCycle,
} from '../services/supabase/service';
import { getBinanceClient, invalidateBinanceClient } from '../services/binance/factory';
import { botLog } from '../services/logs/logger';
import { env } from '../config/env';
import {
  getTokenBalance,
  grantTokens,
  listTokenPacks,
  listTokenTransactions,
  purchasePack,
} from '../services/supabase/tokens';
import { hashPassword, comparePassword, signJwt, verifyJwt } from '../services/auth';
import { supabase } from '../services/supabase/client';

export const router = Router();

// helper para tratar errors uniformes
function ah(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ─────────────────────────────────────────────────────────────────────
// requireAuth — valida JWT do header Authorization: Bearer <token>
// e seta req.user com {id, email}.
// ─────────────────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'Token ausente' });
  }
  const token = auth.slice('Bearer '.length).trim();
  try {
    const payload = verifyJwt(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Token inválido ou expirado' });
  }
}

// Garante que o user_id do path/body bate com o do JWT (proteção contra
// cliente malicioso passar user_id de outra pessoa).
function requireSelf(getUserId: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    const target = getUserId(req);
    if (!target || target !== req.user?.id) {
      return res.status(403).json({ error: 'forbidden', message: 'Recurso não pertence ao usuário autenticado' });
    }
    next();
  };
}

// ── meta ────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ ok: true, mode: env.BINANCE_MODE });
});

// ── auth (cadastro + login com senha + JWT) ────────────────────────────────
//
// Fluxo:
//  - POST /auth/register: cria usuário com bcrypt(password) + retorna JWT
//  - POST /auth/login:    valida senha + retorna JWT
//  - GET /auth/me:        devolve usuário logado (valida o token)

const registerSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
});

router.post(
  '/auth/register',
  ah(async (req, res) => {
    const body = registerSchema.parse(req.body);

    const existing = await getUserByEmail(body.email);
    if (existing) {
      return res.status(409).json({
        error: 'email_in_use',
        message: 'Já existe uma conta com esse e-mail. Faça login.',
      });
    }

    const password_hash = await hashPassword(body.password);
    const user = await createUser({ email: body.email, name: body.name, password_hash });
    const token = signJwt({ sub: user.id, email: user.email });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        token_balance: user.token_balance,
      },
    });
  }),
);

const loginSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1),
});

router.post(
  '/auth/login',
  ah(async (req, res) => {
    const body = loginSchema.parse(req.body);

    // Busca incluindo password_hash (que é nullable)
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, token_balance, password_hash')
      .eq('email', body.email)
      .maybeSingle();
    if (error) throw error;

    const fail = () =>
      res.status(401).json({ error: 'invalid_credentials', message: 'E-mail ou senha inválidos' });

    if (!data || !data.password_hash) return fail();
    const ok = await comparePassword(body.password, data.password_hash);
    if (!ok) return fail();

    const token = signJwt({ sub: data.id, email: data.email });
    res.json({
      token,
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        token_balance: data.token_balance,
      },
    });
  }),
);

// Devolve o usuário autenticado pelo JWT (para o front confirmar a sessão).
router.get(
  '/auth/me',
  requireAuth,
  ah(async (req, res) => {
    const u = await getUser(req.user!.id);
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      token_balance: u.token_balance,
    });
  }),
);

// ── users (rotas internas; user_id vem do path mas valida JWT) ──────────────
router.get(
  '/users/:id',
  requireAuth,
  requireSelf((req) => req.params.id),
  ah(async (req, res) => {
    const u = await getUser(req.params.id);
    if (!u) return res.status(404).json({ error: 'not found' });
    res.json(u);
  }),
);

// ── binance keys (protegido) ───────────────────────────────────────────────
router.post(
  '/binance/keys',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = saveBinanceKeysSchema.parse(req.body);
    const saved = await saveBinanceKeys(body);
    invalidateBinanceClient(body.user_id);
    res.json(saved);
  }),
);

// Endpoint utilitário para validar credenciais (chama /balance).
router.get(
  '/binance/test/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const client = await getBinanceClient(req.params.user_id);
    const { total, available } = await client.getUsdtBalance();
    res.json({ ok: true, mode: env.BINANCE_MODE, total, available });
  }),
);

// Fechar uma ou várias posições. Sem symbol/side = fecha tudo do usuário.
const closePositionsSchema = z.object({
  user_id: z.string().uuid(),
  symbol: z.string().optional(),
  position_side: z.enum(['LONG', 'SHORT']).optional(),
});

router.post(
  '/positions/close',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = closePositionsSchema.parse(req.body);

    let client;
    try {
      client = await getBinanceClient(body.user_id);
    } catch (err: any) {
      return res.status(400).json({ error: 'no_keys', message: err.message });
    }

    const all = await client.positions(body.symbol);
    const targets = (all as any[]).filter((p) => {
      const amt = Math.abs(Number(p.positionAmt ?? 0));
      if (amt === 0) return false;
      if (body.symbol && p.symbol !== body.symbol.toUpperCase()) return false;
      if (body.position_side && p.positionSide !== body.position_side) return false;
      return true;
    });

    const closed: any[] = [];
    const errors: any[] = [];
    for (const p of targets) {
      const amt = Number(p.positionAmt);
      const isLong = amt > 0 || p.positionSide === 'LONG';
      // Capturado ANTES do market de fechamento: vira o PnL realizado
      // efetivo, igual ao que a Binance vai registrar.
      const pnlAtClose = Number(p.unrealizedProfit ?? 0);
      try {
        await client.placeOrder({
          symbol: p.symbol,
          side: isLong ? 'SELL' : 'BUY',
          positionSide: p.positionSide,
          type: 'MARKET',
          quantity: Math.abs(amt),
        });
        closed.push({
          symbol: p.symbol,
          side: p.positionSide,
          qty: Math.abs(amt),
          pnl: pnlAtClose,
        });

        // Atualiza ciclo correspondente no DB com o PnL real.
        // Evita que a reconciliação no engine use markPrice/tickerPrice
        // como proxy (que pode dar 0 ou impreciso).
        try {
          const cycle = await getOpenCycle(body.user_id, p.symbol, p.positionSide);
          if (cycle) {
            await updateCycle(cycle.id, {
              status: 'closed',
              closed_at: new Date().toISOString(),
              realized_pnl_usdt: pnlAtClose,
            });
            await botLog({
              level: 'info',
              scope: 'api',
              user_id: body.user_id,
              cycle_id: cycle.id,
              message: `Ciclo ${p.positionSide} fechado manualmente. PnL = ${pnlAtClose.toFixed(4)} USDT`,
            });
          }
        } catch (dbErr: any) {
          // Não falha o fechamento se DB der erro — só loga.
          await botLog({
            level: 'warn',
            scope: 'api',
            user_id: body.user_id,
            message: `Falha ao atualizar ciclo após fechamento manual: ${dbErr.message}`,
          });
        }
      } catch (e: any) {
        errors.push({ symbol: p.symbol, side: p.positionSide, err: e.message });
      }
    }

    await botLog({
      level: 'info',
      scope: 'api',
      user_id: body.user_id,
      message: `Usuário fechou ${closed.length} posição(ões) (${body.symbol ?? 'todas'} ${body.position_side ?? ''})`,
      data: { closed, errors },
    });

    res.json({ ok: true, closed, errors });
  }),
);

// Posições abertas na Binance (qty != 0). Devolve symbol, lado, qty,
// preço de entrada, mark price, alavancagem, PnL não realizado.
router.get(
  '/positions/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    try {
      const client = await getBinanceClient(req.params.user_id);
      const positions = await client.positions();
      // Devolve só as que têm qty != 0
      const open = positions
        .filter((p: any) => Math.abs(Number(p.positionAmt ?? 0)) > 0)
        .map((p: any) => ({
          symbol: p.symbol,
          position_side: p.positionSide,
          qty: Math.abs(Number(p.positionAmt)),
          entry_price: Number(p.entryPrice ?? 0),
          mark_price: Number(p.markPrice ?? 0),
          unrealized_pnl: Number(p.unrealizedProfit ?? 0),
          leverage: Number(p.leverage ?? 1),
          isolated: p.isolated === true || p.isolated === 'true',
          notional: Math.abs(Number(p.notional ?? 0)),
        }));
      res.json(open);
    } catch (err: any) {
      res.json([]);
    }
  }),
);

// Status da conexão Binance (não devolve chaves) — frontend usa pra
// mostrar "✓ Binance conectada" sem precisar decriptar.
router.get(
  '/binance/status/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const { data, error } = await supabase
      .from('binance_keys')
      .select('id, mode, label, created_at')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({
      connected: (data ?? []).length > 0,
      keys: (data ?? []).map((k) => ({
        id: k.id,
        mode: k.mode,
        label: k.label,
        created_at: k.created_at,
      })),
    });
  }),
);

// ── strategy config (protegido) ────────────────────────────────────────────
router.post(
  '/strategy',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = strategyConfigSchema.parse(req.body);

    // Valida o par contra a Binance ANTES de salvar (evita XRPUSD vs XRPUSDT)
    try {
      const client = await getBinanceClient(body.user_id);
      await client.getSymbolFilters(body.symbol);
    } catch (err: any) {
      if (String(err?.message ?? '').includes('não encontrado')) {
        return res.status(400).json({
          error: 'invalid_symbol',
          message: `O par "${body.symbol}" não existe na Binance Futures. Lembre-se de incluir USDT no final (ex: XRPUSDT, BTCUSDT).`,
        });
      }
      // Outros erros (sem chave Binance, etc.) — deixa salvar mesmo assim
    }

    const cfg = await upsertStrategyConfig(body);
    res.json(cfg);
  }),
);

router.get(
  '/strategy/:user_id/:symbol',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const cfg = await getStrategyConfig(req.params.user_id, req.params.symbol.toUpperCase());
    if (!cfg) return res.status(404).json({ error: 'not found' });
    res.json(cfg);
  }),
);

// Lista TODAS as configs do usuário — frontend usa para popular o seletor de par.
router.get(
  '/strategies/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const list = await listStrategiesForUser(req.params.user_id);
    res.json(list);
  }),
);

// ── bot control ─────────────────────────────────────────────────────────────
async function transitionConfig(req: Request, res: Response, next: 'running' | 'paused' | 'stopped') {
  const body = botActionSchema.parse(req.body);
  const cfg = await getStrategyConfig(body.user_id, body.symbol.toUpperCase());
  if (!cfg) return res.status(404).json({ error: 'config não encontrada' });

  // Bloqueio de tokens só ao INICIAR — pause/stop não dependem de saldo.
  if (next === 'running' && env.TOKENS_PER_CYCLE > 0) {
    const balance = await getTokenBalance(cfg.user_id);
    if (balance < env.TOKENS_PER_CYCLE) {
      return res.status(402).json({
        error: 'insufficient_tokens',
        message:
          'Seus tokens acabaram. Compre mais tokens para continuar utilizando a ferramenta.',
        balance,
        required: env.TOKENS_PER_CYCLE,
      });
    }
  }

  await setConfigStatus(cfg.id, next);
  await botLog({
    level: 'info',
    scope: 'api',
    user_id: cfg.user_id,
    message: `Config ${cfg.symbol} → ${next}`,
  });
  res.json({ ...cfg, status: next });
}

router.post(
  '/bot/start',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah((req, res) => transitionConfig(req, res, 'running')),
);
router.post(
  '/bot/pause',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah((req, res) => transitionConfig(req, res, 'paused')),
);
router.post(
  '/bot/stop',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah((req, res) => transitionConfig(req, res, 'stopped')),
);

// Reset agressivo: cancela TODAS as ordens abertas na Binance pro usuário,
// fecha posições (opcional), marca ciclos como 'closed' e pausa configs.
const resetSchema = z.object({
  user_id: z.string().uuid(),
  symbol: z.string().optional(),
  close_positions: z.boolean().default(false),
});

router.post(
  '/bot/reset',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = resetSchema.parse(req.body);
    const report: any = { canceled: [], closed: [], errors: [] };

    let client;
    try {
      client = await getBinanceClient(body.user_id);
    } catch (err: any) {
      return res.status(400).json({ error: 'no_keys', message: err.message });
    }

    // 1) Cancela ordens abertas (por símbolo se especificado, senão todos)
    try {
      const openOrders = await client.openOrders();
      const symbols = body.symbol
        ? [body.symbol.toUpperCase()]
        : [...new Set(openOrders.map((o: any) => o.symbol))];
      for (const sym of symbols) {
        try {
          await client.cancelAllOpen(sym);
          report.canceled.push(sym);
        } catch (e: any) {
          report.errors.push({ where: 'cancel', sym, err: e.message });
        }
      }
    } catch (e: any) {
      report.errors.push({ where: 'list', err: e.message });
    }

    // 2) Fecha posições se solicitado
    if (body.close_positions) {
      try {
        const positions = await client.positions(body.symbol);
        for (const p of positions) {
          const amt = Number((p as any).positionAmt ?? 0);
          if (amt === 0) continue;
          if (body.symbol && (p as any).symbol !== body.symbol.toUpperCase()) continue;
          const isLong = amt > 0;
          try {
            await client.placeOrder({
              symbol: (p as any).symbol,
              side: isLong ? 'SELL' : 'BUY',
              positionSide: (p as any).positionSide,
              type: 'MARKET',
              quantity: Math.abs(amt),
            });
            report.closed.push({ sym: (p as any).symbol, qty: Math.abs(amt) });
          } catch (e: any) {
            report.errors.push({ where: 'close', sym: (p as any).symbol, err: e.message });
          }
        }
      } catch (e: any) {
        report.errors.push({ where: 'positions', err: e.message });
      }
    }

    // 3) Marca ciclos abertos como closed
    try {
      let q = supabase
        .from('cycles')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('user_id', body.user_id)
        .eq('status', 'open');
      if (body.symbol) q = q.eq('symbol', body.symbol.toUpperCase());
      await q;
    } catch (e: any) {
      report.errors.push({ where: 'cycles', err: e.message });
    }

    // 4) Pausa configs running pra não reabrir tudo no próximo tick
    try {
      let q = supabase
        .from('strategy_configs')
        .update({ status: 'paused' })
        .eq('user_id', body.user_id)
        .eq('status', 'running');
      if (body.symbol) q = q.eq('symbol', body.symbol.toUpperCase());
      await q;
    } catch (e: any) {
      report.errors.push({ where: 'configs', err: e.message });
    }

    await botLog({
      level: 'info',
      scope: 'api',
      user_id: body.user_id,
      message: `Reset solicitado pelo usuário (symbol=${body.symbol ?? 'all'}, close=${body.close_positions})`,
      data: report,
    });

    res.json({ ok: true, report });
  }),
);

// ── status / orders / pnl (protegido) ──────────────────────────────────────
router.get(
  '/status/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const cycles = await listOpenCyclesForUser(req.params.user_id);
    res.json({ open_cycles: cycles });
  }),
);

router.get(
  '/cycles/closed/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const cycles = await listClosedCyclesForUser(req.params.user_id, limit);
    res.json(cycles);
  }),
);

// Ordens abertas — consulta a Binance AO VIVO para descartar ordens
// que já foram canceladas/preenchidas mas ainda não foram sincronizadas no DB.
// Depois cruza com o DB pra trazer cycle_id, role (BASE/SAFETY/TP), etc.
router.get(
  '/orders/open/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const userId = req.params.user_id;

    let liveOrders: any[] = [];
    try {
      const client = await getBinanceClient(userId);
      liveOrders = await client.openOrders();
    } catch {
      // Sem chaves ou erro Binance → cai no fallback DB
      const fallback = await listOpenOrders(userId);
      return res.json(fallback);
    }

    // Pega metadata do DB pra enriquecer cada ordem viva
    const dbOrders = await listOpenOrders(userId);
    const byClientId = new Map(dbOrders.map((o) => [o.client_order_id, o]));

    const merged = liveOrders.map((bo: any) => {
      const db = byClientId.get(bo.clientOrderId);
      if (db) {
        return {
          ...db,
          status: bo.status,
          filled_qty: Number(bo.executedQty ?? 0),
          price: Number(bo.price ?? db.price ?? 0) || db.price,
          stop_price: Number(bo.stopPrice ?? db.stop_price ?? 0) || db.stop_price,
        };
      }
      // Ordem na Binance que não está no DB (manual ou de antes do bot)
      return {
        id: `live-${bo.orderId}`,
        user_id: userId,
        cycle_id: null,
        symbol: bo.symbol,
        side: bo.side,
        position_side: bo.positionSide,
        type: bo.type,
        role: 'MANUAL',
        price: Number(bo.price) || null,
        stop_price: Number(bo.stopPrice) || null,
        qty: Number(bo.origQty),
        filled_qty: Number(bo.executedQty ?? 0),
        avg_fill_price: null,
        status: bo.status,
        binance_order_id: bo.orderId,
        client_order_id: bo.clientOrderId,
        raw: bo,
        created_at: new Date(bo.time).toISOString(),
        updated_at: new Date(bo.updateTime ?? bo.time).toISOString(),
      };
    });

    res.json(merged);
  }),
);

router.get(
  '/orders/history/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const limit = Number(req.query.limit ?? 200);
    const data = await listOrderHistory(req.params.user_id, limit);
    res.json(data);
  }),
);

router.get(
  '/pnl/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const data = await getPerformanceSummary(req.params.user_id);
    res.json(data);
  }),
);

// ── tokens ──────────────────────────────────────────────────────────────────
//
// Regras:
//  - balance e history são read-only por user_id (depois adicionamos auth)
//  - grant é admin-only (no MVP fica aberto, futuro: middleware de admin)
//  - purchase credita tokens direto (no MVP); quando integrar Pix/cartão,
//    o gateway de pagamento confirma antes de chamar grantTokens.

router.get(
  '/tokens/config',
  ah(async (_req, res) => {
    res.json({
      initial_grant: env.INITIAL_TOKEN_GRANT,
      tokens_per_cycle: env.TOKENS_PER_CYCLE,
      low_threshold: env.LOW_TOKENS_THRESHOLD,
    });
  }),
);

router.get(
  '/tokens/balance/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const balance = await getTokenBalance(req.params.user_id);
    res.json({
      user_id: req.params.user_id,
      balance,
      low: balance > 0 && balance <= env.LOW_TOKENS_THRESHOLD,
      empty: balance <= 0,
      tokens_per_cycle: env.TOKENS_PER_CYCLE,
    });
  }),
);

router.get(
  '/tokens/history/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const data = await listTokenTransactions(req.params.user_id, limit);
    res.json(data);
  }),
);

router.get(
  '/tokens/packs',
  ah(async (_req, res) => {
    const packs = await listTokenPacks();
    res.json(packs);
  }),
);

const grantSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().min(1).default('admin_grant'),
});

router.post(
  '/tokens/grant',
  ah(async (req, res) => {
    const body = grantSchema.parse(req.body);
    const result = await grantTokens(body);
    await botLog({
      level: 'info',
      scope: 'tokens',
      user_id: body.user_id,
      message: `Admin grant: +${body.amount} tokens (reason=${body.reason}). Saldo final: ${result.balance_after}`,
    });
    res.json(result);
  }),
);

const purchaseSchema = z.object({
  user_id: z.string().uuid(),
  pack_id: z.string().uuid(),
});

router.post(
  '/tokens/purchase',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = purchaseSchema.parse(req.body);
    // TODO: aqui é onde entra a confirmação de pagamento (Pix/cartão).
    // Hoje é "free purchase" (testes). Quando ligar gateway:
    //   1) cria intent de pagamento
    //   2) usuário paga
    //   3) webhook confirma → chama grantTokens
    const result = await purchasePack(body);
    await botLog({
      level: 'info',
      scope: 'tokens',
      user_id: body.user_id,
      message: `Purchase: pack "${result.pack.name}" (+${result.pack.tokens} tokens). Saldo final: ${result.balance_after}`,
      data: { pack_id: result.pack.id, price_brl: Number(result.pack.price_brl) },
    });
    res.json(result);
  }),
);

// Topup avulso: usuário escolhe qty arbitrária de créditos (1 USD = 1 crédito).
// Hoje credita direto (placeholder); quando ligar gateway, valida antes.
const topupSchema = z.object({
  user_id: z.string().uuid(),
  credits: z.number().int().min(1).max(100000),
  payment_method: z.enum(['stripe', 'binance_pay', 'pix', 'card', 'placeholder']).default('placeholder'),
});

router.post(
  '/tokens/topup',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = topupSchema.parse(req.body);
    const usd = body.credits; // 1:1
    const result = await grantTokens({
      user_id: body.user_id,
      amount: body.credits,
      reason: 'pack_purchase',
      metadata: {
        kind: 'topup',
        usd_amount: usd,
        payment_method: body.payment_method,
      },
    });
    await botLog({
      level: 'info',
      scope: 'tokens',
      user_id: body.user_id,
      message: `Topup: +${body.credits} créditos ($${usd} via ${body.payment_method}). Saldo: ${result.balance_after}`,
      data: { credits: body.credits, usd, payment_method: body.payment_method },
    });
    res.json({
      success: result.success,
      balance_after: result.balance_after,
      credits: body.credits,
      usd,
    });
  }),
);

// ── drawdown protection ────────────────────────────────────────────────────
import {
  getDrawdownState,
  saveDrawdownConfig,
  resetDrawdownTrigger,
} from '../services/supabase/drawdown';

router.get(
  '/drawdown/:user_id',
  requireAuth,
  requireSelf((req) => req.params.user_id),
  ah(async (req, res) => {
    const state = await getDrawdownState(req.params.user_id);
    res.json(state ?? null);
  }),
);

const drawdownSaveSchema = z.object({
  user_id: z.string().uuid(),
  enabled: z.boolean(),
  type: z.enum(['percent', 'fixed']),
  limit_pct: z.number().min(0.1).max(100),
  limit_usd: z.number().min(0.01).max(1_000_000),
});

router.post(
  '/drawdown/save',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = drawdownSaveSchema.parse(req.body);
    let baseline: number | null = null;
    if (body.enabled) {
      // Captura equity Binance atual como baseline.
      try {
        const client = await getBinanceClient(body.user_id);
        const info: any = await client.accountInfo();
        baseline =
          Number(info.totalWalletBalance ?? 0) +
          Number(info.totalUnrealizedProfit ?? 0);
      } catch {
        // sem chaves Binance ainda — baseline fica null, engine vai resolver
        // quando a config rodar.
      }
    }
    await saveDrawdownConfig({ ...body, baseline_usd: baseline });
    await botLog({
      level: 'info',
      scope: 'api',
      user_id: body.user_id,
      message: `Drawdown ${body.enabled ? 'ativado' : 'desativado'} (type=${body.type}, pct=${body.limit_pct}, usd=${body.limit_usd}, baseline=${baseline})`,
    });
    res.json({ ok: true, baseline_usd: baseline });
  }),
);

// Reativa após trigger: limpa flag e atualiza baseline pra equity atual.
router.post(
  '/drawdown/reset',
  requireAuth,
  requireSelf((req) => req.body?.user_id),
  ah(async (req, res) => {
    const body = z.object({ user_id: z.string().uuid() }).parse(req.body);
    let baseline = 0;
    try {
      const client = await getBinanceClient(body.user_id);
      const info: any = await client.accountInfo();
      baseline =
        Number(info.totalWalletBalance ?? 0) + Number(info.totalUnrealizedProfit ?? 0);
    } catch {
      // sem chaves — baseline zero, mas reativa.
    }
    await resetDrawdownTrigger(body.user_id, baseline);
    await botLog({
      level: 'info',
      scope: 'api',
      user_id: body.user_id,
      message: `Drawdown re-armado pelo usuário (novo baseline=${baseline})`,
    });
    res.json({ ok: true, baseline_usd: baseline });
  }),
);

// ── error handler ───────────────────────────────────────────────────────────
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'validation', details: err.errors });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message ?? 'internal error', code: err.code });
});
