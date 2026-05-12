import { useEffect, useState } from 'react';
import { api } from '../api/client';

export interface BinanceBalance {
  total: number;
  available: number;
  loading: boolean;
  error: string | null;
  fetchedAt: number;
}

// ─────────────────────────────────────────────────────────────
// Cache singleton: uma única requisição compartilhada entre todas
// as instâncias do hook. Evita N pollings paralelos em telas com
// múltiplos consumidores. Re-fetch a cada POLL_MS.
// ─────────────────────────────────────────────────────────────
const POLL_MS = 10000;

let cache: BinanceBalance = {
  total: 0,
  available: 0,
  loading: true,
  error: null,
  fetchedAt: 0,
};

let timerId: ReturnType<typeof setInterval> | null = null;
let activeUserId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

async function fetchOnce(userId: string) {
  try {
    const r = await api.testBinance(userId);
    cache = {
      total: Number(r.total ?? 0),
      available: Number(r.available ?? 0),
      loading: false,
      error: null,
      fetchedAt: Date.now(),
    };
  } catch (err: any) {
    cache = {
      ...cache,
      loading: false,
      error: err?.message ?? 'erro ao consultar saldo',
    };
  }
  emit();
}

function ensurePolling(userId: string) {
  if (timerId && activeUserId === userId) return;
  if (timerId) clearInterval(timerId);
  activeUserId = userId;
  cache = { ...cache, loading: true };
  emit();
  fetchOnce(userId);
  timerId = setInterval(() => fetchOnce(userId), POLL_MS);
}

export function useBinanceBalance(userId: string | null) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const update = () => force((x) => x + 1);
    listeners.add(update);
    ensurePolling(userId);
    return () => {
      listeners.delete(update);
      // mantém o timer rodando — outros componentes podem estar usando
    };
  }, [userId]);

  return {
    ...cache,
    refetch: () => (userId ? fetchOnce(userId) : Promise.resolve()),
  };
}
