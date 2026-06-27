export type MessageType =
  | 'instruction'
  | 'task_handoff'
  | 'result'
  | 'review'
  | 'correction'
  | 'system';

export interface Message {
  id: string;
  runId: string;
  taskId: string | null;
  fromAgentId: string | null;
  toAgentId: string | null;
  type: MessageType;
  content: string;
  createdAt: string;
}

export interface CreateMessageInput {
  runId: string;
  taskId?: string | null;
  fromAgentId?: string | null;
  toAgentId?: string | null;
  type: MessageType;
  content: string;
}
