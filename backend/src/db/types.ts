// VoxPilot AI - database entity types (shared shape for Mongo + memory store)
export type Id = string;

export interface User {
  _id: Id; email: string; passwordHash: string; name: string;
  role: 'owner' | 'admin' | 'member';
  refreshTokens: string[]; // sha256 hashes
  createdAt: string; updatedAt: string;
}

export type QuestionType =
  | 'open_ended' | 'yes_no' | 'multiple_choice' | 'number' | 'rating'
  | 'date' | 'email' | 'phone' | 'confirmation' | 'custom';

export interface BranchRule { match: string; matchMode: 'equals' | 'contains' | 'regex'; nextQuestionId: string; label?: string; }
export interface ScriptQuestion {
  id: string; order: number; text: string; type: QuestionType;
  required: boolean; retryLimit: number; timeoutSec: number;
  followUpEnabled: boolean; maxFollowUps: number;
  validation?: string; // regex
  expectedAnswer?: string;
  options?: string[]; // multiple_choice
  min?: number; max?: number; // number/rating
  nextQuestionId?: string; // default transition (else sequential)
  branches?: BranchRule[];
  endAfter?: boolean; // terminate call after this question
}

export interface Script {
  _id: Id; userId: Id; name: string; description?: string;
  mode: 'general' | 'interview' | 'complaint' | 'survey' | 'receptionist' | 'lead' | 'support' | 'feedback';
  questions: ScriptQuestion[];
  createdAt: string; updatedAt: string;
}

export type ProviderKind = 'openrouter' | 'nvidia' | 'openai_compatible' | 'custom' | 'mock';
export interface AiProvider {
  _id: Id; userId: Id; name: string; kind: ProviderKind;
  baseUrl: string; apiKeyEnc: string; // AES-256-GCM, never sent to clients
  model: string; temperature: number; maxTokens: number;
  extraHeaders?: Record<string, string>;
  isDefault: boolean; lastTestedAt?: string; lastTestOk?: boolean;
  createdAt: string; updatedAt: string;
}

export type RecordingMode = 'full' | 'segments' | 'answers_only' | 'transcript_only' | 'notes_only';
export interface Agent {
  _id: Id; userId: Id; name: string; description?: string;
  enabled: boolean; language: string; voice: string;
  personality: string; speakingStyle: string; greeting: string;
  scriptId?: Id; providerId?: Id; modelOverride?: string;
  maxCallMinutes: number; silenceTimeoutSec: number; maxRetries: number;
  allowFollowUps: boolean; allowBargeIn: boolean;
  recordingMode: RecordingMode; transcribe: boolean; takeNotes: boolean;
  endPhrase?: string;
  createdAt: string; updatedAt: string;
}

export type CallStatus = 'ringing' | 'active' | 'paused' | 'human_takeover' | 'completed' | 'failed' | 'terminated';
export interface CallSession {
  _id: Id; userId: Id; agentId: Id; scriptId?: Id;
  callerName?: string; callerPhone?: string; direction: 'inbound' | 'outbound' | 'simulated';
  status: CallStatus; mode: 'ai' | 'human';
  currentQuestionId?: string;
  completedQuestionIds: string[];
  retriesUsed: Record<string, number>;
  followUpsUsed: Record<string, number>;
  startedAt: string; endedAt?: string; durationSec?: number;
  paused: boolean; aiEnabled: boolean;
  telephony?: { provider: string; externalId?: string };
  createdAt: string; updatedAt: string;
}

export interface CallTurn {
  _id: Id; callId: Id; userId: Id; index: number;
  speaker: 'ai' | 'caller' | 'human_agent' | 'system';
  kind: 'greeting' | 'question' | 'answer' | 'followup' | 'clarification' | 'note' | 'system';
  questionId?: string; text: string;
  audioClipId?: Id; bargeIn?: boolean;
  timestamp: string;
}

export interface RecordingClip {
  _id: Id; callId: Id; userId: Id; turnId?: Id; questionId?: string;
  kind: 'ai_question' | 'caller_answer' | 'full_call' | 'human';
  storage: 'local' | 's3'; key: string; mime: string; bytes: number;
  durationSec?: number; createdAt: string;
}

export interface Note { _id: Id; callId: Id; userId: Id; questionId?: string; data: Record<string, unknown>; text: string; createdAt: string; }
export interface CallSummary {
  _id: Id; callId: Id; userId: Id;
  shortSummary: string; keyAnswers: { question: string; answer: string }[];
  entities: Record<string, unknown>; actionItems: string[]; observations: string[];
  interview?: { strengths: string[]; weaknesses: string[]; technical: string[]; communication: string[]; assessment: string; score?: number };
  complaint?: { category?: string; severity?: string; summary?: string; callbackRequired?: boolean };
  createdAt: string;
}

export interface Webhook { _id: Id; userId: Id; url: string; events: string[]; secretEnc: string; enabled: boolean; createdAt: string; }
export interface AuditLog { _id: Id; userId?: Id; action: string; entity?: string; entityId?: string; meta?: Record<string, unknown>; ip?: string; createdAt: string; }
export interface UserSettings {
  _id: Id; userId: Id; aiEnabled: boolean;
  telephonyProvider: 'mock' | 'sip' | 'twilio'; telephonyConfig?: Record<string, unknown>;
  language: string; voice: string; recordingMode: RecordingMode;
  retentionDays: number; autoDelete: boolean;
  notifications: { email: boolean; push: boolean; callCompleted: boolean };
  privacy: { storeAudio: boolean; storeTranscript: boolean };
  updatedAt: string;
}

export type CollectionName =
  | 'users' | 'agents' | 'scripts' | 'providers' | 'calls' | 'turns'
  | 'clips' | 'notes' | 'summaries' | 'webhooks' | 'audit_logs' | 'settings';
