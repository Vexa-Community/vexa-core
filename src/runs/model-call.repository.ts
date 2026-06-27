import { eq, asc } from 'drizzle-orm';
import { getDb } from '../storage/database.js';
import { modelCalls } from '../storage/schema.js';
import { createId, nowIso, parseJson } from '../shared/util.js';
import type { ModelCall, CreateModelCallInput } from './model-call.types.js';

type ModelCallRow = typeof modelCalls.$inferSelect;

function toModelCall(row: ModelCallRow): ModelCall {
  return {
    id: row.id,
    runId: row.runId,
    taskId: row.taskId,
    agentId: row.agentId,
    provider: row.provider,
    model: row.model,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    estimatedCost: row.estimatedCost,
    finishReason: row.finishReason,
    durationMs: row.durationMs,
    requestMetadata: parseJson<Record<string, unknown>>(row.requestMetadata, {}),
    responseMetadata: parseJson<Record<string, unknown>>(row.responseMetadata, {}),
    error: row.error,
    createdAt: row.createdAt,
  };
}

export function recordModelCall(input: CreateModelCallInput): ModelCall {
  const db = getDb();
  const row: ModelCallRow = {
    id: createId('mc'),
    runId: input.runId,
    taskId: input.taskId ?? null,
    agentId: input.agentId,
    provider: input.provider,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    estimatedCost: input.estimatedCost,
    finishReason: input.finishReason,
    durationMs: input.durationMs,
    requestMetadata: JSON.stringify(input.requestMetadata ?? {}),
    responseMetadata: JSON.stringify(input.responseMetadata ?? {}),
    error: input.error ?? null,
    createdAt: nowIso(),
  };
  db.insert(modelCalls).values(row).run();
  return toModelCall(row);
}

export function listModelCallsForRun(runId: string): ModelCall[] {
  const db = getDb();
  return db
    .select()
    .from(modelCalls)
    .where(eq(modelCalls.runId, runId))
    .orderBy(asc(modelCalls.createdAt))
    .all()
    .map(toModelCall);
}
