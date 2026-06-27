export interface ModelCall {
  id: string;
  runId: string;
  taskId: string | null;
  agentId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  finishReason: string;
  durationMs: number;
  requestMetadata: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
  error: string | null;
  createdAt: string;
}

export interface CreateModelCallInput {
  runId: string;
  taskId?: string | null;
  agentId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  finishReason: string;
  durationMs: number;
  requestMetadata?: Record<string, unknown>;
  responseMetadata?: Record<string, unknown>;
  error?: string | null;
}
