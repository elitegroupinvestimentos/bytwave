import { BinanceFuturesClient, OrderParams } from '../services/binance/client';
import { insertOrder, updateOrder } from '../services/supabase/service';
import { roundPrice, roundQty, meetsMinNotional, SymbolFilters } from '../utils/precision';
import type { CycleSide, OrderRole, OrderRow } from '../types';
import { botLog } from '../services/logs/logger';

export interface PlaceParams {
  user_id: string;
  cycle_id: string;
  client: BinanceFuturesClient;
  filters: SymbolFilters;
  symbol: string;
  side: CycleSide;
  role: OrderRole;
  type: OrderParams['type'];
  qty: number;
  price?: number;
  stopPrice?: number;
  closePosition?: boolean;
  clientOrderIdSeed?: string;
}

function genClientOrderId(seed?: string): string {
  const r = Math.random().toString(36).slice(2, 8);
  const t = Date.now().toString(36);
  return `bot_${seed ?? 'x'}_${t}_${r}`.slice(0, 36);
}

/**
 * Coloca uma ordem na Binance e persiste no Supabase. Aplica:
 *  - rounding de qty/price aos filtros do par
 *  - validação de minNotional
 *  - clientOrderId determinístico (idempotência)
 */
export async function placeAndRecordOrder(p: PlaceParams): Promise<OrderRow> {
  const qty = roundQty(p.qty, p.filters);
  if (qty < p.filters.minQty) {
    throw new Error(`qty ${qty} abaixo do minQty ${p.filters.minQty} para ${p.symbol}`);
  }

  const price = p.price !== undefined ? roundPrice(p.price, p.filters) : undefined;
  const stopPrice = p.stopPrice !== undefined ? roundPrice(p.stopPrice, p.filters) : undefined;

  // Para TAKE_PROFIT_MARKET / STOP_MARKET o "preço de referência" é o stopPrice.
  const refPrice = price ?? stopPrice;
  if (refPrice !== undefined && !meetsMinNotional(refPrice, qty, p.filters)) {
    throw new Error(`Notional ${(refPrice * qty).toFixed(2)} < minNotional ${p.filters.minNotional}`);
  }

  const orderSide: 'BUY' | 'SELL' =
    p.role === 'TAKE_PROFIT'
      ? p.side === 'LONG' ? 'SELL' : 'BUY'
      : p.side === 'LONG' ? 'BUY' : 'SELL';

  // Para SAFETY (LIMIT) inverter quando short: SELL para entrar mais alto.
  const adjustedSide: 'BUY' | 'SELL' = (() => {
    if (p.role === 'SAFETY') return p.side === 'LONG' ? 'BUY' : 'SELL';
    return orderSide;
  })();

  const clientOrderId = genClientOrderId(`${p.role}_${p.cycle_id.slice(0, 6)}`);

  const orderParams: OrderParams = {
    symbol: p.symbol,
    side: adjustedSide,
    positionSide: p.side,
    type: p.type,
    quantity: qty,
    price,
    stopPrice,
    timeInForce: p.type === 'LIMIT' ? 'GTC' : undefined,
    newClientOrderId: clientOrderId,
    closePosition: p.closePosition,
    workingType: p.type === 'TAKE_PROFIT_MARKET' ? 'MARK_PRICE' : undefined,
  };

  const resp = await p.client.placeOrder(orderParams);

  const row = await insertOrder({
    user_id: p.user_id,
    cycle_id: p.cycle_id,
    symbol: p.symbol,
    side: adjustedSide,
    position_side: p.side,
    type: p.type,
    role: p.role,
    price: price ?? null,
    stop_price: stopPrice ?? null,
    qty,
    filled_qty: 0,
    avg_fill_price: null,
    status: resp.status ?? 'NEW',
    binance_order_id: resp.orderId ?? null,
    client_order_id: clientOrderId,
    raw: resp,
  });

  await botLog({
    level: 'info',
    scope: 'orderManager',
    user_id: p.user_id,
    cycle_id: p.cycle_id,
    message: `${p.role} ${adjustedSide} ${qty} @ ${price ?? 'mkt'} → ${resp.status}`,
    data: { resp },
  });

  return row;
}

/**
 * Sincroniza uma ordem local com o estado real na Binance.
 */
export async function refreshOrderStatus(
  client: BinanceFuturesClient,
  order: OrderRow,
): Promise<OrderRow> {
  if (!order.binance_order_id) return order;
  try {
    const live = (await client.getOrder(order.symbol, order.binance_order_id)) as any;
    const filled = Number(live.executedQty ?? 0);
    const avg = Number(live.avgPrice ?? 0);
    return await updateOrder(order.id, {
      status: live.status,
      filled_qty: filled,
      avg_fill_price: avg > 0 ? avg : null,
      raw: live,
    });
  } catch (err: any) {
    await botLog({
      level: 'warn',
      scope: 'orderManager',
      user_id: order.user_id,
      cycle_id: order.cycle_id,
      message: `Falha ao consultar ordem ${order.binance_order_id}: ${err.message}`,
    });
    return order;
  }
}
