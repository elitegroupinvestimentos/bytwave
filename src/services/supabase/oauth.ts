import { supabase } from './client';

export type OAuthProvider = 'google' | 'facebook';

export interface OAuthConfig {
  provider: OAuthProvider;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  enabled: boolean;
  updated_at: string | null;
}

export async function listOAuthProviders(): Promise<OAuthConfig[]> {
  const { data, error } = await supabase
    .from('oauth_providers')
    .select('provider, client_id, client_secret, redirect_uri, enabled, updated_at')
    .order('provider');
  if (error) throw error;
  return (data ?? []) as OAuthConfig[];
}

export async function getOAuthProvider(provider: OAuthProvider): Promise<OAuthConfig | null> {
  const { data, error } = await supabase
    .from('oauth_providers')
    .select('provider, client_id, client_secret, redirect_uri, enabled, updated_at')
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return (data as OAuthConfig) ?? null;
}

export interface SaveOAuthInput {
  provider: OAuthProvider;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  enabled: boolean;
}

export async function upsertOAuthProvider(input: SaveOAuthInput) {
  const { error } = await supabase
    .from('oauth_providers')
    .upsert(input, { onConflict: 'provider' });
  if (error) throw error;
}

export async function deleteOAuthProvider(provider: OAuthProvider) {
  const { error } = await supabase.from('oauth_providers').delete().eq('provider', provider);
  if (error) throw error;
}
