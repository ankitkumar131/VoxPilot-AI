// Deterministic mock LLM: rule-based interpretation so the full MVP works with no API key.
// Clearly labeled in UI as "Mock (offline)". Never used silently when a real provider is configured.
import { ChatMessage, ChatOptions, ChatResult, ILLMProvider } from './types';

function lastUser(messages: ChatMessage[]): string {
  const u = [...messages].reverse().find(m => m.role === 'user');
  return u?.content ?? '';
}

export const mockLlmProvider: ILLMProvider = {
  id: 'mock',
  async chat(_baseUrl, _apiKey, messages, opts: ChatOptions): Promise<ChatResult> {
    const text = lastUser(messages);
    // If asked for JSON interpretation, produce a heuristic interpretation payload.
    if (opts.jsonMode || /"sufficient"/.test(messages.map(m => m.content).join('\n'))) {
      const sufficient = text.trim().length >= 2 && !/^(what|huh|pardon|repeat|say again)\??$/i.test(text.trim());
      const needsClarification = /^(what|huh|pardon|repeat|say again|could you repeat)/i.test(text.trim());
      return {
        text: JSON.stringify({
          sufficient, needsClarification,
          extractedValue: text.trim().slice(0, 500),
          suggestedClarification: needsClarification ? 'Let me repeat the question more simply.' : '',
          category: guessCategory(text), severity: guessSeverity(text),
          sentiment: /thank|great|good|excellent/i.test(text) ? 'positive' : /bad|terrible|angry|worst|awful/i.test(text) ? 'negative' : 'neutral',
        }),
        model: 'mock-llm-v1',
      };
    }
    // Summaries / notes
    if (/summar/i.test(messages.map(m => m.content).join(' ').slice(0, 2000))) {
      return { text: JSON.stringify({ shortSummary: mockSummary(text), actionItems: [], observations: ['Mock summary — connect a real provider for AI summaries.'], entities: {} }), model: 'mock-llm-v1' };
    }
    return { text: `Understood — noted: "${text.slice(0, 140)}". Let's continue.`, model: 'mock-llm-v1' };
  },
  async testConnection() { return { ok: true, message: 'mock provider always ready (offline mode)', latencyMs: 1 }; },
};

function guessCategory(t: string): string {
  if (/bill|payment|charge|refund|invoice/i.test(t)) return 'billing';
  if (/internet|network|app|login|error|bug|crash|slow/i.test(t)) return 'technical';
  if (/deliver|ship|order|package/i.test(t)) return 'delivery';
  if (/staff|support|service|agent|rude/i.test(t)) return 'service';
  return 'general';
}
function guessSeverity(t: string): string {
  if (/urgent|immediately|asap|critical|emergency|angry|furious|lawsuit/i.test(t)) return 'high';
  if (/annoy|frustrat|disappoint|twice|again|still not/i.test(t)) return 'medium';
  return 'low';
}
function mockSummary(t: string): string {
  const s = t.replace(/\s+/g, ' ').trim().slice(0, 220);
  return s ? `Caller discussed: ${s}…` : 'Call completed with no substantive answers.';
}
