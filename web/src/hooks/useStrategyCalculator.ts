import { useEffect, useMemo, useState } from 'react';
import {
  calculateStrategy,
  RiskMode,
  CalculatedStrategy,
  validateBank,
} from '../lib/strategyCalculator';

const KEY_BANK = 'bytwave_calc_bank';
const KEY_MODE = 'bytwave_calc_mode';

interface Options {
  defaultBank?: number;
  defaultMode?: RiskMode;
}

/**
 * Hook do calculador. Persiste banca e modo em localStorage; recalcula
 * em tempo real ao mudar qualquer um dos dois.
 */
export function useStrategyCalculator(opts: Options = {}) {
  const [bank, setBank] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(KEY_BANK));
      if (Number.isFinite(v) && v > 0) return v;
    } catch {
      // ignore
    }
    return opts.defaultBank ?? 1000;
  });

  const [mode, setMode] = useState<RiskMode>(() => {
    try {
      const v = localStorage.getItem(KEY_MODE);
      if (v === 'conservador' || v === 'agressivo') return v;
    } catch {
      // ignore
    }
    return opts.defaultMode ?? 'conservador';
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY_BANK, String(bank));
    } catch {
      // ignore
    }
  }, [bank]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY_MODE, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  const error = useMemo(() => validateBank(bank), [bank]);
  const strategy: CalculatedStrategy = useMemo(
    () => calculateStrategy(bank > 0 ? bank : 1, mode),
    [bank, mode],
  );

  return { bank, setBank, mode, setMode, strategy, error };
}
