import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './db/repository';
import { cache } from './db/cache';
import { initSocket } from './realtime/socket';
import { errorHandler, notFound } from './middleware/errorHandler';
import { apiLimiter, authLimiter, callLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth.routes';
import agentRoutes from './routes/agents.routes';
import scriptRoutes from './routes/scripts.routes';
import providerRoutes from './routes/providers.routes';
import callRoutes from './routes/calls.routes';
import dashboardRoutes from './routes/dashboard.routes';
import settingsRoutes from './routes/settings.routes';
import recordingRoutes from './routes/recordings.routes';
import webhookRoutes from './routes/webhooks.routes';

async function main() {
  await db.init();
  await cache.init();

  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // capacitor://localhost + http(s)://localhost = Android/iOS WebView origins (APK builds).
  app.use(cors({ origin: [config.frontendUrl, 'http://localhost:4200', 'http://localhost:8100', 'capacitor://localhost', 'http://localhost', 'https://localhost'], credentials: true }));
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => res.json({
    ok: true, service: 'voxpilot-backend', version: '0.1.0',
    db: db.backend, time: new Date().toISOString(),
  }));

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/agents', apiLimiter, agentRoutes);
  app.use('/api/scripts', apiLimiter, scriptRoutes);
  app.use('/api/providers', apiLimiter, providerRoutes);
  app.use('/api/calls', callLimiter, callRoutes);
  app.use('/api/dashboard', apiLimiter, dashboardRoutes);
  app.use('/api/settings', apiLimiter, settingsRoutes);
  app.use('/api/recordings', apiLimiter, recordingRoutes);
  app.use('/api/webhooks', webhookRoutes);

  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  initSocket(server);
  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`VoxPilot backend listening on :${config.port} (db=${db.backend}, env=${config.env})`);
  });
}

main().catch((e) => { logger.error('fatal startup error', { error: String(e) }); process.exit(1); });
