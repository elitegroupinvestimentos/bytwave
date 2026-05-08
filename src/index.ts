import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { router } from './api/routes';
import { adminRouter } from './api/admin';
import { logger } from './services/logs/logger';
import { startWorker, stopWorker } from './worker';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.use('/api', router);
app.use('/api/admin', adminRouter);

app.use((req, res) => res.status(404).json({ error: 'not found', path: req.path }));

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, mode: env.BINANCE_MODE },
    `API up — modo ${env.BINANCE_MODE.toUpperCase()}`,
  );
  startWorker();
});

// Reconexão / graceful shutdown ──────────────────────────────────────────────
function shutdown(sig: string) {
  logger.warn({ sig }, 'shutdown sinalizado');
  stopWorker();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'uncaughtException — segue rodando');
});
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'unhandledRejection — segue rodando');
});
