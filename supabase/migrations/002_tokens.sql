-- ============================================================
-- Bytwave Tokens — sistema de saldo + auditoria + packs
-- Idempotente: pode ser rodado várias vezes sem efeitos colaterais.
-- ============================================================

-- Saldo por usuário
alter table public.users
  add column if not exists token_balance integer not null default 0;

-- Audit log: cada crédito/débito vira uma linha
create table if not exists public.token_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  delta           integer not null,                -- positivo = crédito, negativo = débito
  reason          text not null,                   -- 'signup_grant', 'cycle_open', 'pack_purchase', 'admin_grant', etc.
  cycle_id        uuid references public.cycles(id) on delete set null,
  order_id        uuid references public.orders(id) on delete set null,
  balance_before  integer not null,
  balance_after   integer not null,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists token_tx_user_idx
  on public.token_transactions (user_id, created_at desc);

-- Pacotes de tokens (catálogo configurável)
create table if not exists public.token_packs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tokens        integer not null check (tokens > 0),
  price_brl     numeric(10,2) not null check (price_brl >= 0),
  active        boolean not null default true,
  highlight     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── Funções atômicas (lock por usuário, sem race condition) ───────────────

-- Consome tokens. Retorna (success, balance_after, message).
create or replace function public.consume_tokens(
  p_user_id   uuid,
  p_amount    integer,
  p_reason    text,
  p_cycle_id  uuid default null,
  p_order_id  uuid default null,
  p_metadata  jsonb default null
) returns table (success boolean, balance_after integer, message text)
language plpgsql as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    return query select false, 0, 'amount must be positive'::text;
    return;
  end if;

  -- Lock pessimista no usuário (FOR UPDATE) — evita consumo duplicado
  select token_balance into v_balance
    from public.users
    where id = p_user_id
    for update;

  if v_balance is null then
    return query select false, 0, 'user not found'::text;
    return;
  end if;

  if v_balance < p_amount then
    return query select false, v_balance, 'insufficient tokens'::text;
    return;
  end if;

  update public.users
    set token_balance = token_balance - p_amount
    where id = p_user_id;

  insert into public.token_transactions
    (user_id, delta, reason, cycle_id, order_id, balance_before, balance_after, metadata)
  values
    (p_user_id, -p_amount, p_reason, p_cycle_id, p_order_id, v_balance, v_balance - p_amount, p_metadata);

  return query select true, v_balance - p_amount, 'ok'::text;
end$$;

-- Credita tokens. Retorna (success, balance_after).
create or replace function public.grant_tokens(
  p_user_id   uuid,
  p_amount    integer,
  p_reason    text,
  p_metadata  jsonb default null
) returns table (success boolean, balance_after integer)
language plpgsql as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    return query select false, 0;
    return;
  end if;

  select token_balance into v_balance
    from public.users
    where id = p_user_id
    for update;

  if v_balance is null then
    return query select false, 0;
    return;
  end if;

  update public.users
    set token_balance = token_balance + p_amount
    where id = p_user_id;

  insert into public.token_transactions
    (user_id, delta, reason, balance_before, balance_after, metadata)
  values
    (p_user_id, p_amount, p_reason, v_balance, v_balance + p_amount, p_metadata);

  return query select true, v_balance + p_amount;
end$$;

-- Garante saldo nunca-negativo via constraint (defesa em profundidade)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_token_balance_nonneg'
  ) then
    alter table public.users
      add constraint users_token_balance_nonneg check (token_balance >= 0);
  end if;
end$$;

-- ─── Seed: pacotes default (idempotente) ──────────────────────────────────
insert into public.token_packs (name, tokens, price_brl, active, highlight)
select * from (values
  ('Starter',  100,    9.90, true, false),
  ('Pro',      500,   39.90, true, true),
  ('Power',    2000, 129.90, true, false)
) as v(name, tokens, price_brl, active, highlight)
where not exists (
  select 1 from public.token_packs t where t.name = v.name
);
