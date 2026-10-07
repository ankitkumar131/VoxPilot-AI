// Provider abstractions: LLM / STT / TTS / Telephony / Storage.
// New vendors are added as adapters — core engines never import vendor SDKs directly.
export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface ChatOptions {
  model: string; temperature?: number; maxTokens?: number;
  jsonMode?: boolean; signal?: AbortSignal; headers?: Record<string, string>;
}
export interface ChatResult { text: string; model: string; usage?: { promptTokens?: number; completionTokens?: number }; }

export interface ILLMProvider {
  readonly id: string; // 'openrouter' | 'nvidia' | 'openai_compatible' | 'custom' | 'mock'
  chat(baseUrl: string, apiKey: string, messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult>;
  testConnection(baseUrl: string, apiKey: string, model: string): Promise<{ ok: boolean; message: string; latencyMs: number }>;
}

export interface ISTTProvider {
  readonly id: string;
  transcribe(audio: Buffer, mime: string, language?: string): Promise<{ text: string; confidence?: number }>;
}
export interface ITTSProvider {
  readonly id: string;
  synthesize(text: string, voice?: string, language?: string): Promise<{ audio: Buffer; mime: string }>;
}
export interface TelephonyCall { externalId: string; from: string; to: string; }
export interface ITelephonyProvider {
  readonly id: string; // 'mock' | 'sip' | 'twilio'
  placeCall(to: string, opts?: Record<string, unknown>): Promise<TelephonyCall>;
  hangup(externalId: string): Promise<void>;
  sendAudio(externalId: string, audio: Buffer, mime: string): Promise<void>;
}
export interface IStorageProvider {
  readonly id: string; // 'local' | 's3'
  put(key: string, data: Buffer, mime: string): Promise<{ key: string; bytes: number }>;
  get(key: string): Promise<{ data: Buffer; mime: string } | null>;
  delete(key: string): Promise<void>;
  getSignedUrl?(key: string, expiresSec: number): Promise<string>;
}
