-- OAuth providers (Google, Facebook, etc.). Configurado pelo admin.
-- - provider: 'google' | 'facebook' (extensível)
-- - client_id / client_secret / redirect_uri: credenciais do app no provider
-- - enabled: liga/desliga sem precisar apagar credenciais

CREATE TABLE IF NOT EXISTS oauth_providers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    text NOT NULL UNIQUE
              CHECK (provider IN ('google', 'facebook')),
  client_id   text NOT NULL DEFAULT '',
  client_secret text NOT NULL DEFAULT '',
  redirect_uri text NOT NULL DEFAULT '',
  enabled     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- trigger pra atualizar updated_at
CREATE OR REPLACE FUNCTION set_oauth_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS oauth_providers_updated_at ON oauth_providers;
CREATE TRIGGER oauth_providers_updated_at
  BEFORE UPDATE ON oauth_providers
  FOR EACH ROW EXECUTE PROCEDURE set_oauth_updated_at();
