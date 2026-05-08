import type { StrategyConfig, CycleSide } from '../types';

export interface SafetyOrderPlan {
  index: number;            // 1..N
  distancePct: number;       // distância acumulada % do preço de entrada
  price: number;             // preço calculado
  volumeUsdt: number;        // notional em USDT
  qty: number;               // qty antes de arredondar
}

/**
 * Calcula a "escada" de Safety Orders.
 *
 * - Distância (em %) da SO_n em relação ao preço base é a soma de:
 *      initial_distance_pct * stepScale^0 + initial_distance_pct * stepScale^1 + ...
 * - Volume (em USDT) da SO_n: first_safety_usdt * volumeScale^(n-1)
 * - Para LONG, preço da SO fica abaixo do entry. Para SHORT, acima.
 */
export function buildSafetyLadder(
  cfg: StrategyConfig,
  entryPrice: number,
  side: CycleSide,
): SafetyOrderPlan[] {
  const ladder: SafetyOrderPlan[] = [];
  let cumulativePct = 0;
  let stepPct = cfg.initial_distance_pct;
  let soVolume = cfg.first_safety_usdt;

  for (let i = 1; i <= cfg.max_safety_orders; i++) {
    cumulativePct += stepPct;
    const directional = side === 'LONG' ? -cumulativePct : cumulativePct;
    const price = entryPrice * (1 + directional / 100);
    const qty = soVolume / price;

    ladder.push({
      index: i,
      distancePct: cumulativePct,
      price,
      volumeUsdt: soVolume,
      qty,
    });

    stepPct = stepPct * cfg.step_scale;
    soVolume = soVolume * cfg.volume_scale;
  }
  return ladder;
}

/**
 * Calcula o preço médio ponderado entre BASE + SOs preenchidas.
 */
export function weightedAveragePrice(
  fills: Array<{ price: number; qty: number }>,
): { avg: number; totalQty: number; invested: number } {
  let totalQty = 0;
  let invested = 0;
  for (const f of fills) {
    totalQty += f.qty;
    invested += f.qty * f.price;
  }
  const avg = totalQty > 0 ? invested / totalQty : 0;
  return { avg, totalQty, invested };
}
