export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Run {
  id: string;
  projectId: string;
  status: RunStatus;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  failureReason: string | null;
  maxModelCalls: number | null;
  maxCost: number | null;
  currentModelCalls: number;
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRunInput {
  projectId: string;
  maxModelCalls?: number | null;
  maxCost?: number | null;
}
