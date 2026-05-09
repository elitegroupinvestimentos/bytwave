// Calculadora automática dos parâmetros da estratégia Hedge Cycle.
//
// Usuário informa apenas:
//   - banca em USDT
//   - modo de risco (conservador | agressivo)
//
// Sistema calcula tudo o resto proporcional à banca, com arredondamento
// para 2 casas e mínimos de segurança (BO 0.2 / SO 0.4 USDT).

export type RiskMode = 'conservador' | 'agressivo';

export interface CalculatedStrategy {
  leverage: number;
  base_order_usdt: number;
  first_safety_usdt: number;
  max_safety_orders: number;
  initial_distance_pct: number;
  step_scale: number;
  volume_scale: number;
  target_profit_pct: number;
}

interface ModePreset {
  leverage: number;
  /** Percentual da banca destinado ao Base Order (0.003 = 0.3%) */
  boRatio: number;
  /** Percentual da banca destinado à 1ª Safety Order */
  soRatio: number;
  max_safety_orders: number;
  initial_distance_pct: number;
  step_scale: number;
  volume_scale: number;
  target_profit_pct: number;
}

export const RISK_MODES: Record<RiskMode, ModePreset> = {
  conservador: {
    leverage: 10,
    boRatio: 0.003,
    soRatio: 0.006,
    max_safety_orders: 6,
    initial_distance_pct: 0.8,
    step_scale: 1.6,
    volume_scale: 1.5,
    target_profit_pct: 0.5,
  },
  agressivo: {
    leverage: 12,
    boRatio: 0.004,
    soRatio: 0.008,
    max_safety_orders: 5,
    initial_distance_pct: 0.6,
    step_scale: 1.5,
    volume_scale: 1.8,
    target_profit_pct: 0.6,
  },
};

export const MIN_BO_USDT = 0.2;
export const MIN_SO_USDT = 0.4;

/** Arredonda para 2 casas decimais (0.387 → 0.39). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateStrategy(bank: number, mode: RiskMode): CalculatedStrategy {
  const preset = RISK_MODES[mode];
  const bo = Math.max(round2(bank * preset.boRatio), MIN_BO_USDT);
  const so = Math.max(round2(bank * preset.soRatio), MIN_SO_USDT);

  return {
    leverage: preset.leverage,
    base_order_usdt: bo,
    first_safety_usdt: so,
    max_safety_orders: preset.max_safety_orders,
    initial_distance_pct: preset.initial_distance_pct,
    step_scale: preset.step_scale,
    volume_scale: preset.volume_scale,
    target_profit_pct: preset.target_profit_pct,
  };
}

/** Validações para a banca informada pelo usuário. */
export function validateBank(value: number): string | null {
  if (!Number.isFinite(value)) return 'Informe um número válido.';
  if (value <= 0) return 'A banca precisa ser maior que zero.';
  if (value < 50) return 'Banca mínima recomendada: 50 USDT.';
  if (value > 10_000_000) return 'Valor muito alto, confira.';
  return null;
}
