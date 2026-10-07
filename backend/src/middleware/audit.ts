import { Response, NextFunction } from 'express';
import { AuthedRequest } from './auth';
import { db } from '../db/repository';
import { newId, nowIso } from '../utils/ids';

export function audit(action: string, entity?: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    db.create('audit_logs', {
      _id: newId('aud'), userId: req.userId, action, entity,
      entityId: req.params?.id, ip: req.ip, createdAt: nowIso(),
    }).catch(() => {});
    next();
  };
}
