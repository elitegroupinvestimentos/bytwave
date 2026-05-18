import { supabase } from './client';

export type PaymentProvider = 'zyropay';

export interface PaymentGatewayConfig {
  provider: PaymentProvider;
  client_id: string;
  client_secret: string;
  webhook_url: string;
  base_url: string;
  enabled: boolean;
  updated_at: string | null;
}

export async function listPaymentGateways(): Promise<PaymentGatewayConfig[]> {
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('provider, client_id, client_secret, webhook_url, base_url, enabled, updated_at')
    .order('provider');
  if (error) throw error;
  return (data ?? []) as PaymentGatewayConfig[];
}

export async function getPaymentGateway(provider: PaymentProvider): Promise<PaymentGatewayConfig | null> {
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('provider, client_id, client_secret, webhook_url, base_url, enabled, updated_at')
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentGatewayConfig) ?? null;
}

export interface SavePaymentGatewayInput {
  provider: PaymentProvider;
  client_id: string;
  client_secret: string;
  webhook_url: string;
  base_url: string;
  enabled: boolean;
}

export async function upsertPaymentGateway(input: SavePaymentGatewayInput) {
  const { error } = await supabase
    .from('payment_gateways')
    .upsert(input, { onConflict: 'provider' });
  if (error) throw error;
}

export async function deletePaymentGateway(provider: PaymentProvider) {
  const { error } = await supabase.from('payment_gateways').delete().eq('provider', provider);
  if (error) throw error;
}
