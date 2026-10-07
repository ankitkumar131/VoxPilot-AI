// Demo seed: mock provider + interview & complaint templates + agent + a sample call.
// Run: npm run seed (idempotent per email). Never seeds real API keys.
import bcrypt from 'bcryptjs';
import { db } from './db/repository';
import { cache } from './db/cache';
import { newId, nowIso } from './utils/ids';
import { interviewTemplate, complaintTemplate } from './templates';

const EMAIL = process.env.SEED_EMAIL || 'demo@voxpilot.ai';

async function main() {
  await db.init(); await cache.init();
  let user: any = await db.findOne('users', { email: EMAIL });
  if (!user) {
    user = await db.create('users', {
      _id: newId('usr'), email: EMAIL, name: 'Demo User',
      passwordHash: await bcrypt.hash('VoxPilot123!', 10), role: 'owner',
      refreshTokens: [], createdAt: nowIso(), updatedAt: nowIso(),
    });
    console.log('created demo user demo@voxpilot.ai / VoxPilot123!');
  }
  const uid = user._id;
  if (!(await db.findOne('settings', { userId: uid }))) {
    await db.create('settings', {
      _id: newId('set'), userId: uid, aiEnabled: true, telephonyProvider: 'mock',
      language: 'en', voice: 'alloy', recordingMode: 'segments', retentionDays: 90, autoDelete: false,
      notifications: { email: true, push: true, callCompleted: true },
      privacy: { storeAudio: true, storeTranscript: true }, updatedAt: nowIso(),
    });
  }
  if (!(await db.findOne('providers', { userId: uid }))) {
    await db.create('providers', {
      _id: newId('prov'), userId: uid, name: 'Offline Mock', kind: 'mock',
      baseUrl: '', apiKeyEnc: '', model: 'mock-llm-v1', temperature: 0.3, maxTokens: 800,
      isDefault: true, createdAt: nowIso(), updatedAt: nowIso(),
    });
  }
  async function ensureScript(tpl: any) {
    const ex = await db.findOne('scripts', { userId: uid, name: tpl.name });
    if (ex) return ex;
    return db.create('scripts', {
      _id: newId('script'), userId: uid, name: tpl.name, description: tpl.description,
      mode: tpl.mode, questions: tpl.questions.map((q: any, i: number) => ({ ...q, id: q.id || newId('q'), order: i })),
      createdAt: nowIso(), updatedAt: nowIso(),
    });
  }
  const interview: any = await ensureScript(interviewTemplate);
  const complaint: any = await ensureScript(complaintTemplate);
  if (!(await db.findOne('agents', { userId: uid, name: 'Frontend Developer Interviewer' }))) {
    const prov: any = await db.findOne('providers', { userId: uid });
    await db.create('agents', {
      _id: newId('agent'), userId: uid, name: 'Frontend Developer Interviewer',
      description: 'Screens frontend candidates over the phone', enabled: true,
      language: 'en', voice: 'alloy', personality: 'friendly, professional, encouraging interviewer',
      speakingStyle: 'natural conversational telephone speech, one question at a time',
      greeting: 'Hello! Thanks for taking the time to speak with me today. I have a few questions about your frontend experience. Shall we begin?',
      scriptId: interview._id, providerId: prov?._id, maxCallMinutes: 20, silenceTimeoutSec: 10,
      maxRetries: 2, allowFollowUps: true, allowBargeIn: true, recordingMode: 'segments',
      transcribe: true, takeNotes: true, createdAt: nowIso(), updatedAt: nowIso(),
    });
    await db.create('agents', {
      _id: newId('agent'), userId: uid, name: 'Customer Complaint Agent',
      description: 'Collects and triages customer complaints', enabled: true,
      language: 'en', voice: 'alloy', personality: 'empathetic, calm, solution-oriented support agent',
      speakingStyle: 'warm and reassuring, concise',
      greeting: 'Hello, you are speaking with VoxPilot AI. I\'m sorry you\'re having trouble — how may I help you today?',
      scriptId: complaint._id, providerId: prov?._id, maxCallMinutes: 15, silenceTimeoutSec: 10,
      maxRetries: 2, allowFollowUps: true, allowBargeIn: true, recordingMode: 'segments',
      transcribe: true, takeNotes: true, createdAt: nowIso(), updatedAt: nowIso(),
    });
    console.log('seeded agents + scripts');
  }
  await db.flush();
  console.log('seed complete');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
