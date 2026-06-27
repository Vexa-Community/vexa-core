import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { resetDatabase } from '../helpers.js';
import { buildServer } from '../../src/api/server.js';
import { closeDb } from '../../src/storage/database.js';
import { loadAgentsFromDir } from '../../src/agents/agent.loader.js';
import { getRunManager } from '../../src/orchestration/run-manager.js';

let app: FastifyInstance;

describe('end-to-end full run', () => {
  beforeAll(async () => {
    resetDatabase();
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    closeDb();
  });

  it('runs the three-agent landing page workflow to completion', async () => {
    const projectRes = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: {
        name: 'SaaS Landing Page',
        goal: 'Create a technical architecture plan for a modern SaaS landing page',
        description: 'E2E test project',
      },
    });
    expect(projectRes.statusCode).toBe(201);
    const projectId = projectRes.json().data.id as string;

    const agentConfigs = loadAgentsFromDir(path.resolve(import.meta.dirname, '../../agents'));
    expect(agentConfigs).toHaveLength(3);
    for (const cfg of agentConfigs) {
      const res = await app.inject({
        method: 'POST',
        url: `/projects/${projectId}/agents`,
        payload: {
          slug: cfg.slug,
          name: cfg.name,
          description: cfg.description,
          role: cfg.role,
          instructions: cfg.instructions,
          model: cfg.model,
          provider: cfg.provider,
          tools: cfg.tools ?? [],
          maxIterations: cfg.maxIterations ?? 3,
          maxOutputTokens: cfg.maxOutputTokens ?? 2000,
          enabled: cfg.enabled ?? true,
        },
      });
      expect(res.statusCode).toBe(201);
    }

    const runRes = await app.inject({
      method: 'POST',
      url: `/projects/${projectId}/runs`,
      payload: { maxModelCalls: 20, maxCost: 1.0 },
    });
    expect(runRes.statusCode).toBe(201);
    const runId = runRes.json().data.id as string;

    await getRunManager().waitForRun(runId);

    const finalRun = await app.inject({ method: 'GET', url: `/runs/${runId}` });
    expect(finalRun.json().data.status).toBe('completed');

    const eventsRes = await app.inject({ method: 'GET', url: `/runs/${runId}/events` });
    const eventTypes = (eventsRes.json().data as Array<{ type: string }>).map((e) => e.type);
    expect(eventTypes).toContain('run.started');
    expect(eventTypes).toContain('task.created');
    expect(eventTypes.filter((t) => t === 'task.completed')).toHaveLength(3);
    expect(eventTypes).toContain('run.completed');

    const callsRes = await app.inject({ method: 'GET', url: `/runs/${runId}/model-calls` });
    expect(callsRes.json().data).toHaveLength(3);

    const artifactsRes = await app.inject({ method: 'GET', url: `/runs/${runId}/artifacts` });
    const artifacts = artifactsRes.json().data as Array<{ type: string; name: string }>;
    expect(artifacts).toHaveLength(1);
    expect(artifacts.some((a) => a.type === 'markdown')).toBe(true);
  });
});
