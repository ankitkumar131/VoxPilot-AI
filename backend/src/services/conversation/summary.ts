// Post-call summarization + interview/complaint structured extraction.
import { db } from '../../db/repository';
import { Agent, CallSession, CallTurn, Script } from '../../db/types';
import { resolveLLM } from '../provider/registry';
import { summaryPrompt } from './prompts';
import { newId, nowIso } from '../../utils/ids';
import { logger } from '../../utils/logger';

function transcriptText(turns: CallTurn[]): string {
  return turns.map(t => `${t.speaker === 'ai' ? 'AI' : t.speaker === 'caller' ? 'Caller' : t.speaker}: ${t.text}`).join('\n');
}

export async function generateSummary(session: CallSession): Promise<void> {
  try {
    const [agent, script, turns] = await Promise.all([
      db.findOne<Agent>('agents', { _id: session.agentId }),
      session.scriptId ? db.findOne<Script>('scripts', { _id: session.scriptId }) : Promise.resolve(null),
      db.find<CallTurn>('turns', { callId: session._id }, { sort: 'index', dir: 1 }),
    ]);
    if (!agent) return;
    const keyAnswers = buildKeyAnswers(script, turns);
    const fallback = {
      shortSummary: `Call with ${session.callerName || 'caller'} — ${keyAnswers.length} question(s) answered.`,
      keyAnswers, entities: {}, actionItems: [] as string[], observations: [] as string[],
    };
    let payload: any = fallback;
    try {
      const llm = await resolveLLM(session.userId, agent.providerId);
      if (llm.adapter.id !== 'mock' && turns.length >= 2) {
        const res = await llm.adapter.chat(llm.baseUrl, llm.apiKey, [
          { role: 'system', content: 'Summarize phone calls. Reply only with JSON.' },
          { role: 'user', content: summaryPrompt(agent, script, transcriptText(turns)) },
        ], { model: llm.model, temperature: 0.2, maxTokens: 1200, jsonMode: true });
        const m = res.text.match(/\{[\s\S]*\}/);
        if (m) payload = { ...fallback, ...JSON.parse(m[0]) };
      } else if (script?.mode === 'complaint') {
        payload = { ...fallback, complaint: mockComplaint(transcriptText(turns)) };
      }
    } catch (e) {
      logger.warn('summary LLM failed, using fallback', { error: String(e).slice(0, 200) });
    }
    await db.create('summaries', {
      _id: newId('sum'), callId: session._id, userId: session.userId,
      shortSummary: payload.shortSummary, keyAnswers: payload.keyAnswers ?? keyAnswers,
      entities: payload.entities ?? {}, actionItems: payload.actionItems ?? [],
      observations: payload.observations ?? [],
      interview: payload.interview, complaint: payload.complaint, createdAt: nowIso(),
    });
  } catch (e) {
    logger.error('generateSummary failed', { error: String(e).slice(0, 300) });
  }
}

function buildKeyAnswers(script: Script | null, turns: CallTurn[]): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  const byQ = new Map<string, { q?: string; a?: string }>();
  for (const t of turns) {
    if (!t.questionId) continue;
    const e = byQ.get(t.questionId) || {};
    if (t.speaker === 'ai' && (t.kind === 'question' || t.kind === 'greeting')) e.q = t.text;
    if (t.speaker === 'caller' && t.kind === 'answer' && !e.a) e.a = t.text;
    byQ.set(t.questionId, e);
  }
  for (const [qid, e] of byQ) {
    const scriptQ = script?.questions.find(q => q.id === qid);
    if (e.a) out.push({ question: scriptQ?.text || e.q || qid, answer: e.a });
  }
  return out;
}

function mockComplaint(t: string) {
  const low = t.toLowerCase();
  return {
    category: /bill|payment|charge/.test(low) ? 'billing' : /internet|app|login|error/.test(low) ? 'technical' : 'general',
    severity: /urgent|angry|critical|emergency/.test(low) ? 'high' : 'medium',
    summary: t.slice(0, 300), callbackRequired: /call ?back|callback|reach me|contact me/.test(low),
  };
}
