import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/repository';
import { newId, nowIso } from '../utils/ids';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const r = Router();
r.use(requireAuth);

async function getOrCreate(userId: string) {
  let s = await db.findOne('settings', { userId });
  if (!s) {
    s = await db.create('settings', {
      _id: newId('set'), userId, aiEnabled: true, telephonyProvider: 'mock',
      language: 'en', voice: 'alloy', recordingMode: 'segments', retentionDays: 90, autoDelete: false,
      notifications: { email: true, push: true, callCompleted: true },
      privacy: { storeAudio: true, storeTranscript: true }, updatedAt: nowIso(),
    });
  }
  return s;
}

r.get('/', async (req: AuthedRequest, res, next) => {
  try { res.json(await getOrCreate(req.userId!)); } catch (e) { next(e); }
});

r.patch('/', async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      aiEnabled: z.boolean().optional(),
      telephonyProvider: z.enum(['mock', 'sip', 'twilio']).optional(),
      language: z.string().max(12).optional(), voice: z.string().max(40).optional(),
      recordingMode: z.enum(['full', 'segments', 'answers_only', 'transcript_only', 'notes_only']).optional(),
      retentionDays: z.number().min(1).max(3650).optional(), autoDelete: z.boolean().optional(),
      notifications: z.object({ email: z.boolean(), push: z.boolean(), callCompleted: z.boolean() }).partial().optional(),
      privacy: z.object({ storeAudio: z.boolean(), storeTranscript: z.boolean() }).partial().optional(),
    }).parse(req.body);
    await getOrCreate(req.userId!);
    res.json(await db.updateOne('settings', { userId: req.userId }, { ...body, updatedAt: nowIso() }));
  } catch (e) { next(e); }
});

export default r;
