-- Overrides de display pra contas de marketing/demo.
-- O backend continua puxando dados reais; quando esses campos estão
-- preenchidos, sobrepõem os valores reais SÓ na resposta da API
-- (Binance balance, PnL realizado total, PnL do dia).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS marketing_overrides JSONB;

-- Schema esperado do JSON (todos opcionais):
-- {
--   "balance": 12345.67,        // sobrescreve saldo Binance
--   "realized_total": 980.50,   // sobrescreve Lucro Realizado total
--   "today_pnl": 24.30          // sobrescreve PnL do dia
-- }
