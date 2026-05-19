import { ApiError } from './client';

const KEY = 'bytwave_admin_pwd';

export function getAdminPassword(): string | null {
  return localStorage.getItem(KEY);
}

export function setAdminPassword(pwd: string) {
  localStorage.setItem(KEY, pwd);
}

export function clearAdminPassword() {
  localStorage.removeItem(KEY);
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const pwd = getAdminPassword() ?? '';
  const API_HOST = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
  const res = await fetch(`${API_HOST}/api/admin${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-admin-password': pwd,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, body);
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────
export interface AdminOverview {
  total_users: number;
  total_cycles: number;
  open_cycles: number;
  closed_cycles: number;
  realized_pnl_usdt: number;
  total_tokens_in_circulation: number;
  total_tokens_purchased: number;
  total_tokens_consumed: number;
  active_packs: number;
  last_balance_snapshot: { total_balance: number } | null;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  token_balance: number;
  created_at: string;
  updated_at: string;
  cycles: { open: number; closed: number; total: number };
}

export interface AdminUserDetail {
  user: any;
  binance_keys: any[];
  strategy_configs: any[];
  recent_cycles: any[];
  recent_token_transactions: any[];
}

export interface AdminPack {
  id: string;
  name: string;
  tokens: number;
  price_brl: number | string;
  active: boolean;
  highlight: boolean;
  created_at: string;
}

export const admin = {
  login: (password: string) => {
    const API_HOST = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
    return fetch(`${API_HOST}/api/admin/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-password': password },
    }).then(async (r) => {
      if (!r.ok) throw new ApiError(r.status, await r.json().catch(() => ({})));
      return r.json();
    });
  },

  overview: () => http<AdminOverview>('/overview'),
  users: (search?: string) =>
    http<AdminUserRow[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  user: (id: string) => http<AdminUserDetail>(`/users/${id}`),
  grant: (id: string, body: { amount: number; reason?: string; note?: string }) =>
    http<{ success: boolean; balance_after: number }>(`/users/${id}/grant`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  setOverrides: (
    id: string,
    body: {
      balance_factor?: number | null;
      realized_factor?: number | null;
      today_pnl_factor?: number | null;
    },
  ) =>
    http<{ ok: true; marketing_overrides: Record<string, number> | null }>(
      `/users/${id}/overrides`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),

  cycles: (status?: 'open' | 'closed' | 'error') =>
    http<any[]>(`/cycles${status ? `?status=${status}` : ''}`),
  transactions: (opts?: { reason?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.reason) qs.set('reason', opts.reason);
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const q = qs.toString();
    return http<any[]>(`/transactions${q ? `?${q}` : ''}`);
  },
  strategies: () => http<any[]>('/strategies'),

  packs: () => http<AdminPack[]>('/packs'),
  packCreate: (body: Omit<AdminPack, 'id' | 'created_at'>) =>
    http<AdminPack>('/packs', { method: 'POST', body: JSON.stringify(body) }),
  packUpdate: (id: string, body: Partial<Omit<AdminPack, 'id' | 'created_at'>>) =>
    http<AdminPack>(`/packs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  packDelete: (id: string) => http<{ ok: true }>(`/packs/${id}`, { method: 'DELETE' }),

  logs: (opts?: { level?: 'debug' | 'info' | 'warn' | 'error'; limit?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.level) qs.set('level', opts.level);
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const q = qs.toString();
    return http<any[]>(`/logs${q ? `?${q}` : ''}`);
  },

  wipe: () =>
    http<{ ok: true; report: any }>('/wipe', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'YES_WIPE_EVERYTHING' }),
    }),

  // ── Integrações OAuth ────────────────────────────────────────────
  integrations: () =>
    http<
      Array<{
        provider: 'google' | 'facebook';
        client_id: string;
        client_secret: string; // mascarado: ••••XXXX
        redirect_uri: string;
        enabled: boolean;
        configured: boolean;
        updated_at: string | null;
      }>
    >('/integrations'),
  integrationSave: (body: {
    provider: 'google' | 'facebook';
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    enabled: boolean;
  }) =>
    http<{ ok: true }>('/integrations', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  integrationDelete: (provider: 'google' | 'facebook') =>
    http<{ ok: true }>(`/integrations/${provider}`, { method: 'DELETE' }),

  // ── Payment gateways (PIX etc.) ──────────────────────────────────
  paymentGateways: () =>
    http<
      Array<{
        provider: 'zyropay';
        client_id: string;
        client_secret: string;
        webhook_url: string;
        base_url: string;
        enabled: boolean;
        configured: boolean;
        updated_at: string | null;
      }>
    >('/payment-gateways'),
  paymentGatewaySave: (body: {
    provider: 'zyropay';
    client_id: string;
    client_secret: string;
    webhook_url?: string;
    base_url?: string;
    enabled: boolean;
  }) =>
    http<{ ok: true }>('/payment-gateways', {
      method: 'PUT',
      body: JSON.stringify({
        webhook_url: '',
        base_url: '',
        ...body,
      }),
    }),
  paymentGatewayDelete: (provider: 'zyropay') =>
    http<{ ok: true }>(`/payment-gateways/${provider}`, { method: 'DELETE' }),

  // ── Payments (PIX intents) ────────────────────────────────────────
  payments: (opts?: { status?: string; search?: string; start?: string; end?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.status) qs.set('status', opts.status);
    if (opts?.search) qs.set('search', opts.search);
    if (opts?.start) qs.set('start', opts.start);
    if (opts?.end) qs.set('end', opts.end);
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const q = qs.toString();
    return http<
      Array<{
        id: string;
        user_id: string;
        user_email: string | null;
        user_name: string | null;
        provider: string;
        payment_id: string;
        mov_id: string | null;
        external_id: string | null;
        credits: number;
        usd_amount: number;
        status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
        confirmed_at: string | null;
        created_at: string;
      }>
    >(`/payments${q ? `?${q}` : ''}`);
  },
  paymentsStats: () =>
    http<{
      today: { count: number; usd: number; credits: number };
      last_7d: { count: number; usd: number; credits: number };
      month: { count: number; usd: number; credits: number };
      pending: { count: number; usd: number; credits: number };
      failed_month: { count: number; usd: number; credits: number };
    }>('/payments/stats'),
  paymentMark: (id: string, body: { status: string; note?: string }) =>
    http<{ ok: true }>(`/payments/${id}/mark`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
