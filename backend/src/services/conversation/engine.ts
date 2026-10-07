// Deterministic conversation state machine.
// The LLM NEVER controls workflow: current question, retries, transitions,
// termination and timeouts are decided here. The LLM only interprets language.
import { Agent, CallSession, Script, ScriptQuestion } from '../../db/types';
import { interpretAnswer } from './interpreter';

export type EngineAction =
  | { kind: 'ask'; question: ScriptQuestion; prefix?: string }
  | { kind: 'retry'; question: ScriptQuestion; reason: string }
  | { kind: 'clarify'; question: ScriptQuestion; clarification: string }
  | { kind: 'followup'; question: ScriptQuestion; followUp: string }
  | { kind: 'complete'; reason: string };

export interface EngineInput {
  agent: Agent; script: Script | null; session: CallSession;
  answerText: string; historyText: string;
}

export function orderedQuestions(script: Script | null): ScriptQuestion[] {
  if (!script) return [];
  return [...script.questions].sort((a, b) => a.order - b.order);
}

export function nextSequential(script: Script | null, currentId?: string, completed: string[] = []): ScriptQuestion | null {
  const qs = orderedQuestions(script);
  if (!qs.length) return null;
  if (!currentId) return qs.find(q => !completed.includes(q.id)) ?? null;
  const idx = qs.findIndex(q => q.id === currentId);
  for (let i = idx + 1; i < qs.length; i++) if (!completed.includes(qs[i].id)) return qs[i];
  return qs.find(q => q.required && !completed.includes(q.id)) ?? null; // revisit skipped required
}

export function resolveTransition(script: Script | null, q: ScriptQuestion, extractedValue: string, completed: string[]): ScriptQuestion | null {
  if (q.endAfter) return null;
  const val = (extractedValue || '').toLowerCase();
  for (const b of q.branches || []) {
    const m = b.match.toLowerCase();
    let hit = false;
    if (b.matchMode === 'equals') hit = val === m;
    else if (b.matchMode === 'contains') hit = val.includes(m);
    else { try { hit = new RegExp(b.match, 'i').test(val); } catch { hit = false; } }
    if (hit && script?.questions.find(x => x.id === b.nextQuestionId)) {
      return script!.questions.find(x => x.id === b.nextQuestionId)!;
    }
  }
  if (q.nextQuestionId && script?.questions.find(x => x.id === q.nextQuestionId)) {
    return script!.questions.find(x => x.id === q.nextQuestionId)!;
  }
  return nextSequential(script, q.id, completed);
}

function wantsHuman(answer: string): boolean {
  return /(human|real person|agent|operator|manager|supervisor|take over|call me back|speak to someone)/i.test(answer);
}
function wantsToEnd(answer: string, endPhrase?: string): boolean {
  if (endPhrase && answer.toLowerCase().includes(endPhrase.toLowerCase())) return true;
  return /^(bye|goodbye|that's all|that'?s it|no more questions|end (the )?call|hang ?up)\.?$/i.test(answer.trim());
}

export async function decideNext(input: EngineInput): Promise<{ action: EngineAction; interpretation: Awaited<ReturnType<typeof interpretAnswer>> }> {
  const { agent, script, session, answerText, historyText } = input;
  const qs = orderedQuestions(script);
  const current = qs.find(q => q.id === session.currentQuestionId);

  // No script or no current question → wrap up.
  if (!script || !qs.length) return { action: { kind: 'complete', reason: 'no-script' }, interpretation: null as any };
  if (!current) {
    const first = nextSequential(script, undefined, session.completedQuestionIds);
    if (!first) return { action: { kind: 'complete', reason: 'all-done' }, interpretation: null as any };
    return { action: { kind: 'ask', question: first }, interpretation: null as any };
  }

  // Caller intent overrides (deterministic).
  if (wantsToEnd(answerText, agent.endPhrase)) {
    return { action: { kind: 'complete', reason: 'caller-ended' }, interpretation: null as any };
  }
  if (wantsHuman(answerText)) {
    return { action: { kind: 'complete', reason: 'handover-requested' }, interpretation: null as any };
  }

  const retriesUsed = session.retriesUsed[current.id] ?? 0;
  const followUpsUsed = session.followUpsUsed[current.id] ?? 0;
  const interpretation = await interpretAnswer(session.userId, agent, script, current, answerText, historyText);

  // Insufficient answer → retry / clarify within limits.
  if (!interpretation.sufficient || interpretation.needsClarification) {
    const limit = Math.max(0, current.retryLimit ?? agent.maxRetries ?? 2);
    if (retriesUsed < limit) {
      if (interpretation.suggestedClarification) {
        return { action: { kind: 'clarify', question: current, clarification: interpretation.suggestedClarification }, interpretation };
      }
      return { action: { kind: 'retry', question: current, reason: 'insufficient' }, interpretation };
    }
    // Retry budget exhausted: skip if optional, else mark complete and move on.
    const next = resolveTransition(script, current, interpretation.extractedValue, [...session.completedQuestionIds, current.id]);
    if (!next) return { action: { kind: 'complete', reason: 'workflow-done' }, interpretation };
    return { action: { kind: 'ask', question: next, prefix: current.required ? 'Thanks — moving on. ' : undefined }, interpretation };
  }

  // Sufficient: optional single follow-up (only when explicitly allowed).
  const allowFu = current.followUpEnabled && agent.allowFollowUps && interpretation.followUpQuestion;
  const maxFu = Math.max(0, current.maxFollowUps ?? 1);
  if (allowFu && followUpsUsed < maxFu) {
    return { action: { kind: 'followup', question: current, followUp: interpretation.followUpQuestion }, interpretation };
  }

  // Advance.
  const next = resolveTransition(script, current, interpretation.extractedValue, [...session.completedQuestionIds, current.id]);
  if (!next) return { action: { kind: 'complete', reason: 'workflow-done' }, interpretation };
  return { action: { kind: 'ask', question: next }, interpretation };
}

export function closingLine(agent: Agent, reason: string): string {
  switch (reason) {
    case 'caller-ended': return 'Thanks for your time. Goodbye!';
    case 'handover-requested': return 'Of course — I\'m arranging for a human colleague to take over. Please stay on the line.';
    case 'max-duration': return 'We\'ve reached the maximum call length, so I\'ll wrap up here. Thank you!';
    default: return agent.endPhrase || 'Thank you — that completes all my questions. Have a great day!';
  }
}
