import axios from 'axios';

// Conversão USD→BRL via awesomeapi (público, sem auth).
// Cacheia 10min pra não bater por request.
const CACHE_TTL_MS = 10 * 60 * 1000;
const FALLBACK = 5.0;

let cache: { rate: number; fetchedAt: number } | null = null;

export async function getUsdBrlRate(): Promise<number> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }
  try {
    const r = await axios.get('https://economia.awesomeapi.com.br/last/USD-BRL', {
      timeout: 5000,
    });
    const ask = Number(r.data?.USDBRL?.ask);
    if (Number.isFinite(ask) && ask > 0) {
      cache = { rate: ask, fetchedAt: Date.now() };
      return ask;
    }
  } catch {
    // fall through
  }
  // Fallback: usa cache antigo se tiver, senão constante.
  if (cache) return cache.rate;
  return FALLBACK;
}

export function convertUsdToBrl(usd: number, rate: number): number {
  // Arredonda pra 2 casas (centavos)
  return Number((usd * rate).toFixed(2));
}
