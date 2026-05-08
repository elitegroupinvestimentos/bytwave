import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

export const saveBinanceKeysSchema = z.object({
  user_id: z.string().uuid(),
  mode: z.enum(['testnet', 'production']),
  api_key: z.string().min(10),
  api_secret: z.string().min(10),
  label: z.string().optional(),
});

export const strategyConfigSchema = z.object({
  user_id: z.string().uuid(),
  symbol: z.string().regex(/^[A-Z0-9]{3,20}$/, 'symbol em maiúsculas, ex: BTCUSDT'),
  capital_usdt: z.number().positive(),
  leverage: z.number().int().min(1).max(125).default(12),
  base_order_usdt: z.number().positive(),
  first_safety_usdt: z.number().positive(),
  max_safety_orders: z.number().int().min(0).max(20).default(5),
  initial_distance_pct: z.number().positive().default(0.6),
  step_scale: z.number().positive().default(1.5),
  volume_scale: z.number().positive().default(1.8),
  target_profit_pct: z.number().positive().default(0.6),
});

export const botActionSchema = z.object({
  user_id: z.string().uuid(),
  symbol: z.string().regex(/^[A-Z0-9]{3,20}$/),
});
