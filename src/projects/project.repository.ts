import { eq } from 'drizzle-orm';
import { getDb } from '../storage/database.js';
import { projects } from '../storage/schema.js';
import { createId, nowIso } from '../shared/util.js';
import type { Project, ProjectStatus, CreateProjectInput } from './project.types.js';

type ProjectRow = typeof projects.$inferSelect;

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    description: row.description,
    status: row.status as ProjectStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createProject(input: CreateProjectInput): Project {
  const db = getDb();
  const now = nowIso();
  const row: ProjectRow = {
    id: createId('proj'),
    name: input.name,
    goal: input.goal,
    description: input.description ?? null,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
  db.insert(projects).values(row).run();
  return toProject(row);
}

export function getProject(id: string): Project | null {
  const db = getDb();
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  return row ? toProject(row) : null;
}

export function listProjects(): Project[] {
  const db = getDb();
  return db.select().from(projects).all().map(toProject);
}

export function updateProjectStatus(id: string, status: ProjectStatus): Project | null {
  const db = getDb();
  db.update(projects)
    .set({ status, updatedAt: nowIso() })
    .where(eq(projects.id, id))
    .run();
  return getProject(id);
}
