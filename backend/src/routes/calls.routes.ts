import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { db } from '../db/repository';
import { CallSession } from '../db/types';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import * as calls from '../services/calls.service';

const r = Router();
r.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

r.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const filter: Record<string, unknown> = { userId: req.userId };
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.agentId) filter.agentId = String(req.query.agentId);
    const q = String(req.query.q || '').toLowerCase();
    const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10));
    let rows = await db.find<CallSession>('calls', filter, { sort: 'startedAt', dir: -1, limit });
    if (q) rows = rows.filter(c => `${c.callerName || ''} ${c.callerPhone || ''} ${c._id}`.toLowerCase().includes(q));
    // enrich with agent names
    const agents = await db.find('agents', { userId: req.userId });
    const nameById = Object.fromEntries(agents.map((a: any) => [a._id, a.name]));
    res.json(rows.map(c => ({ ...c, agentName: nameById[(c as any).agentId] || '—' })));
  } catch (e) { next(e); }
});

// Start a simulated (browser) call — the MVP voice path.
r.post('/simulate', audit('call.start', 'call'), async (req: AuthedRequest, res, next) => {
  try {
    const body = z.object({
      agentId: z.string(), callerName: z.string().max(120).optional(), callerPhone: z.string().max(40).optional(),
    }).parse(req.body);
    const out = await calls.startCall(req.userId!, { ...body, direction: 'simulated' });
    res.status(201).json(out);
  } catch (e) { next(e); }
});

r.get('/:id', async (req: AuthedRequest, res, next) => {
  try {
    const call = await db.findOne('calls', { _id: req.params.id, userId: req.userId });
    if (!call) { res.status(404).json({ error: 'not found' }); return; }
    const [turns, notes, clips, summary, agent, script] = await Promise.all([
      db.find('turns', { callId: call._id }, { sort: 'timestamp', dir: 1, limit: 500 }),
      db.find('notes', { callId: call._id }, { sort: 'createdAt', dir: 1 }),
      db.find('clips', { callId: call._id }, { sort: 'createdAt', dir: 1 }),
      db.findOne('summaries', { callId: call._id }),
      db.findOne('agents', { _id: (call as any).agentId }),
      (call as any).scriptId ? db.findOne('scripts', { _id: (call as any).scriptId }) : Promise.resolve(null),
    ]);
    res.json({ call, turns, notes, clips, summary, agent, script });
  } catch (e) { next(e); }
});

// Submit a caller answer (text, or audio file). Barge-in flagged via ?bargeIn=1 or body.
r.post('/:id/answer', upload.single('audio'), audit('call.answer', 'call'), async (req: AuthedRequest, res, next) => {
  try {
    const text = String((req.body as any)?.text || '');
    const file = (req as any).file as Express.Multer.File | undefined;
    const out = await calls.submitAnswer(req.userId!, req.params.id, {
      text, bargeIn: String((req.body as any)?.bargeIn || req.query.bargeIn || '') === '1' || (req.body as any)?.bargeIn === true,
      audioBase64: file ? file.buffer.toString('base64') : ((req.body as any)?.audioBase64 as string | undefined),
      audioMime: file ? file.mimetype : ((req.body as any)?.audioMime as string | undefined),
    });
    res.json(out);
  } catch (e) { next(e); }
});

r.post('/:id/hangup', audit('call.hangup', 'call'), async (req: AuthedRequest, res, next) => {
  try { res.json(await calls.endCall(req.userId!, req.params.id, 'terminated')); }
  catch (e) { next(e); }
});

r.post('/:id/pause', async (req: AuthedRequest, res, next) => {
  try { res.json(await calls.setPaused(req.userId!, req.params.id, true)); } catch (e) { next(e); }
});
r.post('/:id/resume', async (req: AuthedRequest, res, next) => {
  try { res.json(await calls.setPaused(req.userId!, req.params.id, false)); } catch (e) { next(e); }
});
r.post('/:id/takeover', audit('call.takeover', 'call'), async (req: AuthedRequest, res, next) => {
  try {
    const { mode } = z.object({ mode: z.enum(['human', 'ai']) }).parse(req.body);
    res.json(await calls.takeover(req.userId!, req.params.id, mode));
  } catch (e) { next(e); }
});

export default r;
