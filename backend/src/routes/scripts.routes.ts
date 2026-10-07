import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/repository';
import { Script, ScriptQuestion } from '../db/types';
import { newId, nowIso } from '../utils/ids';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';

const r = Router();
r.use(requireAuth);

const branchSchema = z.object({
  match: z.string().min(1), matchMode: z.enum(['equals', 'contains', 'regex']),
  nextQuestionId: z.string().min(1), label: z.string().optional(),
});
const questionSchema = z.object({
  id: z.string().optional(), order: z.number().optional(), text: z.string().min(1).max(2000),
  type: z.enum(['open_ended','yes_no','multiple_choice','number','rating','date','email','phone','confirmation','custom']),
  required: z.boolean().optional(), retryLimit: z.number().min(0).max(10).optional(),
  timeoutSec: z.number().min(2).max(120).optional(), followUpEnabled: z.boolean().optional(),
  maxFollowUps: z.number().min(0).max(5).optional(), validation: z.string().max(300).optional(),
  expectedAnswer: z.string().max(1000).optional(), options: z.array(z.string()).optional(),
  min: z.number().optional(), max: z.number().optional(),
  nextQuestionId: z.string().optional(), branches: z.array(branchSchema).optional(), endAfter: z.boolean().optional(),
});

r.get('/', async (req: AuthedRequest, res, next) => {
  try { res.json(await db.find<Script>('scripts', { userId: req.userId }, { sort: 'updatedAt', dir: -1 })); }
  catch (e) { next(e); }
});

r.post('/', audit('script.create', 'script'), async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(160), description: z.string().max(1000).optional(),
      mode: z.enum(['general','interview','complaint','survey','receptionist','lead','support','feedback']).optional(),
      questions: z.array(questionSchema).optional(),
    }).parse(req.body);
    const questions: ScriptQuestion[] = (body.questions || []).map((q, i) => ({
      required: true, retryLimit: 2, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 1,
      ...q, id: q.id || newId('q'), order: q.order ?? i,
    } as ScriptQuestion));
    const doc = await db.create<Script>('scripts', {
      _id: newId('script'), userId: req.userId, name: body.name,
      description: body.description, mode: body.mode || 'general', questions,
      createdAt: nowIso(), updatedAt: nowIso(),
    } as Script);
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

r.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const doc = await db.findOne<Script>('scripts', { _id: req.params.id, userId: req.userId });
    if (!doc) { res.status(404).json({ error: 'not found' }); return; }
    res.json(doc);
  } catch (e) { next(e); }
});

r.put('/:id', audit('script.update', 'script'), async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(1).max(160).optional(), description: z.string().max(1000).optional(),
      mode: z.enum(['general','interview','complaint','survey','receptionist','lead','support','feedback']).optional(),
      questions: z.array(questionSchema).optional(),
    }).parse(req.body);
    const patch: Record<string, unknown> = { ...body, updatedAt: nowIso() };
    if (body.questions) {
      patch.questions = body.questions.map((q, i) => ({
        required: true, retryLimit: 2, timeoutSec: 15, followUpEnabled: false, maxFollowUps: 1,
        ...q, id: q.id || newId('q'), order: q.order ?? i,
      }));
    }
    const doc = await db.updateOne<Script>('scripts', { _id: req.params.id, userId: req.userId }, patch);
    if (!doc) { res.status(404).json({ error: 'not found' }); return; }
    res.json(doc);
  } catch (e) { next(e); }
});

r.delete('/:id', audit('script.delete', 'script'), async (req: AuthedRequest, res, next) => {
  try {
    const ok = await db.deleteOne('scripts', { _id: req.params.id, userId: req.userId });
    if (!ok) { res.status(404).json({ error: 'not found' }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default r;
