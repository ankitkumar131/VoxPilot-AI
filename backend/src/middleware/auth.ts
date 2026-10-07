import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthedRequest extends Request { userId?: string; userEmail?: string; }

export function signAccess(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, config.jwtSecret, { expiresIn: config.jwtAccessTtl } as jwt.SignOptions);
}
export function signRefresh(userId: string): string {
  return jwt.sign({ sub: userId, kind: 'refresh' }, config.jwtRefreshSecret, { expiresIn: `${config.jwtRefreshTtlDays}d` });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'missing token' }); return; }
  try {
    const p = jwt.verify(token, config.jwtSecret) as { sub: string; email: string };
    req.userId = p.sub; req.userEmail = p.email;
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}
