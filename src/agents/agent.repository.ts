import { eq, and } from 'drizzle-orm';
import { getDb } from '../storage/database.js';
import { agents } from '../storage/schema.js';
import { createId, nowIso, parseJson } from '../shared/util.js';
import { getProject } from '../projects/project.repository.js';
import { ConfigurationError, ValidationError } from '../shared/errors.js';
import type { Agent, CreateAgentInput } from './agent.types.js';

type AgentRow = typeof agents.$inferSelect;

function toAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    projectId: row.projectId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    role: row.role,
    instructions: row.instructions,
    model: row.model,
    provider: row.provider,
    tools: parseJson<string[]>(row.tools, []),
    maxIterations: row.maxIterations,
    maxOutputTokens: row.maxOutputTokens,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createAgent(input: CreateAgentInput): Agent {
  if (input.projectId.trim() === '') {
    throw new ValidationError('Agent projectId is required');
  }
  if (!getProject(input.projectId)) {
    throw new ConfigurationError(`Project not found: ${input.projectId}`);
  }
  const db = getDb();
  const now = nowIso();
  const row: AgentRow = {
    id: createId('agent'),
    projectId: input.projectId,
    slug: input.slug,
    name: input.name,
    description: input.description,
    role: input.role,
    instructions: input.instructions,
    model: input.model,
    provider: input.provider,
    tools: JSON.stringify(input.tools ?? []),
    maxIterations: input.maxIterations ?? 3,
    maxOutputTokens: input.maxOutputTokens ?? 2000,
    enabled: input.enabled ?? true,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(agents).values(row).run();
  return toAgent(row);
}

export function getAgent(id: string): Agent | null {
  const db = getDb();
  const row = db.select().from(agents).where(eq(agents.id, id)).get();
  return row ? toAgent(row) : null;
}

export function listAgentsForProject(projectId: string): Agent[] {
  const db = getDb();
  return db.select().from(agents).where(eq(agents.projectId, projectId)).all().map(toAgent);
}

export function listAllAgents(): Agent[] {
  const db = getDb();
  return db.select().from(agents).all().map(toAgent);
}

export function getAgentBySlugForProject(projectId: string, slug: string): Agent | null {
  const db = getDb();
  const row = db
    .select()
    .from(agents)
    .where(and(eq(agents.projectId, projectId), eq(agents.slug, slug)))
    .get();
  return row ? toAgent(row) : null;
}

export function getAgentByRoleForProject(projectId: string, role: string): Agent | null {
  const db = getDb();
  const row = db
    .select()
    .from(agents)
    .where(and(eq(agents.projectId, projectId), eq(agents.role, role)))
    .get();
  return row ? toAgent(row) : null;
}
