// Answer interpretation: LLM-first with deterministic fallback. Never throws.
import { Agent, Script, ScriptQuestion } from '../../db/types';
import { resolveLLM } from '../provider/registry';
import { interpreterPrompt, notePrompt } from './prompts';
import { validateAnswer } from './validators';
import { logger } from '../../utils/logger';

export interface Interpretation {
  sufficient: boolean; needsClarification: boolean;
  extractedValue: string; suggestedClarification: string;
  followUpQuestion: string; category?: string; severity?: string; sentiment?: string;
  via: 'llm' | 'rules';
}

function safeJson<T>(text: string, fallback: T): T {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? { ...fallback, ...JSON.parse(m[0]) } : fallback;
  } catch { return fallback; }
}

export async function interpretAnswer(userId: string, agent: Agent, script: Script | null, q: ScriptQuestion, answer: string, history: string, providerId?: string): Promise<Interpretation> {
  const validation = validateAnswer(q, answer);
  const fallback: Interpretation = {
    sufficient: validation.valid && answer.trim().length >= 2,
    needsClarification: !validation.valid,
    extractedValue: validation.normalized ?? answer.trim().slice(0, 500),
    suggestedClarification: validation.valid ? '' : `I didn't quite catch that — ${validation.reason || 'could you say it differently'}?`,
    followUpQuestion: '', via: 'rules',
  };
  // Fast path: strict types are decided deterministically.
  if (['yes_no', 'confirmation', 'number', 'rating', 'email', 'phone', 'date', 'multiple_choice'].includes(q.type)) {
    if (!validation.valid) return fallback;
    if (q.type !== 'multiple_choice' && !q.followUpEnabled) return { ...fallback, sufficient: true, via: 'rules' };
  }
  if (!answer.trim()) return fallback;

  try {
    const llm = await resolveLLM(userId, providerId || agent.providerId);
    const sys = `You are an answer interpreter for phone agent "${agent.name}". Reply only with JSON.`;
    const res = await llm.adapter.chat(llm.baseUrl, llm.apiKey, [
      { role: 'system', content: sys },
      { role: 'user', content: interpreterPrompt(q, answer, history) },
    ], { model: llm.model, temperature: 0.1, maxTokens: 400, jsonMode: true });
    const parsed = safeJson(res.text, { sufficient: fallback.sufficient, needsClarification: fallback.needsClarification, extractedValue: fallback.extractedValue, suggestedClarification: fallback.suggestedClarification, followUpQuestion: '' });
    return { ...parsed, via: llm.adapter.id === 'mock' ? 'rules' : 'llm' } as Interpretation;
  } catch (e) {
    logger.warn('LLM interpretation failed, using rules', { error: String(e).slice(0, 200) });
    return fallback;
  }
}

export async function extractNote(userId: string, agent: Agent, q: ScriptQuestion, answer: string): Promise<{ summary: string; entities: Record<string, unknown>; keywords: string[] }> {
  const fallback = { summary: `Q: ${q.text} — A: ${answer.slice(0, 300)}`, entities: {}, keywords: [] as string[] };
  try {
    const llm = await resolveLLM(userId, agent.providerId);
    if (llm.adapter.id === 'mock') {
      const entities: Record<string, unknown> = {};
      const yrs = answer.match(/(\d+)\s*(years?|yrs)/i);
      if (yrs) entities.years = parseInt(yrs[1], 10);
      return { summary: fallback.summary, entities, keywords: answer.toLowerCase().split(/[^a-z0-9+#]+/).filter(w => w.length > 3).slice(0, 8) };
    }
    const res = await llm.adapter.chat(llm.baseUrl, llm.apiKey, [
      { role: 'system', content: 'Extract structured notes. Reply only with JSON.' },
      { role: 'user', content: notePrompt(q, answer) },
    ], { model: llm.model, temperature: 0.1, maxTokens: 400, jsonMode: true });
    return safeJson(res.text, fallback);
  } catch {
    return fallback;
  }
}
