import { supabase } from './client';
import { encrypt, decrypt } from '../../utils/crypto';
import { env } from '../../config/env';
import type {
  BinanceKeyRow,
  CycleRow,
  CycleSide,
  Mode,
  OrderRow,
  StrategyConfig,
  User,
} from '../../types';

// ── Users ─────────────────────────────────────────────────────────────────────
export async function createUser(input: {
  email: string;
  name?: string;
  password_hash?: string;
}): Promise<User> {
  const initial = env.INITIAL_TOKEN_GRANT;
  const email = input.email.toLowerCase().trim();

  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      name: input.name ?? null,
      password_hash: input.password_hash ?? null,
      token_balance: initial,
    })
    .select('*')
    .single();
  if (error) throw error;

  if (initial > 0) {
    try {
      await supabase.from('token_transactions').insert({
        user_id: data.id,
        delta: initial,
        reason: 'signup_grant',
        balance_before: 0,
        balance_after: initial,
        metadata: { source: 'createUser', initial_grant: true },
      });
    } catch {
      // Audit-log é best-effort; saldo já foi gravado direto no users.token_balance.
    }
  }

  return data as User;
}

export async function getUser(id: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as User) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  if (error) throw error;
  return (data as User) ?? null;
}

// ── Binance keys ──────────────────────────────────────────────────────────────
export async function saveBinanceKeys(input: {
  user_id: string;
  mode: Mode;
  api_key: string;
  api_secret: string;
  label?: string;
}) {
  const row = {
    user_id: input.user_id,
    mode: input.mode,
    api_key_enc: encrypt(input.api_key),
    api_secret_enc: encrypt(input.api_secret),
    label: input.label ?? null,
  };

  // upsert por (user_id, mode)
  const { data, error } = await supabase
    .from('binance_keys')
    .upsert(row, { onConflict: 'user_id,mode' })
    .select('id, user_id, mode, label, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function getDecryptedKeys(user_id: string, mode: Mode) {
  const { data, error } = await supabase
    .from('binance_keys')
    .select('*')
    .eq('user_id', user_id)
    .eq('mode', mode)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as BinanceKeyRow;
  return {
    apiKey: decrypt(row.api_key_enc),
    apiSecret: decrypt(row.api_secret_enc),
  };
}

// Pega QUALQUER chave do user (a mais recente), independente do mode.
// Útil pra factory que não conhece o mode preferido — escolhe o que o
// próprio usuário cadastrou por último.
export async function getAnyKeysForUser(user_id: string) {
  const { data, error } = await supabase
    .from('binance_keys')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as BinanceKeyRow;
  return {
    mode: row.mode as Mode,
    apiKey: decrypt(row.api_key_enc),
    apiSecret: decrypt(row.api_secret_enc),
  };
}

// ── Strategy config ───────────────────────────────────────────────────────────
export async function upsertStrategyConfig(cfg: Omit<StrategyConfig, 'id' | 'status' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('strategy_configs')
    .upsert(cfg, { onConflict: 'user_id,symbol' })
    .select('*')
    .single();
  if (error) throw error;
  return data as StrategyConfig;
}

export async function getStrategyConfig(user_id: string, symbol: string) {
  const { data, error } = await supabase
    .from('strategy_configs')
    .select('*')
    .eq('user_id', user_id)
    .eq('symbol', symbol)
    .maybeSingle();
  if (error) throw error;
  return (data as StrategyConfig) ?? null;
}

export async function listStrategiesForUser(user_id: string) {
  const { data, error } = await supabase
    .from('strategy_configs')
    .select('*')
    .eq('user_id', user_id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StrategyConfig[];
}

export async function setConfigStatus(id: string, status: 'running' | 'paused' | 'stopped') {
  const { error } = await supabase.from('strategy_configs').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function listRunningConfigs(): Promise<StrategyConfig[]> {
  const { data, error } = await supabase
    .from('strategy_configs')
    .select('*')
    .eq('status', 'running');
  if (error) throw error;
  return (data ?? []) as StrategyConfig[];
}

/**
 * Configs que precisam ser processadas pelo worker:
 *  - todas com status='running' (abre ciclos novos + processa abertos)
 *  - todas que têm ciclo aberto, MESMO pausadas/paradas — pra reconciliar
 *    com a Binance (se usuário fechou manual, marcar como closed).
 */
export async function listConfigsToProcess(): Promise<StrategyConfig[]> {
  const [{ data: running, error: e1 }, { data: openCycles, error: e2 }] = await Promise.all([
    supabase.from('strategy_configs').select('*').eq('status', 'running'),
    supabase.from('cycles').select('config_id').eq('status', 'open'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const ids = new Set<string>([
    ...((running ?? []) as any[]).map((c) => c.id),
    ...((openCycles ?? []) as any[]).map((c) => c.config_id),
  ]);
  if (ids.size === 0) return [];

  const { data: all, error: e3 } = await supabase
    .from('strategy_configs')
    .select('*')
    .in('id', Array.from(ids));
  if (e3) throw e3;
  return (all ?? []) as StrategyConfig[];
}

// ── Cycles ────────────────────────────────────────────────────────────────────
export async function getOpenCycle(user_id: string, symbol: string, side: CycleSide) {
  // limit(1) + order pra ser robusto caso haja duplicata histórica
  // (pega o mais recente em vez de quebrar com erro de "multiple rows").
  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('user_id', user_id)
    .eq('symbol', symbol)
    .eq('side', side)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as CycleRow) ?? null;
}

export async function createCycle(input: Pick<CycleRow, 'user_id' | 'config_id' | 'symbol' | 'side'>) {
  const { data, error } = await supabase.from('cycles').insert(input).select('*').single();
  if (error) throw error;
  return data as CycleRow;
}

export async function updateCycle(id: string, patch: Partial<CycleRow>) {
  const { data, error } = await supabase
    .from('cycles')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as CycleRow;
}

export async function listOpenCyclesForUser(user_id: string) {
  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('user_id', user_id)
    .eq('status', 'open');
  if (error) throw error;
  return (data ?? []) as CycleRow[];
}

export async function listClosedCyclesForUser(
  user_id: string,
  limit = 50,
  start?: string,
  end?: string,
) {
  let q = supabase
    .from('cycles')
    .select('*')
    .eq('user_id', user_id)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(limit);
  if (start) q = q.gte('closed_at', start);
  if (end) q = q.lte('closed_at', end);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CycleRow[];
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function insertOrder(row: Omit<OrderRow, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('orders').insert(row).select('*').single();
  if (error) throw error;
  return data as OrderRow;
}

export async function updateOrder(id: string, patch: Partial<OrderRow>) {
  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as OrderRow;
}

export async function listOrdersByCycle(cycle_id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('cycle_id', cycle_id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

export async function listOpenOrders(user_id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user_id)
    .in('status', ['NEW', 'PARTIALLY_FILLED']);
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

export async function listOrderHistory(user_id: string, limit = 200) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

// ── Snapshots de saldo/performance ────────────────────────────────────────────
export async function insertAccountSnapshot(row: {
  user_id: string;
  total_balance: number;
  available: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
  exposure_usdt?: number;
  raw?: unknown;
}) {
  const { error } = await supabase.from('account_snapshots').insert({
    unrealized_pnl: 0,
    realized_pnl: 0,
    exposure_usdt: 0,
    ...row,
  });
  if (error) throw error;
}

export async function getPerformanceSummary(user_id: string) {
  const [{ data: orders, error: e1 }, { data: snap, error: e2 }] = await Promise.all([
    supabase
      .from('orders')
      .select('role, side, position_side, filled_qty, avg_fill_price, status')
      .eq('user_id', user_id)
      .eq('status', 'FILLED'),
    supabase
      .from('account_snapshots')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const { data: cycles, error: e3 } = await supabase
    .from('cycles')
    .select('realized_pnl_usdt, status')
    .eq('user_id', user_id);
  if (e3) throw e3;

  const realized = (cycles ?? []).reduce((acc, c: any) => acc + Number(c.realized_pnl_usdt || 0), 0);
  return {
    realized_pnl_total: realized,
    last_snapshot: snap ?? null,
    filled_orders_count: orders?.length ?? 0,
  };
}
