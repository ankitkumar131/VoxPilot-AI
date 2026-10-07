import cors from 'cors';
import { config } from '../config';
import { logger } from '../utils/logger';

// Central CORS policy: web dev origins + Android/iOS WebView origins (APK builds)
// + tunnel-friendly explicit headers (ngrok free tier needs a custom header,
// which triggers a preflight — it must be allow-listed or phones get status 0).
const STATIC_ORIGINS = [
  config.frontendUrl,
  'http://localhost:4200',
  'http://localhost:8100',
];

function isAllowed(origin: string): boolean {
  if (STATIC_ORIGINS.includes(origin)) return true;
  try {
    const u = new URL(origin);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    return local && ['http:', 'https:', 'capacitor:'].includes(u.protocol);
  } catch {
    return false;
  }
}

export function corsOrigin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return cb(null, true); // curl, Postman, non-browser
  if (isAllowed(origin)) return cb(null, true);
  logger.warn('blocked CORS origin — request will fail preflight', { origin });
  cb(null, false);
}

export const corsOptions: cors.CorsOptions = {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'X-Requested-With', 'Accept', 'Origin'],
};

// Same policy for the Socket.IO handshake.
export const socketCorsOptions = {
  origin: STATIC_ORIGINS.concat(['capacitor://localhost', 'http://localhost', 'https://localhost']),
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
};
