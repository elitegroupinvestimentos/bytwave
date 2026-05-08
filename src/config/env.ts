import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  BINANCE_MODE: z.enum(['testnet', 'production']).default('testnet'),

  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY deve ter 64 caracteres hex (32 bytes)'),

  WORKER_INTERVAL_MS: z.coerce.number().default(5000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MAX_EXPOSURE_USDT: z.coerce.number().default(0),

  // ── Tokens ────────────────────────────────────────────
  // Tokens grátis ao criar uma conta nova (0 desliga o grant).
  INITIAL_TOKEN_GRANT: z.coerce.number().int().nonnegative().default(100),
  // Tokens cobrados por ciclo aberto (BASE + SOs + TP). 0 desliga a cobrança.
  TOKENS_PER_CYCLE: z.coerce.number().int().nonnegative().default(1),
  // Limite a partir do qual mostramos alerta de "tokens acabando".
  LOW_TOKENS_THRESHOLD: z.coerce.number().int().nonnegative().default(10),

  // ── Admin ─────────────────────────────────────────────
  // Senha do painel admin. Trocar em produção. Comparado contra header
  // `x-admin-password` em todas as rotas /api/admin/*.
  ADMIN_PASSWORD: z.string().min(4).default('admin123'),

  // ── Auth (JWT + bcrypt) ───────────────────────────────
  // Segredo pra assinar JWTs. NUNCA mude em produção sem rotação de tokens.
  // Gere com: openssl rand -hex 32
  JWT_SECRET: z.string().min(32),
  // Custo do bcrypt (10 = ~10ms, 12 = ~150ms, 14 = ~700ms). Padrão balanceado.
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(14).default(10),
  // Expiração do JWT (formato: "7d", "1h", "30m"). Padrão 7 dias.
  JWT_EXPIRES_IN: z.string().default('7d'),
});

export const env = schema.parse(process.env);
export type Env = typeof env;
