import { eq, asc } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../storage/database.js';
import { artifacts } from '../storage/schema.js';
import { config } from '../config/config.js';
import { createId, nowIso, parseJson } from '../shared/util.js';
import { ValidationError } from '../shared/errors.js';
import type { Artifact, ArtifactType, CreateArtifactInput } from './artifact.types.js';

type ArtifactRow = typeof artifacts.$inferSelect;

function toArtifact(row: ArtifactRow): Artifact {
  return {
    id: row.id,
    runId: row.runId,
    taskId: row.taskId,
    createdByAgentId: row.createdByAgentId,
    name: row.name,
    type: row.type as ArtifactType,
    path: row.path,
    content: row.content,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: row.createdAt,
  };
}

const EXTENSION_BY_TYPE: Record<ArtifactType, string> = {
  markdown: 'md',
  json: 'json',
  text: 'txt',
  code: 'txt',
  report: 'md',
};

export function resolveArtifactPath(runId: string, name: string, type: ArtifactType): string {
  if (name.includes('..') || name.includes('/') || name.includes('\\') || path.isAbsolute(name)) {
    throw new ValidationError(`Invalid artifact name: ${name}`);
  }
  const baseDir = path.resolve(config.artifactsDir);
  const fileName = `${name}.${EXTENSION_BY_TYPE[type]}`;
  const resolved = path.resolve(baseDir, runId, fileName);
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
    throw new ValidationError(`Artifact path escapes artifacts directory: ${name}`);
  }
  return resolved;
}

export function createArtifact(input: CreateArtifactInput): Artifact {
  const db = getDb();
  const filePath = resolveArtifactPath(input.runId, input.name, input.type);
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tempPath, input.content, 'utf8');

  const row: ArtifactRow = {
    id: createId('art'),
    runId: input.runId,
    taskId: input.taskId ?? null,
    createdByAgentId: input.createdByAgentId ?? null,
    name: input.name,
    type: input.type,
    path: filePath,
    content: input.content,
    metadata: JSON.stringify(input.metadata ?? {}),
    createdAt: nowIso(),
  };
  try {
    db.transaction((tx) => {
      tx.insert(artifacts).values(row).run();
      fs.renameSync(tempPath, filePath);
    });
  } catch (err) {
    fs.rmSync(tempPath, { force: true });
    fs.rmSync(filePath, { force: true });
    throw err;
  }
  return toArtifact(row);
}

export function getArtifact(id: string): Artifact | null {
  const db = getDb();
  const row = db.select().from(artifacts).where(eq(artifacts.id, id)).get();
  return row ? toArtifact(row) : null;
}

export function listArtifactsForRun(runId: string): Artifact[] {
  const db = getDb();
  return db
    .select()
    .from(artifacts)
    .where(eq(artifacts.runId, runId))
    .orderBy(asc(artifacts.createdAt))
    .all()
    .map(toArtifact);
}
