import { BinanceFuturesClient } from './client';
import { getAnyKeysForUser } from '../supabase/service';

// Cache simples por usuário (evita decriptar a cada loop).
const cache = new Map<string, BinanceFuturesClient>();

// Pega o modo (testnet/production) do que o próprio usuário cadastrou,
// não da env do backend. Assim cada user pode escolher o modo dele.
export async function getBinanceClient(user_id: string): Promise<BinanceFuturesClient> {
  const cached = cache.get(user_id);
  if (cached) return cached;

  const creds = await getAnyKeysForUser(user_id);
  if (!creds) {
    throw new Error(`API keys da Binance não cadastradas para o usuário ${user_id}.`);
  }

  const client = new BinanceFuturesClient(creds.mode, {
    apiKey: creds.apiKey,
    apiSecret: creds.apiSecret,
  });
  cache.set(user_id, client);
  return client;
}

export function invalidateBinanceClient(user_id: string) {
  cache.delete(user_id);
}
