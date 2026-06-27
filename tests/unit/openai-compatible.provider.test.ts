import { describe, it, expect, vi, afterEach } from 'vitest';
import { OpenAICompatibleProvider } from '../../src/providers/openai-compatible.provider.js';
import { ProviderError, RateLimitError } from '../../src/shared/errors.js';
import type { ModelRequest } from '../../src/providers/provider.interface.js';

const request: ModelRequest = {
  model: 'missing-model',
  systemPrompt: 'system',
  messages: [{ role: 'user', content: 'hello' }],
};

describe('OpenAI-compatible provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('turns network loss into an understandable provider error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.local')));
    const provider = new OpenAICompatibleProvider({ baseUrl: 'https://api.local', apiKey: 'sk-test' });

    await expect(provider.generate(request)).rejects.toThrow(/Network error/);
  });

  it('reports unavailable models without leaking the API key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 404, statusText: 'Not Found' }))
    );
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.local',
      apiKey: 'sk-1234567890',
    });

    await expect(provider.generate(request)).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.generate(request)).rejects.not.toThrow(/sk-1234567890/);
  });

  it('maps provider rate limits to retryable rate-limit errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('{}', { status: 429, headers: { 'retry-after': '2' } })
      )
    );
    const provider = new OpenAICompatibleProvider({ baseUrl: 'https://api.local', apiKey: 'sk-test' });

    await expect(provider.generate(request)).rejects.toBeInstanceOf(RateLimitError);
    await expect(provider.generate(request)).rejects.toMatchObject({ retryAfterMs: 2000 });
  });
});
