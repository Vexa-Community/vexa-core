import { eq } from 'drizzle-orm';
import { getDb } from '../storage/database.js';
import { tasks, taskDependencies } from '../storage/schema.js';
import { createId, nowIso, parseJson } from '../shared/util.js';
import { assertTransition } from './task.state-machine.js';
import type { Task, TaskStatus, TaskDependency, CreateTaskInput } from './task.types.js';

type TaskRow = typeof tasks.$inferSelect;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    runId: row.runId,
    title: row.title,
    description: row.description,
    assignedAgentId: row.assignedAgentId,
    status: row.status as TaskStatus,
    input: parseJson<Record<string, unknown> | null>(row.input, null),
    output: parseJson<Record<string, unknown> | null>(row.output, null),
    error: row.error,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDb();
  const now = nowIso();
  const row: TaskRow = {
    id: createId('task'),
    runId: input.runId,
    title: input.title,
    description: input.description,
    assignedAgentId: input.assignedAgentId ?? null,
    status: input.status ?? 'pending',
    input: input.input ? JSON.stringify(input.input) : null,
    output: null,
    error: null,
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(tasks).values(row).run();
  return toTask(row);
}

export function getTask(id: string): Task | null {
  const db = getDb();
  const row = db.select().from(tasks).where(eq(tasks.id, id)).get();
  return row ? toTask(row) : null;
}

export function listTasksForRun(runId: string): Task[] {
  const db = getDb();
  return db.select().from(tasks).where(eq(tasks.runId, runId)).all().map(toTask);
}

export function updateTask(
  id: string,
  patch: Partial<{
    status: TaskStatus;
    assignedAgentId: string | null;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    error: string | null;
    attempts: number;
    startedAt: string | null;
    completedAt: string | null;
  }>
): Task | null {
  const db = getDb();
  const current = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!current) return null;
  if (patch.status !== undefined && patch.status !== current.status) {
    assertTransition(current.status as TaskStatus, patch.status);
  }
  const set: Partial<TaskRow> = { updatedAt: nowIso() };
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.assignedAgentId !== undefined) set.assignedAgentId = patch.assignedAgentId;
  if (patch.input !== undefined) set.input = patch.input ? JSON.stringify(patch.input) : null;
  if (patch.output !== undefined) set.output = patch.output ? JSON.stringify(patch.output) : null;
  if (patch.error !== undefined) set.error = patch.error;
  if (patch.attempts !== undefined) set.attempts = patch.attempts;
  if (patch.startedAt !== undefined) set.startedAt = patch.startedAt;
  if (patch.completedAt !== undefined) set.completedAt = patch.completedAt;
  db.update(tasks).set(set).where(eq(tasks.id, id)).run();
  return getTask(id);
}

export function addTaskDependency(taskId: string, dependsOnTaskId: string): void {
  const db = getDb();
  db.insert(taskDependencies).values({ taskId, dependsOnTaskId }).run();
}

export function listDependenciesForRun(runId: string): TaskDependency[] {
  const db = getDb();
  const runTasks = db.select({ id: tasks.id }).from(tasks).where(eq(tasks.runId, runId)).all();
  const ids = new Set(runTasks.map((t) => t.id));
  const allDeps = db.select().from(taskDependencies).all();
  return allDeps.filter((d) => ids.has(d.taskId));
}

export function listDependenciesForTask(taskId: string): TaskDependency[] {
  const db = getDb();
  return db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.taskId, taskId))
    .all();
}
