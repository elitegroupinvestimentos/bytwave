import { env } from './config/env';
import { logger } from './services/logs/logger';
import { runTick } from './strategy/engine';

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Loop infinito do motor da estratégia.
 * Cada tick: executa runTick(); ao terminar, agenda o próximo após WORKER_INTERVAL_MS.
 * Falhas individuais não derrubam o loop (são logadas e seguimos).
 */
export function startWorker() {
  if (running) return;
  running = true;
  logger.info({ intervalMs: env.WORKER_INTERVAL_MS }, 'worker iniciado');
  scheduleNext(0);
}

export function stopWorker() {
  running = false;
  if (timer) clearTimeout(timer);
  timer = null;
  logger.warn('worker parado');
}

function scheduleNext(delay: number) {
  if (!running) return;
  timer = setTimeout(tick, delay);
}

async function tick() {
  const start = Date.now();
  try {
    await runTick();
  } catch (err) {
    logger.error({ err }, 'erro no tick — continuando');
  } finally {
    const elapsed = Date.now() - start;
    const wait = Math.max(env.WORKER_INTERVAL_MS - elapsed, 250);
    scheduleNext(wait);
  }
}

// Permite rodar o worker isoladamente: `npm run worker`
if (require.main === module) {
  startWorker();
  process.on('SIGINT', () => {
    stopWorker();
    process.exit(0);
  });
}
