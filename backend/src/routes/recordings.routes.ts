// Secure clip streaming: owner-only, never public; supports Range for scrubbing.
import { Router } from 'express';
import { db } from '../db/repository';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { activeStorage } from '../services/storage';

const r = Router();
r.use(requireAuth);

r.get('/:clipId/stream', async (req: AuthedRequest, res, next) => {
  try {
    const clip: any = await db.findOne('clips', { _id: req.params.clipId, userId: req.userId });
    if (!clip) { res.status(404).json({ error: 'not found' }); return; }
    const obj = await activeStorage().get(clip.key);
    if (!obj) { res.status(404).json({ error: 'audio missing' }); return; }
    const total = obj.data.length;
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', obj.mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (range) {
      const m = range.match(/bytes=(\d*)-(\d*)/);
      const start = m?.[1] ? parseInt(m[1], 10) : 0;
      const end = m?.[2] ? parseInt(m[2], 10) : Math.min(total - 1, start + 512 * 1024);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', String(end - start + 1));
      res.end(obj.data.subarray(start, end + 1));
    } else {
      res.setHeader('Content-Length', String(total));
      res.end(obj.data);
    }
  } catch (e) { next(e); }
});

export default r;
