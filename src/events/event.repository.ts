import { eq, asc } from 'drizzle-orm';
import { getDb } from '../storage/database.js';
import { events } from '../storage/schema.js';
import { createId, nowIso, parseJson } from '../shared/util.js';
import type { VexaEvent, CreateEventInput } from './event.types.js';

type EventRow = typeof events.$inferSelect;

function toEvent(row: EventRow): VexaEvent {
  return {
    id: row.id,
    projectId: row.projectId,
    runId: row.runId,
    taskId: row.taskId,
    agentId: row.agentId,
    type: row.type,
    payload: parseJson<Record<string, unknown>>(row.payload, {}),
    createdAt: row.createdAt,
  };
}

export function recordEvent(input: CreateEventInput): VexaEvent {
  const db = getDb();
  const row: EventRow = {
    id: createId('evt'),
    projectId: input.projectId ?? null,
    runId: input.runId ?? null,
    taskId: input.taskId ?? null,
    agentId: input.agentId ?? null,
    type: input.type,
    payload: JSON.stringify(input.payload ?? {}),
    createdAt: nowIso(),
  };
  db.insert(events).values(row).run();
  return toEvent(row);
}

export function listEventsForRun(runId: string): VexaEvent[] {
  const db = getDb();
  return db
    .select()
    .from(events)
    .where(eq(events.runId, runId))
    .orderBy(asc(events.createdAt))
    .all()
    .map(toEvent);
}
