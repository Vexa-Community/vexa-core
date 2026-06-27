import { eq, desc } from 'drizzle-orm';
import { getDb } from '../storage/database.js';
import { runs } from '../storage/schema.js';
import { createId, nowIso } from '../shared/util.js';
import type { Run, RunStatus, CreateRunInput } from './run.types.js';

type RunRow = typeof runs.$inferSelect;

function toRun(row: RunRow): Run {
  return {
    id: row.id,
    projectId: row.projectId,
    status: row.status as RunStatus,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    failureReason: row.failureReason,
    maxModelCalls: row.maxModelCalls,
    maxCost: row.maxCost,
    currentModelCalls: row.currentModelCalls,
    estimatedCost: row.estimatedCost,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createRun(input: CreateRunInput): Run {
  const db = getDb();
  const now = nowIso();
  const row: RunRow = {
    id: createId('run'),
    projectId: input.projectId,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    failureReason: null,
    maxModelCalls: input.maxModelCalls ?? null,
    maxCost: input.maxCost ?? null,
    currentModelCalls: 0,
    estimatedCost: 0,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(runs).values(row).run();
  return toRun(row);
}

export function getRun(id: string): Run | null {
  const db = getDb();
  const row = db.select().from(runs).where(eq(runs.id, id)).get();
  return row ? toRun(row) : null;
}

export function listRunsForProject(projectId: string): Run[] {
  const db = getDb();
  return db
    .select()
    .from(runs)
    .where(eq(runs.projectId, projectId))
    .orderBy(desc(runs.createdAt))
    .all()
    .map(toRun);
}

export function updateRun(id: string, patch: Partial<Omit<RunRow, 'id' | 'createdAt'>>): Run | null {
  const db = getDb();
  db.update(runs)
    .set({ ...patch, updatedAt: nowIso() })
    .where(eq(runs.id, id))
    .run();
  return getRun(id);
}

export function incrementRunUsage(id: string, deltaCalls: number, deltaCost: number): Run | null {
  const run = getRun(id);
  if (!run) return null;
  return updateRun(id, {
    currentModelCalls: run.currentModelCalls + deltaCalls,
    estimatedCost: run.estimatedCost + deltaCost,
  });
}
