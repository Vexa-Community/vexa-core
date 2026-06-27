export type VexaEventType =
  | 'project.created'
  | 'run.queued'
  | 'run.started'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled'
  | 'task.created'
  | 'task.ready'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.retrying'
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'model.requested'
  | 'model.completed'
  | 'model.failed'
  | 'artifact.created';

export interface VexaEvent {
  id: string;
  projectId: string | null;
  runId: string | null;
  taskId: string | null;
  agentId: string | null;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CreateEventInput {
  projectId?: string | null;
  runId?: string | null;
  taskId?: string | null;
  agentId?: string | null;
  type: VexaEventType | string;
  payload?: Record<string, unknown>;
}
