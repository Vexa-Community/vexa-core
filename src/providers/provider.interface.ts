import type { ZodType } from 'zod';

export interface ModelMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ModelRequest {
  model: string;
  systemPrompt: string;
  messages: ModelMessage[];
  temperature?: number;
  maxTokens?: number;
  responseSchema?: ZodType;
  metadata?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ModelResponse {
  content: string;
  structuredOutput?: unknown;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  finishReason: string;
  providerMetadata: Record<string, unknown>;
}

export interface ModelStreamChunk {
  delta: string;
  done: boolean;
}

export interface ModelProvider {
  readonly name: string;
  validateConfiguration(): Promise<void>;
  generate(request: ModelRequest): Promise<ModelResponse>;
  stream?(request: ModelRequest): AsyncIterable<ModelStreamChunk>;
}
