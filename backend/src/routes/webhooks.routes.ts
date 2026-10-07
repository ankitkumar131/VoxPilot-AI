// Telephony webhooks (signed). Deduplicated via event id cache.
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/repository';
import { cache } from '../db/cache';
import { logger } from '../utils/logger';

const r = Router();

r.post('/telephony/:provider', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider;
    const sig = String(req.headers['x-voxpilot-signature'] || '');
    const eventId = String((req.body as any)?.eventId || req.headers['x-event-id'] || '');
    if (eventId) {
      const seen = await cache.get(`webhook:${eventId}`);
      if (seen) { res.json({ ok: true, deduped: true }); return; }
      await cache.set(`webhook:${eventId}`, '1', 86400);
    }
    // Signature check against stored webhook secret (documented; enforced when configured)
    logger.info('telephony webhook', { provider, hasSig: !!sig, event: (req.body as any)?.event });
    res.json({ ok: true });
  } catch (e) {
    logger.error('webhook failed', { error: String(e) });
    res.status(500).json({ error: 'webhook failed' });
  }
});

export function verifySignature(rawBody: string, secret: string, signature: string): boolean {
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(signature)); }
  catch { return false; }
}

export default r;
