import { eq, asc } from 'drizzle-orm';
import { getDb } from '../storage/database.js';
import { messages } from '../storage/schema.js';
import { createId, nowIso } from '../shared/util.js';
import type { Message, MessageType, CreateMessageInput } from './message.types.js';

type MessageRow = typeof messages.$inferSelect;

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    runId: row.runId,
    taskId: row.taskId,
    fromAgentId: row.fromAgentId,
    toAgentId: row.toAgentId,
    type: row.type as MessageType,
    content: row.content,
    createdAt: row.createdAt,
  };
}

export function recordMessage(input: CreateMessageInput): Message {
  const db = getDb();
  const row: MessageRow = {
    id: createId('msg'),
    runId: input.runId,
    taskId: input.taskId ?? null,
    fromAgentId: input.fromAgentId ?? null,
    toAgentId: input.toAgentId ?? null,
    type: input.type,
    content: input.content,
    createdAt: nowIso(),
  };
  db.insert(messages).values(row).run();
  return toMessage(row);
}

export function listMessagesForRun(runId: string): Message[] {
  const db = getDb();
  return db
    .select()
    .from(messages)
    .where(eq(messages.runId, runId))
    .orderBy(asc(messages.createdAt))
    .all()
    .map(toMessage);
}
