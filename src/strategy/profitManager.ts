import type { CycleSide, StrategyConfig } from '../types';

/**
 * Preço alvo de take-profit a partir do preço médio.
 *  - LONG: acima do avg
 *  - SHORT: abaixo do avg
 */
export function takeProfitPrice(cfg: StrategyConfig, avgPrice: number, side: CycleSide): number {
  const dir = side === 'LONG' ? 1 : -1;
  return avgPrice * (1 + (dir * cfg.target_profit_pct) / 100);
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
