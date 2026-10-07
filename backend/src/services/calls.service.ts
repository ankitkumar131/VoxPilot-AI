// Call orchestration: owns session lifecycle, recording, TTS, notes, events.
// Simulated calls (browser/MVP) and telephony calls share this path — only the
// audio transport differs (WebSocket chunks vs RTP stream).
import { db } from '../db/repository';
import { Agent, CallSession, CallTurn, RecordingMode, Script, ScriptQuestion } from '../db/types';
import { newId, nowIso } from '../utils/ids';
import { decideNext, orderedQuestions, closingLine } from './conversation/engine';
import { extractNote } from './conversation/interpreter';
import { generateSummary } from './conversation/summary';
import { mockTts } from './voice/tts';
import { safePut, activeStorage } from './storage';
import { emitToCall, emitToUser } from '../realtime/socket';
import { logger } from '../utils/logger';

let turnCounter = 0;

async function addTurn(callId: string, userId: string, t: Partial<CallTurn> & { speaker: CallTurn['speaker']; text: string }): Promise<CallTurn> {
  const existing = await db.count('turns', { callId });
  return db.create<CallTurn>('turns', {
    _id: newId('turn'), callId, userId, index: existing + (++turnCounter % 1000) / 1000 + existing * 0, // unique-ish ordering guard
    kind: 'system', timestamp: nowIso(), ...t,
  } as CallTurn);
}

async function speakAndStore(session: CallSession, agent: Agent, text: string, kind: CallTurn['kind'], questionId?: string): Promise<CallTurn> {
  const turn = await addTurn(session._id, session.userId, { speaker: 'ai', kind, questionId, text });
  // TTS (mock offline / real adapter later) — never blocks the conversation on failure.
  try {
    const { audio, mime } = await mockTts.synthesize(text, agent.voice, agent.language);
    const mode: RecordingMode = agent.recordingMode || 'segments';
    if (mode === 'full' || mode === 'segments') {
      const key = `${session.userId}/${session._id}/${turn._id}.wav`;
      await safePut(key, audio, mime);
      const clip = await db.create('clips', {
        _id: newId('clip'), callId: session._id, userId: session.userId, turnId: turn._id,
        questionId, kind: 'ai_question', storage: activeStorage().id, key, mime, bytes: audio.length,
        durationSec: Math.round(audio.length / 32000), createdAt: nowIso(),
      });
      await db.updateOne('turns', { _id: turn._id }, { audioClipId: (clip as any)._id });
      (turn as any).audioClipId = (clip as any)._id;
    }
  } catch (e) {
    logger.warn('TTS/record failed (non-fatal)', { error: String(e).slice(0, 200) });
  }
  emitToCall(session._id, 'transcript-turn', turn);
  return turn;
}

export async function startCall(userId: string, opts: { agentId: string; callerName?: string; callerPhone?: string; direction?: CallSession['direction'] }): Promise<{ session: CallSession; greeting: CallTurn; firstQuestion: CallTurn | null }> {
  const agent = await db.findOne<Agent>('agents', { _id: opts.agentId, userId });
  if (!agent) throw Object.assign(new Error('agent not found'), { status: 404 });
  if (!agent.enabled) throw Object.assign(new Error('agent is disabled'), { status: 400 });
  const settings = await db.findOne('settings', { userId });
  if (settings && (settings as any).aiEnabled === false) throw Object.assign(new Error('AI is disabled globally'), { status: 400 });

  const script = agent.scriptId ? await db.findOne<Script>('scripts', { _id: agent.scriptId }) : null;
  const first = script ? orderedQuestions(script)[0] : undefined;

  const session = await db.create<CallSession>('calls', {
    _id: newId('call'), userId, agentId: agent._id, scriptId: agent.scriptId,
    callerName: opts.callerName, callerPhone: opts.callerPhone, direction: opts.direction || 'simulated',
    status: 'active', mode: 'ai', currentQuestionId: first?.id,
    completedQuestionIds: [], retriesUsed: {}, followUpsUsed: {},
    startedAt: nowIso(), paused: false, aiEnabled: true, createdAt: nowIso(), updatedAt: nowIso(),
  } as CallSession);

  emitToUser(userId, 'call-started', session);
  emitToCall(session._id, 'call-status', session);

  const greeting = await speakAndStore(session, agent, agent.greeting || `Hello, this is ${agent.name}.`, 'greeting');
  let firstQuestion: CallTurn | null = null;
  if (first) firstQuestion = await speakAndStore(session, agent, first.text, 'question', first.id);
  await db.updateOne('calls', { _id: session._id }, { updatedAt: nowIso() });
  return { session, greeting, firstQuestion };
}

export async function submitAnswer(userId: string, callId: string, input: { text: string; audioBase64?: string; audioMime?: string; bargeIn?: boolean }): Promise<{ callerTurn: CallTurn; aiTurns: CallTurn[]; session: CallSession; done: boolean }> {
  const session = await db.findOne<CallSession>('calls', { _id: callId, userId });
  if (!session) throw Object.assign(new Error('call not found'), { status: 404 });
  if (['completed', 'failed', 'terminated'].includes(session.status)) throw Object.assign(new Error('call already ended'), { status: 400 });
  const agent = await db.findOne<Agent>('agents', { _id: session.agentId });
  if (!agent) throw Object.assign(new Error('agent not found'), { status: 404 });

  // Human takeover mode: just transcribe, no AI replies.
  if (session.mode === 'human' || session.status === 'human_takeover') {
    const t = await addTurn(callId, userId, { speaker: session.mode === 'human' ? 'caller' : 'caller', kind: 'answer', questionId: session.currentQuestionId, text: input.text });
    emitToCall(callId, 'transcript-turn', t);
    return { callerTurn: t, aiTurns: [], session, done: false };
  }
  if (session.paused) throw Object.assign(new Error('call is paused'), { status: 400 });

  const text = (input.text || '').trim();
  if (!text && !input.audioBase64) throw Object.assign(new Error('empty answer'), { status: 400 });

  const callerTurn = await addTurn(callId, userId, {
    speaker: 'caller', kind: 'answer', questionId: session.currentQuestionId,
    text: text || '(audio answer)', bargeIn: !!input.bargeIn,
  });

  // Persist caller audio when provided.
  try {
    const mode = agent.recordingMode || 'segments';
    if (input.audioBase64 && mode !== 'transcript_only' && mode !== 'notes_only') {
      const buf = Buffer.from(input.audioBase64, 'base64');
      const key = `${userId}/${callId}/${callerTurn._id}.webm`;
      await safePut(key, buf, input.audioMime || 'audio/webm');
      const clip: any = await db.create('clips', {
        _id: newId('clip'), callId, userId, turnId: callerTurn._id, questionId: session.currentQuestionId,
        kind: 'caller_answer', storage: activeStorage().id, key, mime: input.audioMime || 'audio/webm', bytes: buf.length, createdAt: nowIso(),
      });
      await db.updateOne('turns', { _id: callerTurn._id }, { audioClipId: clip._id });
    }
  } catch (e) { logger.warn('caller audio persist failed (non-fatal)', { error: String(e).slice(0, 200) }); }
  emitToCall(callId, 'transcript-turn', callerTurn);

  const script = session.scriptId ? await db.findOne<Script>('scripts', { _id: session.scriptId }) : null;
  const turns = await db.find<CallTurn>('turns', { callId }, { sort: 'timestamp', dir: 1, limit: 200 });
  const history = turns.slice(-8).map(t => `${t.speaker}: ${t.text}`).join('\n');

  const { action, interpretation } = await decideNext({ agent, script, session, answerText: text, historyText: history });
  const aiTurns: CallTurn[] = [];
  const patch: Partial<CallSession> = { updatedAt: nowIso() };

  // Structured note for the answered question (async, non-blocking).
  const currentQ: ScriptQuestion | undefined = script?.questions.find(q => q.id === session.currentQuestionId);
  if (currentQ && agent.takeNotes && text) {
    extractNote(userId, agent, currentQ, text).then(async note => {
      await db.create('notes', {
        _id: newId('note'), callId, userId, questionId: currentQ.id,
        data: { question: currentQ.text, answer: text.slice(0, 1000), ...note.entities, via: interpretation?.via },
        text: note.summary, createdAt: nowIso(),
      });
      emitToCall(callId, 'notes-updated', { questionId: currentQ.id });
    }).catch(() => {});
  }

  switch (action.kind) {
    case 'ask': {
      patch.completedQuestionIds = [...session.completedQuestionIds, session.currentQuestionId!].filter(Boolean);
      patch.currentQuestionId = action.question.id;
      await db.updateOne('calls', { _id: callId }, patch);
      const prefix = action.prefix || (await ackFor(agent, userId, text));
      const spoken = prefix ? `${prefix} ${action.question.text}` : action.question.text;
      aiTurns.push(await speakAndStore({ ...session, ...patch } as CallSession, agent, spoken, 'question', action.question.id));
      emitToCall(callId, 'current-question', action.question);
      break;
    }
    case 'retry': {
      patch.retriesUsed = { ...session.retriesUsed, [action.question.id]: (session.retriesUsed[action.question.id] ?? 0) + 1 };
      await db.updateOne('calls', { _id: callId }, patch);
      aiTurns.push(await speakAndStore(session, agent, `Sorry, ${action.question.text}`, 'clarification', action.question.id));
      break;
    }
    case 'clarify': {
      patch.retriesUsed = { ...session.retriesUsed, [action.question.id]: (session.retriesUsed[action.question.id] ?? 0) + 1 };
      await db.updateOne('calls', { _id: callId }, patch);
      aiTurns.push(await speakAndStore(session, agent, action.clarification, 'clarification', action.question.id));
      break;
    }
    case 'followup': {
      patch.followUpsUsed = { ...session.followUpsUsed, [action.question.id]: (session.followUpsUsed[action.question.id] ?? 0) + 1 };
      await db.updateOne('calls', { _id: callId }, patch);
      aiTurns.push(await speakAndStore(session, agent, action.followUp, 'followup', action.question.id));
      // follow-up answer will arrive next; keep current question.
      break;
    }
    case 'complete': {
      patch.completedQuestionIds = currentQ ? [...session.completedQuestionIds, currentQ.id] : session.completedQuestionIds;
      await db.updateOne('calls', { _id: callId }, patch);
      aiTurns.push(await speakAndStore({ ...session, ...patch } as CallSession, agent, closingLine(agent, action.reason), 'system'));
      await endCall(userId, callId, action.reason === 'handover-requested' ? 'human_takeover' : 'completed');
      break;
    }
  }

  const updated = (await db.findOne<CallSession>('calls', { _id: callId }))!;
  emitToCall(callId, 'call-status', updated);
  return { callerTurn, aiTurns, session: updated, done: action.kind === 'complete' };
}

async function ackFor(agent: Agent, userId: string, callerSaid: string): Promise<string> {
  // Short natural bridge; LLM-backed when a real provider exists, else rotating canned acks.
  try {
    const { resolveLLM } = await import('./provider/registry');
    const { ackPrompt } = await import('./conversation/prompts');
    const llm = await resolveLLM(userId, agent.providerId);
    if (llm.adapter.id !== 'mock' && callerSaid.length > 1) {
      const r = await llm.adapter.chat(llm.baseUrl, llm.apiKey, [{ role: 'user', content: ackPrompt(agent, callerSaid) }], { model: llm.model, temperature: 0.6, maxTokens: 40 });
      return r.text.trim().slice(0, 120);
    }
  } catch { /* fall through */ }
  const canned = ['Got it.', 'Thanks.', 'Understood.', 'Noted.'];
  return canned[Math.floor(Math.random() * canned.length)];
}

export async function endCall(userId: string, callId: string, status: CallSession['status'] = 'completed'): Promise<CallSession> {
  const session = await db.findOne<CallSession>('calls', { _id: callId, userId });
  if (!session) throw Object.assign(new Error('call not found'), { status: 404 });
  const endedAt = nowIso();
  const durationSec = Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000));
  const updated = (await db.updateOne<CallSession>('calls', { _id: callId }, { status, endedAt, durationSec, updatedAt: endedAt }))!;
  emitToCall(callId, 'call-status', updated);
  emitToUser(userId, 'call-ended', updated);
  // Summary generation is async and failure-isolated.
  generateSummary(updated).then(() => emitToCall(callId, 'summary-ready', { callId })).catch(() => {});
  return updated;
}

export async function setPaused(userId: string, callId: string, paused: boolean): Promise<CallSession> {
  const s = await db.findOne<CallSession>('calls', { _id: callId, userId });
  if (!s) throw Object.assign(new Error('call not found'), { status: 404 });
  const updated = (await db.updateOne<CallSession>('calls', { _id: callId }, { paused, status: paused ? 'paused' : 'active', updatedAt: nowIso() }))!;
  emitToCall(callId, 'call-status', updated);
  return updated;
}

export async function takeover(userId: string, callId: string, mode: 'human' | 'ai'): Promise<CallSession> {
  const s = await db.findOne<CallSession>('calls', { _id: callId, userId });
  if (!s) throw Object.assign(new Error('call not found'), { status: 404 });
  const updated = (await db.updateOne<CallSession>(
    'calls', { _id: callId },
    mode === 'human' ? { mode: 'human', status: 'human_takeover', updatedAt: nowIso() } : { mode: 'ai', status: 'active', updatedAt: nowIso() },
  ))!;
  await addTurn(callId, userId, { speaker: 'system', kind: 'system', text: mode === 'human' ? 'Human took over the call.' : 'AI resumed the call.' });
  emitToCall(callId, 'call-status', updated);
  return updated;
}
