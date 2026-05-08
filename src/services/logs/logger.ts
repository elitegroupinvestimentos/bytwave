import pino from 'pino';
import { env } from '../../config/env';
import { supabase } from '../supabase/client';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

type Level = 'debug' | 'info' | 'warn' | 'error';

interface BotLogInput {
  level: Level;
  scope?: string;
  message: string;
  user_id?: string | null;
  cycle_id?: string | null;
  data?: unknown;
}

// Loga no stdout e persiste no Supabase (não-bloqueante).
export async function botLog(input: BotLogInput) {
  const { level, scope, message, user_id, cycle_id, data } = input;
  logger[level]({ scope, user_id, cycle_id, data }, message);

  try {
    await supabase.from('bot_logs').insert({
      user_id: user_id ?? null,
      cycle_id: cycle_id ?? null,
      level,
      scope: scope ?? null,
      message,
      data: data ?? null,
    });
  } catch (err) {
    logger.error({ err }, 'failed to persist bot log');
  }
}
