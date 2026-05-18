-- Payment gateways (PIX, cartão, etc.). Configurado pelo admin.
-- Diferente de oauth_providers porque o esquema de credenciais varia.
-- Por enquanto: zyropay (PIX-IN). Extensível pra outros provedores.

CREATE TABLE IF NOT EXISTS payment_gateways (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      text NOT NULL UNIQUE,            -- 'zyropay', 'stripe', etc.
  client_id     text NOT NULL DEFAULT '',
  client_secret text NOT NULL DEFAULT '',        -- senha / API secret
  webhook_url   text NOT NULL DEFAULT '',        -- URL pública do nosso webhook
  base_url      text NOT NULL DEFAULT '',        -- override opcional (sandbox/prod)
  enabled       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_pg_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_gateways_updated_at ON payment_gateways;
CREATE TRIGGER payment_gateways_updated_at
  BEFORE UPDATE ON payment_gateways
  FOR EACH ROW EXECUTE PROCEDURE set_pg_updated_at();
