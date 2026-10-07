// Generic OpenAI-compatible chat-completions adapter.
// Powers: OpenRouter, NVIDIA NIM, custom/self-hosted endpoints (vLLM, Ollama, LM Studio...).
import { ChatMessage, ChatOptions, ChatResult, ILLMProvider } from './types';

async function post(baseUrl: string, apiKey: string, path: string, body: unknown, headers: Record<string, string>, timeoutMs = 60_000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = baseUrl.replace(/\/$/, '') + path;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.error?.message || (data as any)?.message || `provider HTTP ${res.status}`);
    return data;
  } finally { clearTimeout(t); }
}

export function makeOpenAICompatible(id: string, defaultHeaders: Record<string, string> = {}): ILLMProvider {
  return {
    id,
    async chat(baseUrl, apiKey, messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
      const body: Record<string, unknown> = {
        model: opts.model, messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 800,
      };
      if (opts.jsonMode) (body as any).response_format = { type: 'json_object' };
      const data = await post(baseUrl, apiKey, '/chat/completions', body, { ...defaultHeaders, ...(opts.headers || {}) });
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('empty completion from provider');
      return {
        text: typeof text === 'string' ? text : JSON.stringify(text),
        model: data?.model || opts.model,
        usage: { promptTokens: data?.usage?.prompt_tokens, completionTokens: data?.usage?.completion_tokens },
      };
    },
    async testConnection(baseUrl, apiKey, model) {
      const start = Date.now();
      try {
        await this.chat(baseUrl, apiKey, [{ role: 'user', content: 'Reply with the single word: ok' }], { model, temperature: 0, maxTokens: 8 });
        return { ok: true, message: 'connection successful', latencyMs: Date.now() - start };
      } catch (e) {
        return { ok: false, message: String((e as Error).message).slice(0, 300), latencyMs: Date.now() - start };
      }
    },
  };
}

export const openRouterProvider: ILLMProvider = makeOpenAICompatible('openrouter', {
  'HTTP-Referer': 'https://voxpilot.ai', 'X-Title': 'VoxPilot AI',
});
export const nvidiaProvider: ILLMProvider = makeOpenAICompatible('nvidia');
export const openAICompatibleProvider: ILLMProvider = makeOpenAICompatible('openai_compatible');
export const customProvider: ILLMProvider = makeOpenAICompatible('custom');
