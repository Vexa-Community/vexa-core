import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { resetDatabase } from '../helpers.js';
import { buildServer } from '../../src/api/server.js';
import { closeDb } from '../../src/storage/database.js';
import { createProject } from '../../src/projects/project.repository.js';
import { createAgent } from '../../src/agents/agent.repository.js';
import { getRunManager } from '../../src/orchestration/run-manager.js';

let app: FastifyInstance;

function seedAgents(projectId: string): void {
  for (const role of ['ceo', 'frontend-developer', 'qa-reviewer']) {
    createAgent({
      projectId,
      slug: role,
      name: role,
      description: role,
      role,
      instructions: `You are the ${role}`,
      model: 'gpt-4o',
      provider: 'mock',
    });
  }
}

describe('REST API', () => {
  beforeAll(async () => {
    resetDatabase();
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    closeDb();
  });

  beforeEach(() => {
    resetDatabase();
  });

  it('POST /projects creates a project (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      payload: { name: 'P', goal: 'G' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ name: 'P', goal: 'G' });
  });

  it('POST /projects with invalid body returns 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/projects', payload: { name: '' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /projects/:id returns 404 for an unknown id', async () => {
    const res = await app.inject({ method: 'GET', url: '/projects/unknown' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('POST /projects/:id/runs starts a run (201)', async () => {
    const project = createProject({ name: 'P', goal: 'G' });
    seedAgents(project.id);
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/runs`,
      payload: {},
    });
    expect(res.statusCode).toBe(201);
    const runId = res.json().data.id as string;
    await getRunManager().waitForRun(runId);

    const runRes = await app.inject({ method: 'GET', url: `/runs/${runId}` });
    expect(runRes.statusCode).toBe(200);
    expect(runRes.json().data.status).toBe('completed');
  });

  it('POST /projects/:id/runs rejects invalid budgets', async () => {
    const project = createProject({ name: 'P', goal: 'G' });
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/runs`,
      payload: { maxModelCalls: 0 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toBe('Invalid request');
  });

  it('POST /runs/:id/cancel returns 200', async () => {
    const project = createProject({ name: 'P', goal: 'G' });
    seedAgents(project.id);
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/runs`,
      payload: {},
    });
    const runId = res.json().data.id as string;
    await getRunManager().waitForRun(runId);
    const cancelRes = await app.inject({ method: 'POST', url: `/runs/${runId}/cancel` });
    expect(cancelRes.statusCode).toBe(200);
  });

  it('GET /runs/:id/tasks returns the task list', async () => {
    const project = createProject({ name: 'P', goal: 'G' });
    seedAgents(project.id);
    const res = await app.inject({
      method: 'POST',
      url: `/projects/${project.id}/runs`,
      payload: {},
    });
    const runId = res.json().data.id as string;
    await getRunManager().waitForRun(runId);
    const tasksRes = await app.inject({ method: 'GET', url: `/runs/${runId}/tasks` });
    expect(tasksRes.statusCode).toBe(200);
    expect(Array.isArray(tasksRes.json().data)).toBe(true);
    expect(tasksRes.json().data).toHaveLength(3);
  });
});
