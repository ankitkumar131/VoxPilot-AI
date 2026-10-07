// VoxPilot AI shared frontend models (mirror backend db/types.ts)
export interface User { id: string; email: string; name: string; role?: string }
export interface AuthResponse { access: string; refresh: string; user: User }

export type QuestionType = 'open_ended'|'yes_no'|'multiple_choice'|'number'|'rating'|'date'|'email'|'phone'|'confirmation'|'custom';
export interface BranchRule { match: string; matchMode: 'equals'|'contains'|'regex'; nextQuestionId: string; label?: string }
export interface ScriptQuestion {
  id: string; order: number; text: string; type: QuestionType;
  required: boolean; retryLimit: number; timeoutSec: number;
  followUpEnabled: boolean; maxFollowUps: number;
  validation?: string; expectedAnswer?: string; options?: string[];
  min?: number; max?: number; nextQuestionId?: string; branches?: BranchRule[]; endAfter?: boolean;
}
export interface ScriptDoc { _id: string; name: string; description?: string; mode: string; questions: ScriptQuestion[]; updatedAt: string }
export type RecordingMode = 'full'|'segments'|'answers_only'|'transcript_only'|'notes_only';
export interface Agent {
  _id: string; name: string; description?: string; enabled: boolean;
  language: string; voice: string; personality: string; speakingStyle: string; greeting: string;
  scriptId?: string; providerId?: string; modelOverride?: string;
  maxCallMinutes: number; silenceTimeoutSec: number; maxRetries: number;
  allowFollowUps: boolean; allowBargeIn: boolean; recordingMode: RecordingMode;
  transcribe: boolean; takeNotes: boolean; endPhrase?: string; updatedAt: string;
}
export interface AiProvider {
  _id: string; name: string; kind: 'openrouter'|'nvidia'|'openai_compatible'|'custom'|'mock';
  baseUrl: string; model: string; temperature: number; maxTokens: number;
  isDefault: boolean; apiKeySet: boolean; apiKeyMasked: string;
  lastTestedAt?: string; lastTestOk?: boolean;
}
export type CallStatus = 'ringing'|'active'|'paused'|'human_takeover'|'completed'|'failed'|'terminated';
export interface CallSession {
  _id: string; agentId: string; agentName?: string; scriptId?: string;
  callerName?: string; callerPhone?: string; direction: string;
  status: CallStatus; mode: 'ai'|'human'; currentQuestionId?: string;
  completedQuestionIds: string[]; startedAt: string; endedAt?: string; durationSec?: number;
  paused: boolean;
}
export interface CallTurn {
  _id: string; callId: string; index: number; speaker: 'ai'|'caller'|'human_agent'|'system';
  kind: string; questionId?: string; text: string; audioClipId?: string; bargeIn?: boolean; timestamp: string;
}
export interface RecordingClip { _id: string; callId: string; questionId?: string; kind: string; mime: string; bytes: number; durationSec?: number; turnId?: string }
export interface Note { _id: string; questionId?: string; text: string; data: Record<string, unknown> }
export interface CallSummary {
  shortSummary: string; keyAnswers: { question: string; answer: string }[];
  entities: Record<string, unknown>; actionItems: string[]; observations: string[];
  interview?: { strengths: string[]; weaknesses: string[]; technical: string[]; communication: string[]; assessment: string; score?: number };
  complaint?: { category?: string; severity?: string; summary?: string; callbackRequired?: boolean };
}
export interface CallDetail { call: CallSession; turns: CallTurn[]; notes: Note[]; clips: RecordingClip[]; summary: CallSummary | null; agent: Agent | null; script: ScriptDoc | null }
export interface DashboardStats {
  aiEnabled: boolean; totalCalls: number; totalAgents: number; totalScripts: number; totalRecordings: number;
  activeCalls: CallSession[]; recentCalls: CallSession[];
}
export interface UserSettings {
  aiEnabled: boolean; telephonyProvider: string; language: string; voice: string;
  recordingMode: RecordingMode; retentionDays: number; autoDelete: boolean;
  notifications: { email: boolean; push: boolean; callCompleted: boolean };
  privacy: { storeAudio: boolean; storeTranscript: boolean };
}
export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'open_ended', label: 'Open ended' }, { value: 'yes_no', label: 'Yes / No' },
  { value: 'multiple_choice', label: 'Multiple choice' }, { value: 'number', label: 'Number' },
  { value: 'rating', label: 'Rating' }, { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone number' },
  { value: 'confirmation', label: 'Confirmation' }, { value: 'custom', label: 'Custom' },
];
