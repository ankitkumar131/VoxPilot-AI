import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/repository';
import { Agent } from '../db/types';
import { newId, nowIso } from '../utils/ids';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';

const r = Router();
r.use(requireAuth);

const agentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().optional(),
  language: z.string().max(12).optional(),
  voice: z.string().max(40).optional(),
  personality: z.string().max(2000).optional(),
  speakingStyle: z.string().max(2000).optional(),
  greeting: z.string().max(2000).optional(),
  scriptId: z.string().optional(),
  providerId: z.string().optional(),
  modelOverride: z.string().max(120).optional(),
  maxCallMinutes: z.number().min(1).max(120).optional(),
  silenceTimeoutSec: z.number().min(2).max(60).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  allowFollowUps: z.boolean().optional(),
  allowBargeIn: z.boolean().optional(),
  recordingMode: z.enum(['full', 'segments', 'answers_only', 'transcript_only', 'notes_only']).optional(),
  transcribe: z.boolean().optional(),
  takeNotes: z.boolean().optional(),
  endPhrase: z.string().max(300).optional(),
});

r.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const q = String(req.query.q || '');
    const filter: Record<string, unknown> = { userId: req.userId };
    if (req.query.enabled !== undefined) filter.enabled = req.query.enabled === 'true';
    let rows = await db.find<Agent>('agents', filter, { sort: 'updatedAt', dir: -1 });
    if (q) rows = rows.filter(a => (a.name + ' ' + (a.description || '')).toLowerCase().includes(q.toLowerCase()));
    res.json(rows);
  } catch (e) { next(e); }
});

r.post('/', audit('agent.create', 'agent'), async (req: AuthedRequest, res, next) => {
  try {
    const body = agentSchema.parse(req.body);
    const doc = await db.create<Agent>('agents', {
      _id: newId('agent'), userId: req.userId, enabled: true, language: 'en', voice: 'alloy',
      personality: 'friendly, professional, concise', speakingStyle: 'natural conversational telephone speech',
      greeting: `Hello, this is ${body.name}. How can I help you today?`,
      maxCallMinutes: 15, silenceTimeoutSec: 8, maxRetries: 2,
      allowFollowUps: true, allowBargeIn: true, recordingMode: 'segments',
      transcribe: true, takeNotes: true, ...body,
      createdAt: nowIso(), updatedAt: nowIso(),
    } as Agent);
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

r.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const doc = await db.findOne<Agent>('agents', { _id: req.params.id, userId: req.userId });
    if (!doc) { res.status(404).json({ error: 'not found' }); return; }
    res.json(doc);
  } catch (e) { next(e); }
});

r.patch('/:id', audit('agent.update', 'agent'), async (req: AuthedRequest, res, next) => {
  try {
    const body = agentSchema.partial().parse(req.body);
    const doc = await db.updateOne<Agent>('agents', { _id: req.params.id, userId: req.userId }, { ...body, updatedAt: nowIso() });
    if (!doc) { res.status(404).json({ error: 'not found' }); return; }
    res.json(doc);
  } catch (e) { next(e); }
});

r.post('/:id/toggle', audit('agent.toggle', 'agent'), async (req: AuthedRequest, res, next) => {
  try {
    const doc = await db.findOne<Agent>('agents', { _id: req.params.id, userId: req.userId });
    if (!doc) { res.status(404).json({ error: 'not found' }); return; }
    const updated = await db.updateOne<Agent>('agents', { _id: doc._id }, { enabled: !doc.enabled, updatedAt: nowIso() });
    res.json(updated);
  } catch (e) { next(e); }
});

r.delete('/:id', audit('agent.delete', 'agent'), async (req: AuthedRequest, res, next) => {
  try {
    const ok = await db.deleteOne('agents', { _id: req.params.id, userId: req.userId });
    if (!ok) { res.status(404).json({ error: 'not found' }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
