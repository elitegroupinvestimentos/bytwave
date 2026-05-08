-- ============================================================
-- Hedge Cycle Bot — Schema inicial
-- Execute no Supabase: SQL Editor → New query → cole tudo → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Usuários
-- ─────────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- API Keys da Binance (criptografadas no backend)
-- Os campos *_enc guardam payload criptografado em AES-256-GCM (hex).
-- ─────────────────────────────────────────────
create table if not exists public.binance_keys (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  mode            text not null check (mode in ('testnet','production')),
  api_key_enc     text not null,
  api_secret_enc  text not null,
  label           text,
  created_at      timestamptz not null default now(),
  unique (user_id, mode)
);

-- ─────────────────────────────────────────────
-- Configuração da estratégia
-- ─────────────────────────────────────────────
create table if not exists public.strategy_configs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  symbol               text not null,                    -- ex: BTCUSDT
  capital_usdt         numeric(20,8) not null,
  leverage             integer not null default 12,
  base_order_usdt      numeric(20,8) not null,
  first_safety_usdt    numeric(20,8) not null,
  max_safety_orders    integer not null default 5,
  initial_distance_pct numeric(10,6) not null default 0.6,
  step_scale           numeric(10,6) not null default 1.5,
  volume_scale         numeric(10,6) not null default 1.8,
  target_profit_pct    numeric(10,6) not null default 0.6,
  status               text not null default 'stopped'
                       check (status in ('running','paused','stopped')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, symbol)
);

-- ─────────────────────────────────────────────
-- Ciclos ativos (um lado LONG e um lado SHORT em modo Hedge)
-- ─────────────────────────────────────────────
create table if not exists public.cycles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  config_id           uuid not null references public.strategy_configs(id) on delete cascade,
  symbol              text not null,
  side                text not null check (side in ('LONG','SHORT')),
  status              text not null default 'open'
                      check (status in ('open','closed','error')),
  base_qty            numeric(30,12) not null default 0,
  total_qty           numeric(30,12) not null default 0,
  avg_price           numeric(30,12) not null default 0,
  invested_usdt       numeric(20,8)  not null default 0,
  realized_pnl_usdt   numeric(20,8)  not null default 0,
  filled_safety_count integer not null default 0,
  opened_at           timestamptz not null default now(),
  closed_at           timestamptz
);

create index if not exists cycles_user_status_idx
  on public.cycles (user_id, status);

-- ─────────────────────────────────────────────
-- Ordens (abertas + histórico no mesmo registro)
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  cycle_id           uuid references public.cycles(id) on delete cascade,
  symbol             text not null,
  side               text not null check (side in ('BUY','SELL')),
  position_side      text not null check (position_side in ('LONG','SHORT')),
  type               text not null,                    -- MARKET, LIMIT, TAKE_PROFIT_MARKET, etc.
  role               text not null check (role in ('BASE','SAFETY','TAKE_PROFIT','MANUAL')),
  price              numeric(30,12),
  stop_price         numeric(30,12),
  qty                numeric(30,12) not null,
  filled_qty         numeric(30,12) not null default 0,
  avg_fill_price     numeric(30,12),
  status             text not null,                    -- NEW, FILLED, PARTIALLY_FILLED, CANCELED, etc.
  binance_order_id   bigint,
  client_order_id    text unique,
  raw                jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists orders_cycle_idx       on public.orders (cycle_id);
create index if not exists orders_user_status_idx on public.orders (user_id, status);

-- ─────────────────────────────────────────────
-- Logs do robô
-- ─────────────────────────────────────────────
create table if not exists public.bot_logs (
  id          bigserial primary key,
  user_id     uuid references public.users(id) on delete cascade,
  cycle_id    uuid references public.cycles(id) on delete set null,
  level       text not null check (level in ('debug','info','warn','error')),
  scope       text,
  message     text not null,
  data        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists bot_logs_user_idx on public.bot_logs (user_id, created_at desc);

-- ─────────────────────────────────────────────
-- Saldo + performance (snapshots)
-- ─────────────────────────────────────────────
create table if not exists public.account_snapshots (
  id              bigserial primary key,
  user_id         uuid not null references public.users(id) on delete cascade,
  total_balance   numeric(20,8) not null,
  available       numeric(20,8) not null,
  unrealized_pnl  numeric(20,8) not null default 0,
  realized_pnl    numeric(20,8) not null default 0,
  exposure_usdt   numeric(20,8) not null default 0,
  raw             jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists snapshots_user_idx on public.account_snapshots (user_id, created_at desc);

-- ─────────────────────────────────────────────
-- Trigger updated_at
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists trg_users_updated         on public.users;
drop trigger if exists trg_configs_updated       on public.strategy_configs;
drop trigger if exists trg_orders_updated        on public.orders;

create trigger trg_users_updated   before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_configs_updated before update on public.strategy_configs
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated  before update on public.orders
  for each row execute function public.set_updated_at();
