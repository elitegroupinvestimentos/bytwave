-- ============================================================
-- Bytwave — Senhas (bcrypt) + integridade
-- ============================================================

-- Coluna nullable: usuários antigos (criados via admin sem senha) seguem
-- existindo. Via API /auth/register a senha é obrigatória.
alter table public.users
  add column if not exists password_hash text;

-- Lower-case automático no e-mail para evitar duplicatas case-insensitive.
update public.users set email = lower(email) where email <> lower(email);

-- Index único case-insensitive (já existe unique(email), reforça lowercase)
create unique index if not exists users_email_lower_idx
  on public.users (lower(email));
