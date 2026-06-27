import {
  AuthenticationError,
  ConfigurationError,
  ProviderError,
  RateLimitError,
  TimeoutError,
} from '../shared/errors.js';
import type { ModelProvider, ModelRequest, ModelResponse } from './provider.interface.js';

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey: string;
  costPerInputToken?: number;
  costPerOutputToken?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAICompatibleProvider implements ModelProvider {
  readonly name = 'openai-compatible';

  constructor(private readonly options: OpenAICompatibleOptions) {}

  async validateConfiguration(): Promise<void> {
    if (!this.options.baseUrl) {
      throw new ConfigurationError('Provider base URL is required');
    }
    if (!this.options.apiKey) {
      throw new ConfigurationError('Provider API key is required');
    }
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const url = `${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const body = {
      model: request.model,
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: request.temperature ?? 0.2,
      ...(request.maxTokens !== undefined && { max_tokens: request.maxTokens }),
    };

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: request.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new TimeoutError('Request aborted');
      }
      throw new ProviderError(`Network error: ${(err as Error).message}`);
    }

    if (res.status === 401 || res.status === 403) {
      throw new AuthenticationError(`Authentication failed (${res.status})`);
    }
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      throw new RateLimitError(
        'Rate limited by provider',
        retryAfter ? Number(retryAfter) * 1000 : undefined
      );
    }
    if (!res.ok) {
      throw new ProviderError(`Provider returned status ${res.status}`);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? '';
    if (!content) {
      throw new ProviderError('Provider returned empty content');
    }
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    return {
      content,
      inputTokens,
      outputTokens,
      estimatedCost:
        inputTokens * (this.options.costPerInputToken ?? 0) +
        outputTokens * (this.options.costPerOutputToken ?? 0),
      finishReason: choice?.finish_reason ?? 'stop',
      providerMetadata: { provider: this.name, model: request.model },
    };
  }
}
