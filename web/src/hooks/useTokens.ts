import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

export interface TokenStatus {
  balance: number;
  low: boolean;
  empty: boolean;
  tokensPerCycle: number;
  loading: boolean;
  error: string | null;
}

const POLL_MS = 8000;

/**
 * Hook que mantém o saldo de tokens fresco (poll a cada 8s) com refetch manual.
 */
export function useTokens(userId: string | null): TokenStatus & { refetch: () => Promise<void> } {
  const [state, setState] = useState<TokenStatus>({
    balance: 0,
    low: false,
    empty: false,
    tokensPerCycle: 1,
    loading: true,
    error: null,
  });

  const fetchOnce = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await api.tokensBalance(userId);
      setState({
        balance: data.balance,
        low: data.low,
        empty: data.empty,
        tokensPerCycle: data.tokens_per_cycle,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err?.message ?? 'erro ao consultar saldo' }));
    }
  }, [userId]);

  useEffect(() => {
    fetchOnce();
    const id = setInterval(fetchOnce, POLL_MS);
    return () => clearInterval(id);
  }, [fetchOnce]);

  return { ...state, refetch: fetchOnce };
}
