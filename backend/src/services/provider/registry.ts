// Central registry: resolves a user's AiProvider document to a working ILLMProvider adapter.
import { db } from '../../db/repository';
import { AiProvider } from '../../db/types';
import { ILLMProvider } from './types';
import { openRouterProvider, nvidiaProvider, openAICompatibleProvider, customProvider } from './openaiCompatible.provider';
import { mockLlmProvider } from './mockLlm.provider';
import { decryptSecret } from '../../utils/crypto';
import { logger } from '../../utils/logger';

const ADAPTERS: Record<string, ILLMProvider> = {
  openrouter: openRouterProvider, nvidia: nvidiaProvider,
  openai_compatible: openAICompatibleProvider, custom: customProvider, mock: mockLlmProvider,
};

export interface ResolvedLLM { adapter: ILLMProvider; provider: AiProvider; baseUrl: string; apiKey: string; model: string; temperature: number; maxTokens: number; }

export async function resolveLLM(userId: string, providerId?: string): Promise<ResolvedLLM> {
  let provider: AiProvider | null = null;
  if (providerId) provider = await db.findOne<AiProvider>('providers', { _id: providerId, userId });
  if (!provider) provider = await db.findOne<AiProvider>('providers', { userId, isDefault: true });
  if (!provider) {
    const all = await db.find<AiProvider>('providers', { userId }, { limit: 1 });
    provider = all[0] ?? null;
  }
  if (!provider) {
    // No provider configured at all → offline mock so the product still demos end-to-end.
    logger.info('no AI provider configured; using offline mock', { userId });
    return { adapter: mockLlmProvider, provider: { kind: 'mock' } as AiProvider, baseUrl: '', apiKey: '', model: 'mock-llm-v1', temperature: 0, maxTokens: 500 };
  }
  const adapter = ADAPTERS[provider.kind] ?? openAICompatibleProvider;
  let apiKey = '';
  try { apiKey = provider.apiKeyEnc ? decryptSecret(provider.apiKeyEnc) : ''; } catch { apiKey = ''; }
  return { adapter, provider, baseUrl: provider.baseUrl, apiKey, model: provider.model, temperature: provider.temperature, maxTokens: provider.maxTokens };
}

export function getAdapter(kind: string): ILLMProvider {
  return ADAPTERS[kind] ?? openAICompatibleProvider;
}
