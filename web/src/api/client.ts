// Cliente HTTP simples para o backend Bytwave.
// - Dev: VITE_API_URL vazio → usa "/api" e o Vite proxia para localhost:3777
// - Prod: VITE_API_URL=https://bytwave-api.up.railway.app → URL completa

const API_HOST = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const BASE = `${API_HOST}/api`;

// Erro tipado para casos onde precisamos olhar o status (ex: 402 sem tokens).
export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body?.message === 'string' ? body.message : `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (session?.token) {
    headers.authorization = `Bearer ${session.token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    // 401 → JWT inválido/expirado: limpa sessão e redireciona pra login.
    if (res.status === 401 && session) {
      clearSession();
      // Se a página é protegida, /login será o destino na próxima render.
      if (typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => http<{ ok: true; mode: string }>('/health'),
  status: (userId: string) => http<{ open_cycles: any[] }>(`/status/${userId}`),
  openOrders: (userId: string) => http<any[]>(`/orders/open/${userId}`),
  history: (userId: string, limit = 200) =>
    http<any[]>(`/orders/history/${userId}?limit=${limit}`),
  pnl: (userId: string) =>
    http<{
      realized_pnl_total: number;
      filled_orders_count: number;
      last_snapshot: {
        total_balance: number;
        available: number;
        unrealized_pnl: number;
        realized_pnl: number;
        exposure_usdt: number;
      } | null;
    }>(`/pnl/${userId}`),
  testBinance: (userId: string) =>
    http<{ ok: true; mode: string; total: number; available: number }>(
      `/binance/test/${userId}`,
    ),
  binanceStatus: (userId: string) =>
    http<{
      connected: boolean;
      keys: { id: string; mode: 'testnet' | 'production'; label: string | null; created_at: string }[];
    }>(`/binance/status/${userId}`),

  getStrategy: (userId: string, symbol: string) =>
    http<{
      id: string;
      symbol: string;
      status: 'running' | 'paused' | 'stopped';
      capital_usdt: number;
      leverage: number;
      base_order_usdt: number;
      first_safety_usdt: number;
      max_safety_orders: number;
      target_profit_pct: number;
    }>(`/strategy/${userId}/${symbol.toUpperCase()}`),

  listStrategies: (userId: string) =>
    http<
      Array<{
        id: string;
        symbol: string;
        status: 'running' | 'paused' | 'stopped';
        capital_usdt: number;
        updated_at: string;
      }>
    >(`/strategies/${userId}`),

  saveStrategy: (input: {
    user_id: string;
    symbol: string;
    capital_usdt: number;
    leverage: number;
    base_order_usdt: number;
    first_safety_usdt: number;
    max_safety_orders: number;
    initial_distance_pct: number;
    step_scale: number;
    volume_scale: number;
    target_profit_pct: number;
  }) =>
    http<any>('/strategy', { method: 'POST', body: JSON.stringify(input) }),

  // ── auth (com senha + JWT) ─────────────────────────────────────────────
  authRegister: (input: { email: string; name?: string; password: string }) =>
    http<{
      token: string;
      user: { id: string; email: string; name: string | null; token_balance: number };
    }>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
  authLogin: (input: { email: string; password: string }) =>
    http<{
      token: string;
      user: { id: string; email: string; name: string | null; token_balance: number };
    }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  authMe: () =>
    http<{ id: string; email: string; name: string | null; token_balance: number }>('/auth/me'),
  saveBinanceKeys: (input: {
    user_id: string;
    mode: 'testnet' | 'production';
    api_key: string;
    api_secret: string;
    label?: string;
  }) =>
    http<any>('/binance/keys', { method: 'POST', body: JSON.stringify(input) }),

  // ── tokens ─────────────────────────────────────────────────────────────
  tokensConfig: () =>
    http<{ initial_grant: number; tokens_per_cycle: number; low_threshold: number }>(
      '/tokens/config',
    ),
  tokensBalance: (userId: string) =>
    http<{
      user_id: string;
      balance: number;
      low: boolean;
      empty: boolean;
      tokens_per_cycle: number;
    }>(`/tokens/balance/${userId}`),
  tokensHistory: (userId: string, limit = 50) =>
    http<TokenTransaction[]>(`/tokens/history/${userId}?limit=${limit}`),
  tokensPacks: () => http<TokenPack[]>('/tokens/packs'),
  tokensGrant: (input: { user_id: string; amount: number; reason?: string }) =>
    http<{ success: boolean; balance_after: number }>('/tokens/grant', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  tokensPurchase: (input: { user_id: string; pack_id: string }) =>
    http<{ success: boolean; balance_after: number; pack: TokenPack }>(
      '/tokens/purchase',
      { method: 'POST', body: JSON.stringify(input) },
    ),

  // ── bot control ────────────────────────────────────────────────────────
  botStart: (input: { user_id: string; symbol: string }) =>
    http<any>('/bot/start', { method: 'POST', body: JSON.stringify(input) }),
  botPause: (input: { user_id: string; symbol: string }) =>
    http<any>('/bot/pause', { method: 'POST', body: JSON.stringify(input) }),
  botStop: (input: { user_id: string; symbol: string }) =>
    http<any>('/bot/stop', { method: 'POST', body: JSON.stringify(input) }),
  botReset: (input: { user_id: string; symbol?: string; close_positions?: boolean }) =>
    http<{ ok: boolean; report: { canceled: string[]; closed: any[]; errors: any[] } }>(
      '/bot/reset',
      { method: 'POST', body: JSON.stringify(input) },
    ),
};

export interface TokenTransaction {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  cycle_id: string | null;
  order_id: string | null;
  balance_before: number;
  balance_after: number;
  metadata: unknown;
  created_at: string;
}

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price_brl: number | string;
  active: boolean;
  highlight: boolean;
}

// Klines públicos da Binance (sem auth) para o gráfico de preço.
export type Kline = { time: number; open: number; high: number; low: number; close: number };

export async function fetchKlines(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d',
  limit = 24,
  mode: 'testnet' | 'production' = 'production',
): Promise<Kline[]> {
  const base =
    mode === 'testnet'
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
  const url = `${base}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`klines ${res.status}`);
  const arr: any[] = await res.json();
  return arr.map((k) => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Sessão local (sem JWT ainda) — armazena user_id no localStorage
// ─────────────────────────────────────────────────────────────────────
const SESSION_KEY = 'bytwave_session';

export interface Session {
  user_id: string;
  email: string;
  name: string | null;
  token: string;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Compat: páginas antigas ainda importam CURRENT_USER_ID — devolve do session.
// Quando todas migrarem pro useSession(), removemos.
export const CURRENT_USER_ID = getSession()?.user_id ?? '';
