// Endpoints da Binance Futures (USDT-M).
export const BINANCE_ENDPOINTS = {
  testnet: {
    rest: 'https://testnet.binancefuture.com',
    ws: 'wss://stream.binancefuture.com',
  },
  production: {
    rest: 'https://fapi.binance.com',
    ws: 'wss://fstream.binance.com',
  },
} as const;

// Defaults da estratégia (sobrescritos pelo strategy_configs do usuário).
export const STRATEGY_DEFAULTS = {
  leverage: 12,
  initialDistancePct: 0.6,
  stepScale: 1.5,
  volumeScale: 1.8,
  targetProfitPct: 0.6,
  maxSafetyOrders: 5,
} as const;

// Presets de capital sugeridos (apenas referência — não são aplicados automaticamente).
export const CAPITAL_PRESETS = [
  { capital: 1000,  baseOrder: 4,  firstSafety: 8,  maxSO: 5 },
  { capital: 5000,  baseOrder: 20, firstSafety: 40, maxSO: 5 },
] as const;
