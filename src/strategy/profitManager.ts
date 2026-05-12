import type { CycleSide, StrategyConfig } from '../types';

/**
 * Preço alvo de take-profit a partir do preço médio.
 *  - target_profit_pct é o % de LUCRO sobre a MARGEM (PnL % alavancado),
 *    igual ao que aparece na Binance.
 *  - Movimento de preço necessário = target / leverage.
 *  - LONG: acima do avg. SHORT: abaixo do avg.
 */
export function takeProfitPrice(cfg: StrategyConfig, avgPrice: number, side: CycleSide): number {
  const dir = side === 'LONG' ? 1 : -1;
  const lev = cfg.leverage > 0 ? cfg.leverage : 1;
  const priceMovePct = cfg.target_profit_pct / lev;
  return avgPrice * (1 + (dir * priceMovePct) / 100);
}

/**
 * Em hedge mode + closePosition=true, o lado oposto ao positionSide encerra a posição:
 *  - LONG → SELL
 *  - SHORT → BUY
 */
export function closingSide(side: CycleSide): 'BUY' | 'SELL' {
  return side === 'LONG' ? 'SELL' : 'BUY';
}

export function entrySide(side: CycleSide): 'BUY' | 'SELL' {
  return side === 'LONG' ? 'BUY' : 'SELL';
}
