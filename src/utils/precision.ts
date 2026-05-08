// Helpers para respeitar tickSize/stepSize/minNotional informados pelo exchangeInfo.

export interface SymbolFilters {
  pricePrecision: number;
  quantityPrecision: number;
  tickSize: number;
  stepSize: number;
  minQty: number;
  minNotional: number;
}

function decimalsFromStep(step: number): number {
  if (step >= 1) return 0;
  const s = step.toString();
  if (s.includes('e-')) return Number(s.split('e-')[1]);
  const dot = s.indexOf('.');
  if (dot < 0) return 0;
  return s.length - dot - 1;
}

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  const decimals = decimalsFromStep(step);
  const rounded = Math.floor(value / step) * step;
  return Number(rounded.toFixed(decimals));
}

export function roundPrice(price: number, filters: SymbolFilters): number {
  return roundToStep(price, filters.tickSize);
}

export function roundQty(qty: number, filters: SymbolFilters): number {
  return roundToStep(qty, filters.stepSize);
}

export function meetsMinNotional(price: number, qty: number, filters: SymbolFilters): boolean {
  return price * qty >= filters.minNotional;
}
