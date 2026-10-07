import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/repository';
import { AiProvider } from '../db/types';
import { newId, nowIso } from '../utils/ids';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { encryptSecret, decryptSecret, maskSecret } from '../utils/crypto';
import { getAdapter } from '../services/provider/registry';

const r = Router();
r.use(requireAuth);

function sanitize(p: AiProvider): Record<string, unknown> {
  const { apiKeyEnc: _e, ...rest } = p as unknown as Record<string, unknown>;
  return { ...rest, apiKeySet: !!(_e as string), apiKeyMasked: maskSecret() };
}

const providerSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(['openrouter','nvidia','openai_compatible','custom','mock']),
  baseUrl: z.string().max(300).optional(),
  apiKey: z.string().max(500).optional(),
  model: z.string().min(1).max(160),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(16).max(32000).optional(),
  extraHeaders: z.record(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

const DEFAULT_BASE: Record<string, string> = {
  openrouter: 'https://openrouter.ai/api/v1', nvidia: 'https://integrate.api.nvidia.com/v1',
  openai_compatible: 'http://localhost:11434/v1', custom: '', mock: '',
};

r.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const rows = await db.find<AiProvider>('providers', { userId: req.userId }, { sort: 'updatedAt', dir: -1 });
    res.json(rows.map(sanitize));
  } catch (e) { next(e); }
});

r.post('/', audit('provider.create', 'provider'), async (req: AuthedRequest, res, next) => {
  try {
    const body = providerSchema.parse(req.body);
    if (body.isDefault) {
      const existing = await db.find<AiProvider>('providers', { userId: req.userId, isDefault: true });
      for (const e of existing) await db.updateOne('providers', { _id: e._id }, { isDefault: false });
    } else {
      const count = await db.count('providers', { userId: req.userId });
      if (count === 0) body.isDefault = true;
    }
    const doc = await db.create<AiProvider>('providers', {
      _id: newId('prov'), userId: req.userId, name: body.name, kind: body.kind,
      baseUrl: body.baseUrl || DEFAULT_BASE[body.kind] || '',
      apiKeyEnc: body.apiKey ? encryptSecret(body.apiKey) : '',
      model: body.model, temperature: body.temperature ?? 0.3, maxTokens: body.maxTokens ?? 800,
      extraHeaders: body.extraHeaders, isDefault: !!body.isDefault,
      createdAt: nowIso(), updatedAt: nowIso(),
    } as AiProvider);
    res.status(201).json(sanitize(doc));
  } catch (e) { next(e); }
});

r.patch('/:id', audit('provider.update', 'provider'), async (req: AuthedRequest, res, next) => {
  try {
    const body = providerSchema.partial().parse(req.body);
    const patch: Record<string, unknown> = { ...body, updatedAt: nowIso() };
    delete patch.apiKey;
    if (body.apiKey !== undefined) patch.apiKeyEnc = body.apiKey ? encryptSecret(body.apiKey) : '';
    if (body.isDefault) {
      const existing = await db.find<AiProvider>('providers', { userId: req.userId, isDefault: true });
      for (const e of existing) if (e._id !== req.params.id) await db.updateOne('providers', { _id: e._id }, { isDefault: false });
    }
    const doc = await db.updateOne<AiProvider>('providers', { _id: req.params.id, userId: req.userId }, patch);
    if (!doc) { res.status(404).json({ error: 'not found' }); return; }
    res.json(sanitize(doc));
  } catch (e) { next(e); }
});

r.delete('/:id', audit('provider.delete', 'provider'), async (req: AuthedRequest, res, next) => {
  try {
    const ok = await db.deleteOne('providers', { _id: req.params.id, userId: req.userId });
    if (!ok) { res.status(404).json({ error: 'not found' }); return; }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

r.post('/:id/test', audit('provider.test', 'provider'), async (req: AuthedRequest, res, next) => {
  try {
    const doc = await db.findOne<AiProvider>('providers', { _id: req.params.id, userId: req.userId });
    if (!doc) { res.status(404).json({ error: 'not found' }); return; }
    const key = doc.apiKeyEnc ? decryptSecret(doc.apiKeyEnc) : '';
    const result = await getAdapter(doc.kind).testConnection(doc.baseUrl, key, doc.model);
    await db.updateOne('providers', { _id: doc._id }, { lastTestedAt: nowIso(), lastTestOk: result.ok });
    res.json(result); // never includes the key
  } catch (e) { next(e); }
});

export default r;
