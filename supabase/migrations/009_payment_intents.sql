-- Rastreia PIX gerados pela ZyroPay (ou outros gateways) que estão
-- aguardando confirmação. Quando o webhook CONFIRMED chega, a gente
-- credita os tokens prometidos e marca o intent como confirmed.

CREATE TABLE IF NOT EXISTS payment_intents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        text NOT NULL,          -- 'zyropay'
  payment_id      text NOT NULL,          -- id retornado pelo gateway
  mov_id          text,                   -- id de movimento
  external_id     text,                   -- id que enviamos pro gateway
  pix_code        text,                   -- BR code (copia e cola)
  credits         integer NOT NULL,       -- quanto creditar quando confirmar
  usd_amount      numeric(18,2) NOT NULL, -- valor cobrado (1:1 com créditos)
  status          text NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED')),
  confirmed_at    timestamptz,
  raw_callback    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_intents_payment_id_idx
  ON payment_intents(payment_id);
CREATE INDEX IF NOT EXISTS payment_intents_user_status_idx
  ON payment_intents(user_id, status);

CREATE OR REPLACE FUNCTION set_pi_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_intents_updated_at ON payment_intents;
CREATE TRIGGER payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW EXECUTE PROCEDURE set_pi_updated_at();
