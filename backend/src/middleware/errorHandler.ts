import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err?.status || 500;
  logger.error(err?.message || 'unhandled error', { status, stack: err?.stack?.slice(0, 2000) });
  res.status(status).json({ error: status === 500 ? 'internal server error' : err.message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'not found' });
}
