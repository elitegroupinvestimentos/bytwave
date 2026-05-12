-- Drawdown protection: campos por usuário em users.
-- - drawdown_enabled: liga/desliga a proteção
-- - drawdown_type: 'percent' (% da banca baseline) ou 'fixed' (USD absoluto)
-- - drawdown_limit_pct: limite quando type='percent' (ex: 10 = 10%)
-- - drawdown_limit_usd: limite quando type='fixed' (ex: 50 = $50 de perda)
-- - drawdown_baseline_usd: equity Binance no momento que o user ativou
-- - drawdown_triggered_at: timestamp do disparo (null se nunca disparou)
-- - drawdown_triggered_equity: equity no momento do disparo (auditoria)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS drawdown_enabled         boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drawdown_type            text          NOT NULL DEFAULT 'percent'
    CHECK (drawdown_type IN ('percent', 'fixed')),
  ADD COLUMN IF NOT EXISTS drawdown_limit_pct       numeric(8,4)  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS drawdown_limit_usd       numeric(18,6) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS drawdown_baseline_usd    numeric(18,6),
  ADD COLUMN IF NOT EXISTS drawdown_triggered_at    timestamptz,
  ADD COLUMN IF NOT EXISTS drawdown_triggered_equity numeric(18,6);
