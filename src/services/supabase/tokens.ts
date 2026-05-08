import { supabase } from './client';

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
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
  price_brl: number;
  active: boolean;
  highlight: boolean;
  created_at: string;
}

export type ConsumeReason =
  | 'cycle_open'
  | 'order_placed'
  | 'tick'
  | 'manual'
  | 'admin_debit';

export type GrantReason =
  | 'signup_grant'
  | 'pack_purchase'
  | 'admin_grant'
  | 'refund';

// ─────────────────────────────────────────────
// Saldo
// ─────────────────────────────────────────────
export async function getTokenBalance(user_id: string): Promise<number> {
  const { data, error } = await supabase
    .from('users')
    .select('token_balance')
    .eq('id', user_id)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.token_balance ?? 0);
}

// ─────────────────────────────────────────────
// Consumo (atômico via RPC + lock no banco)
// ─────────────────────────────────────────────
export interface ConsumeInput {
  user_id: string;
  amount: number;
  reason: ConsumeReason | string;
  cycle_id?: string | null;
  order_id?: string | null;
  metadata?: unknown;
}

export interface ConsumeResult {
  success: boolean;
  balance_after: number;
  message: string;
}

export async function consumeTokens(input: ConsumeInput): Promise<ConsumeResult> {
  const { data, error } = await supabase.rpc('consume_tokens', {
    p_user_id: input.user_id,
    p_amount: input.amount,
    p_reason: input.reason,
    p_cycle_id: input.cycle_id ?? null,
    p_order_id: input.order_id ?? null,
    p_metadata: input.metadata ?? null,
  });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return {
    success: Boolean(row?.success),
    balance_after: Number(row?.balance_after ?? 0),
    message: String(row?.message ?? 'unknown'),
  };
}

// ─────────────────────────────────────────────
// Grant (crédito)
// ─────────────────────────────────────────────
export interface GrantInput {
  user_id: string;
  amount: number;
  reason: GrantReason | string;
  metadata?: unknown;
}

export async function grantTokens(input: GrantInput): Promise<{ success: boolean; balance_after: number }> {
  const { data, error } = await supabase.rpc('grant_tokens', {
    p_user_id: input.user_id,
    p_amount: input.amount,
    p_reason: input.reason,
    p_metadata: input.metadata ?? null,
  });
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return {
    success: Boolean(row?.success),
    balance_after: Number(row?.balance_after ?? 0),
  };
}

// ─────────────────────────────────────────────
// Histórico
// ─────────────────────────────────────────────
export async function listTokenTransactions(user_id: string, limit = 50): Promise<TokenTransaction[]> {
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TokenTransaction[];
}

// ─────────────────────────────────────────────
// Packs (catálogo)
// ─────────────────────────────────────────────
export async function listTokenPacks(): Promise<TokenPack[]> {
  const { data, error } = await supabase
    .from('token_packs')
    .select('*')
    .eq('active', true)
    .order('tokens', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TokenPack[];
}

// Compra um pack — por enquanto credita direto.
// Quando integrar Pix/cartão, primeiro confirma pagamento, depois chama grantTokens.
export async function purchasePack(input: {
  user_id: string;
  pack_id: string;
}): Promise<{ success: boolean; balance_after: number; pack: TokenPack }> {
  const { data: pack, error: pErr } = await supabase
    .from('token_packs')
    .select('*')
    .eq('id', input.pack_id)
    .eq('active', true)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!pack) throw new Error('pack not found or inactive');

  const result = await grantTokens({
    user_id: input.user_id,
    amount: pack.tokens,
    reason: 'pack_purchase',
    metadata: { pack_id: pack.id, pack_name: pack.name, price_brl: Number(pack.price_brl) },
  });
  return { success: result.success, balance_after: result.balance_after, pack: pack as TokenPack };
}
