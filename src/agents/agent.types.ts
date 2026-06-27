export type AgentExecutionStatus =
  | 'idle'
  | 'queued'
  | 'working'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'disabled';

export interface Agent {
  id: string;
  projectId: string;
  slug: string;
  name: string;
  description: string;
  role: string;
  instructions: string;
  model: string;
  provider: string;
  tools: string[];
  maxIterations: number;
  maxOutputTokens: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentInput {
  projectId: string;
  slug: string;
  name: string;
  description: string;
  role: string;
  instructions: string;
  model: string;
  provider: string;
  tools?: string[];
  maxIterations?: number;
  maxOutputTokens?: number;
  enabled?: boolean;
}
