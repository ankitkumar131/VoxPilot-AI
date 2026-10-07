// Centralized LLM prompts. Deterministic engine owns workflow; LLM only interprets/generates language.
import { Agent, Script, ScriptQuestion } from '../../db/types';

export function systemPrompt(agent: Agent, script?: Script | null): string {
  return [
    `You are "${agent.name}", a professional AI phone agent for VoxPilot AI.`,
    `Personality: ${agent.personality || 'friendly, professional, concise'}.`,
    `Speaking style: ${agent.speakingStyle || 'natural conversational telephone speech, one question at a time'}.`,
    `Language: ${agent.language || 'en'}.`,
    script ? `You are following the script "${script.name}". Stay within it. Do not invent new topics unless follow-ups are explicitly allowed.` : 'Have a helpful conversation.',
    'Rules: be natural, never robotic. One question at a time. Never repeat completed questions.',
    'If the caller asks to speak to a human, acknowledge and say you will arrange a handover.',
  ].join('\n');
}

export function interpreterPrompt(q: ScriptQuestion, answer: string, history: string): string {
  return [
    'Interpret the caller\'s answer for a phone survey. Reply ONLY with JSON:',
    '{"sufficient": boolean, "needsClarification": boolean, "extractedValue": string, "suggestedClarification": string, "followUpQuestion": string, "category": string, "severity": string, "sentiment": string}',
    '',
    `Question (${q.type}): ${q.text}`,
    q.expectedAnswer ? `Expected answer hint: ${q.expectedAnswer}` : '',
    q.options?.length ? `Allowed options: ${q.options.join(' | ')}` : '',
    `Caller answer: """${answer.slice(0, 2000)}"""`,
    history ? `Recent context:\n${history.slice(-1500)}` : '',
    'Mark sufficient=true when the answer addresses the question even if phrased unexpectedly.',
    'needsClarification=true only when the answer is empty, off-topic, or ambiguous.',
    'followUpQuestion: a single natural follow-up, or "" if none is needed.',
  ].filter(Boolean).join('\n');
}

export function notePrompt(q: ScriptQuestion, answer: string): string {
  return [
    'Extract a structured note as JSON: {"summary": string, "entities": object, "keywords": string[]}.',
    `Question: ${q.text}`,
    `Answer: """${answer.slice(0, 2000)}"""`,
  ].join('\n');
}

export function summaryPrompt(agent: Agent, script: Script | null, transcript: string): string {
  return [
    'Summarize this phone call as JSON:',
    '{"shortSummary": string, "keyAnswers": [{"question": string, "answer": string}], "entities": object, "actionItems": string[], "observations": string[]' +
      (script?.mode === 'interview' ? ', "interview": {"strengths": string[], "weaknesses": string[], "technical": string[], "communication": string[], "assessment": string, "score": number}' : '') +
      (script?.mode === 'complaint' ? ', "complaint": {"category": string, "severity": string, "summary": string, "callbackRequired": boolean}' : '') + '}',
    `Agent: ${agent.name}. Script: ${script?.name || 'ad-hoc'}.`,
    'Transcript:',
    transcript.slice(-8000),
  ].join('\n');
}

export function ackPrompt(agent: Agent, callerSaid: string): string {
  return [
    `You are ${agent.name}. The caller just said: """${callerSaid.slice(0, 500)}"""`,
    'Write ONE short natural spoken acknowledgement (under 20 words) before the next scripted question. No question mark unless clarifying.',
  ].join('\n');
}
