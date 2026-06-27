import type { FastifyInstance } from 'fastify';
import { CreateRunBodySchema } from '../schemas/run.schema.js';
import { getProject } from '../../projects/project.repository.js';
import { createRun, getRun, listRunsForProject } from '../../runs/run.repository.js';
import { listTasksForRun } from '../../tasks/task.repository.js';
import { listEventsForRun } from '../../events/event.repository.js';
import { listArtifactsForRun } from '../../artifacts/artifact.repository.js';
import { listModelCallsForRun } from '../../runs/model-call.repository.js';
import { recordEvent } from '../../events/event.repository.js';
import { getRunManager } from '../../orchestration/run-manager.js';
import { NotFoundError } from '../../shared/errors.js';

export async function runRoutes(app: FastifyInstance): Promise<void> {
  app.post('/projects/:projectId/runs', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = getProject(projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);
    const body = CreateRunBodySchema.parse(request.body ?? {});
    const run = createRun({
      projectId,
      maxModelCalls: body.maxModelCalls ?? null,
      maxCost: body.maxCost ?? null,
    });
    recordEvent({ projectId, runId: run.id, type: 'run.queued', payload: {} });
    void getRunManager().startRun(run.id);
    reply.status(201).send({ data: run, meta: {} });
  });

  app.get('/projects/:projectId/runs', async (request) => {
    const { projectId } = request.params as { projectId: string };
    const project = getProject(projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);
    return { data: listRunsForProject(projectId), meta: {} };
  });

  app.get('/runs/:runId', async (request) => {
    const { runId } = request.params as { runId: string };
    const run = getRun(runId);
    if (!run) throw new NotFoundError(`Run not found: ${runId}`);
    const tasks = listTasksForRun(runId);
    const summary = {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      failed: tasks.filter((t) => t.status === 'failed').length,
      running: tasks.filter((t) => t.status === 'running').length,
    };
    return { data: { ...run, taskSummary: summary }, meta: {} };
  });

  app.post('/runs/:runId/cancel', async (request) => {
    const { runId } = request.params as { runId: string };
    const run = getRun(runId);
    if (!run) throw new NotFoundError(`Run not found: ${runId}`);
    getRunManager().cancelRun(runId);
    return { data: getRun(runId), meta: {} };
  });

  app.get('/runs/:runId/tasks', async (request) => {
    const { runId } = request.params as { runId: string };
    const run = getRun(runId);
    if (!run) throw new NotFoundError(`Run not found: ${runId}`);
    return { data: listTasksForRun(runId), meta: {} };
  });

  app.get('/runs/:runId/events', async (request) => {
    const { runId } = request.params as { runId: string };
    const run = getRun(runId);
    if (!run) throw new NotFoundError(`Run not found: ${runId}`);
    return { data: listEventsForRun(runId), meta: {} };
  });

  app.get('/runs/:runId/artifacts', async (request) => {
    const { runId } = request.params as { runId: string };
    const run = getRun(runId);
    if (!run) throw new NotFoundError(`Run not found: ${runId}`);
    return { data: listArtifactsForRun(runId), meta: {} };
  });

  app.get('/runs/:runId/model-calls', async (request) => {
    const { runId } = request.params as { runId: string };
    const run = getRun(runId);
    if (!run) throw new NotFoundError(`Run not found: ${runId}`);
    return { data: listModelCallsForRun(runId), meta: {} };
  });
}
