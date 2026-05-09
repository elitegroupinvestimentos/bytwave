export type RiskMode = 'conservador' | 'agressivo';

export interface ManagementParams {
  leverage: number;
  base_order_usdt: number;
  first_safety_usdt: number;
  max_safety_orders: number;
  initial_distance_pct: number;
  step_scale: number;
  volume_scale: number;
  target_profit_pct: number;
}

export const BO_MIN = 0.2;
export const SO_MIN = 0.4;
export const MIN_BANCA_USDT = 50;

export const RISK_MULTIPLIERS = {
  conservador: {
    bo: 0.004,
    so: 0.008,
    leverage: 10,
    max_safety_orders: 5,
    initial_distance_pct: 0.6,
    step_scale: 1.5,
    volume_scale: 1.8,
    target_profit_pct: 0.6,
  },
  agressivo: {
    bo: 0.008,
    so: 0.016,
    leverage: 12,
    max_safety_orders: 6,
    initial_distance_pct: 0.45,
    step_scale: 1.3,
    volume_scale: 2.0,
    target_profit_pct: 0.8,
  },
} as const;

export interface ValidationResult {
  ok: boolean;
  msg?: string;
}

export function validateBanca(b: number): ValidationResult {
  if (!Number.isFinite(b) || b <= 0) {
    return { ok: false, msg: 'Informe um valor de banca válido.' };
  }
  if (b < MIN_BANCA_USDT) {
    return {
      ok: false,
      msg: `Banca mínima é $${MIN_BANCA_USDT} USDT. O cálculo automático precisa desse mínimo pra gerar entradas viáveis.`,
    };
  }
  return { ok: true };
}

// Check rough Binance minimum: notional = BO * leverage. Most pairs need
// notional >= $5 (USDT-M futures). We warn at $5 since the engine pre-check
// catches the actual per-symbol min and raises -4164 if too small.
export function validateParams(p: ManagementParams): ValidationResult {
  const notional = p.base_order_usdt * p.leverage;
  if (notional < 5) {
    return {
      ok: false,
      msg: 'O valor calculado ficou abaixo do mínimo permitido pela Binance para este par.',
    };
  }
  return { ok: true };
}

const round2 = (n: number) => Number(n.toFixed(2));

export function computeParams(banca: number, mode: RiskMode): ManagementParams {
  const safe = Number.isFinite(banca) && banca > 0 ? banca : 0;
  const m = RISK_MULTIPLIERS[mode];
  return {
    leverage: m.leverage,
    base_order_usdt: Math.max(BO_MIN, round2(safe * m.bo)),
    first_safety_usdt: Math.max(SO_MIN, round2(safe * m.so)),
    max_safety_orders: m.max_safety_orders,
    initial_distance_pct: m.initial_distance_pct,
    step_scale: m.step_scale,
    volume_scale: m.volume_scale,
    target_profit_pct: m.target_profit_pct,
  };
}

export function buildVolumeLadder(firstSO: number, scale: number, n: number): number[] {
  const out: number[] = [];
  let v = firstSO;
  for (let i = 0; i < n; i++) {
    out.push(round2(v));
    v *= scale;
  }
  return out;
}

export function buildStepLadder(initial: number, scale: number, n: number): number[] {
  const out: number[] = [];
  let s = initial;
  for (let i = 0; i < n; i++) {
    out.push(round2(s));
    s *= scale;
  }
  return out;
}
