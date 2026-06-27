export type TaskStatus =
  | 'pending'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export interface Task {
  id: string;
  runId: string;
  title: string;
  description: string;
  assignedAgentId: string | null;
  status: TaskStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
}

export interface CreateTaskInput {
  runId: string;
  title: string;
  description: string;
  assignedAgentId?: string | null;
  input?: Record<string, unknown> | null;
  maxAttempts?: number;
  status?: TaskStatus;
}
