import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/repository';
import { User } from '../db/types';
import { newId, nowIso } from '../utils/ids';
import { signAccess, signRefresh, requireAuth, AuthedRequest } from '../middleware/auth';
import { sha256 } from '../utils/crypto';
import { config } from '../config';

const r = Router();

r.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = z.object({
      email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(80),
    }).parse(req.body);
    const exists = await db.findOne('users', { email: email.toLowerCase() });
    if (exists) { res.status(409).json({ error: 'email already registered' }); return; }
    const user = await db.create<User>('users', {
      _id: newId('usr'), email: email.toLowerCase(), name,
      passwordHash: await bcrypt.hash(password, 10), role: 'owner',
      refreshTokens: [], createdAt: nowIso(), updatedAt: nowIso(),
    } as User);
    await db.create('settings', {
      _id: newId('set'), userId: user._id, aiEnabled: true, telephonyProvider: 'mock',
      language: 'en', voice: 'alloy', recordingMode: 'segments', retentionDays: 90, autoDelete: false,
      notifications: { email: true, push: true, callCompleted: true },
      privacy: { storeAudio: true, storeTranscript: true }, updatedAt: nowIso(),
    });
    const access = signAccess(user._id, user.email);
    const refresh = signRefresh(user._id);
    await db.updateOne('users', { _id: user._id }, { refreshTokens: [sha256(refresh)] });
    res.status(201).json({ access, refresh, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) { next(e); }
});

r.post('/login', async (req, res, next) => {
  try {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    const user = await db.findOne<User>('users', { email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'invalid credentials' }); return;
    }
    const access = signAccess(user._id, user.email);
    const refresh = signRefresh(user._id);
    const tokens = [...(user.refreshTokens || []), sha256(refresh)].slice(-10);
    await db.updateOne('users', { _id: user._id }, { refreshTokens: tokens });
    res.json({ access, refresh, user: { id: user._id, email: user.email, name: user.name } });
  } catch (e) { next(e); }
});

r.post('/refresh', async (req, res, next) => {
  try {
    const { refresh } = z.object({ refresh: z.string() }).parse(req.body);
    const p = jwt.verify(refresh, config.jwtRefreshSecret) as { sub: string; kind: string };
    if (p.kind !== 'refresh') throw new Error('bad token');
    const user = await db.findOne<User>('users', { _id: p.sub });
    if (!user || !user.refreshTokens?.includes(sha256(refresh))) {
      res.status(401).json({ error: 'invalid refresh token' }); return;
    }
    res.json({ access: signAccess(user._id, user.email) });
  } catch (e) { next(e); }
});

r.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await db.findOne<User>('users', { _id: req.userId });
    if (!user) { res.status(404).json({ error: 'not found' }); return; }
    res.json({ id: user._id, email: user.email, name: user.name, role: user.role });
  } catch (e) { next(e); }
});

r.post('/logout', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const { refresh } = z.object({ refresh: z.string().optional() }).parse(req.body || {});
    if (refresh) {
      const user = await db.findOne<User>('users', { _id: req.userId });
      if (user) await db.updateOne('users', { _id: user._id }, { refreshTokens: (user.refreshTokens || []).filter(t => t !== sha256(refresh)) });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
