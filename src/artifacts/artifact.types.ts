export type ArtifactType = 'markdown' | 'json' | 'text' | 'code' | 'report';

export interface Artifact {
  id: string;
  runId: string;
  taskId: string | null;
  createdByAgentId: string | null;
  name: string;
  type: ArtifactType;
  path: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateArtifactInput {
  runId: string;
  taskId?: string | null;
  createdByAgentId?: string | null;
  name: string;
  type: ArtifactType;
  content: string;
  metadata?: Record<string, unknown>;
}
