import { env } from '../../config/env';
import { BinanceFuturesClient } from './client';
import { getDecryptedKeys } from '../supabase/service';

// Cache simples por usuário (evita decriptar a cada loop).
const cache = new Map<string, BinanceFuturesClient>();

export async function getBinanceClient(user_id: string): Promise<BinanceFuturesClient> {
  const cacheKey = `${user_id}:${env.BINANCE_MODE}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const creds = await getDecryptedKeys(user_id, env.BINANCE_MODE);
  if (!creds) {
    throw new Error(
      `API keys da Binance (${env.BINANCE_MODE}) não cadastradas para o usuário ${user_id}.`,
    );
  }

  const client = new BinanceFuturesClient(env.BINANCE_MODE, creds);
  cache.set(cacheKey, client);
  return client;
}

export function invalidateBinanceClient(user_id: string) {
  cache.delete(`${user_id}:${env.BINANCE_MODE}`);
}
