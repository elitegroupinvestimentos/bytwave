-- ============================================================
-- Bytwave — Garante 1 ciclo aberto por (user, symbol, side)
-- Evita duplicatas se algum bug ou race condition criar 2 cycles "open"
-- pra mesma combinação. Ciclos closed/error podem se repetir.
-- ============================================================

create unique index if not exists cycles_one_open_per_side_idx
  on public.cycles (user_id, symbol, side)
  where status = 'open';
