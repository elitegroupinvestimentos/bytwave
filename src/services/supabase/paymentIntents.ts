import { supabase } from './client';

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';

export interface PaymentIntent {
  id: string;
  user_id: string;
  provider: string;
  payment_id: string;
  mov_id: string | null;
  external_id: string | null;
  pix_code: string | null;
  credits: number;
  usd_amount: number;
  status: PaymentStatus;
  confirmed_at: string | null;
  raw_callback: unknown;
  created_at: string;
  updated_at: string;
}

export async function createPaymentIntent(input: {
  user_id: string;
  provider: string;
  payment_id: string;
  mov_id?: string | null;
  external_id?: string | null;
  pix_code?: string | null;
  credits: number;
  usd_amount: number;
}): Promise<PaymentIntent> {
  const { data, error } = await supabase
    .from('payment_intents')
    .insert({ ...input, status: 'PENDING' })
    .select('*')
    .single();
  if (error) throw error;
  return data as PaymentIntent;
}

export async function getPaymentIntentByPaymentId(payment_id: string): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('payment_id', payment_id)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentIntent) ?? null;
}

export async function getPaymentIntent(id: string): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from('payment_intents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentIntent) ?? null;
}

export async function markPaymentConfirmed(
  payment_id: string,
  raw: unknown,
): Promise<PaymentIntent | null> {
  const { data, error } = await supabase
    .from('payment_intents')
    .update({
      status: 'CONFIRMED',
      confirmed_at: new Date().toISOString(),
      raw_callback: raw,
    })
    .eq('payment_id', payment_id)
    .eq('status', 'PENDING') // só transita se ainda tava pending (idempotente)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentIntent) ?? null;
}
