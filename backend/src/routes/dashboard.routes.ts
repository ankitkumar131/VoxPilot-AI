import { Router } from 'express';
import { db } from '../db/repository';
import { requireAuth, AuthedRequest } from '../middleware/auth';

const r = Router();
r.use(requireAuth);

r.get('/stats', async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const [totalCalls, agents, scripts, clips, activeCalls, recent, settings] = await Promise.all([
      db.count('calls', { userId }),
      db.count('agents', { userId }),
      db.count('scripts', { userId }),
      db.count('clips', { userId }),
      db.find('calls', { userId, status: 'active' }, { limit: 10, sort: 'startedAt', dir: -1 }),
      db.find('calls', { userId }, { limit: 8, sort: 'startedAt', dir: -1 }),
      db.findOne('settings', { userId }),
    ]);
    const agentRows = await db.find('agents', { userId });
    const nameById = Object.fromEntries(agentRows.map((a: any) => [a._id, a.name]));
    const withNames = (rows: any[]) => rows.map(c => ({ ...c, agentName: nameById[c.agentId] || '—' }));
    res.json({
      aiEnabled: (settings as any)?.aiEnabled ?? true,
      totalCalls, totalAgents: agents, totalScripts: scripts, totalRecordings: clips,
      activeCalls: withNames(activeCalls as any[]), recentCalls: withNames(recent as any[]),
    });
  } catch (e) { next(e); }
});

export default r;
