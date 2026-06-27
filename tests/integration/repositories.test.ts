import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resetDatabase } from '../helpers.js';
import { config } from '../../src/config/config.js';
import { createProject, getProject, listProjects, updateProjectStatus } from '../../src/projects/project.repository.js';
import { createRun, getRun, updateRun } from '../../src/runs/run.repository.js';
import { createTask, getTask, updateTask } from '../../src/tasks/task.repository.js';
import { createAgent } from '../../src/agents/agent.repository.js';
import { recordEvent, listEventsForRun } from '../../src/events/event.repository.js';
import { recordModelCall, listModelCallsForRun } from '../../src/runs/model-call.repository.js';
import { createArtifact, listArtifactsForRun } from '../../src/artifacts/artifact.repository.js';
import { ConfigurationError, ValidationError } from '../../src/shared/errors.js';

function seedAgent(projectId: string) {
  return createAgent({
    projectId,
    slug: 'ceo',
    name: 'CEO',
    description: 'plans',
    role: 'ceo',
    instructions: 'plan',
    model: 'gpt-4o',
    provider: 'mock',
  });
}

describe('repositories', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('creates and retrieves a project', () => {
    const project = createProject({ name: 'P', goal: 'G', description: null });
    expect(getProject(project.id)).toMatchObject({ name: 'P', goal: 'G', status: 'draft' });
    expect(listProjects()).toHaveLength(1);
    const updated = updateProjectStatus(project.id, 'active');
    expect(updated?.status).toBe('active');
  });

  it('creates a run and updates its status', () => {
    const project = createProject({ name: 'P', goal: 'G' });
    const run = createRun({ projectId: project.id, maxModelCalls: 5, maxCost: 1 });
    expect(run.status).toBe('queued');
    const updated = updateRun(run.id, { status: 'running' });
    expect(updated?.status).toBe('running');
    expect(getRun(run.id)?.maxModelCalls).toBe(5);
  });

  it('creates a task and updates its status and output', () => {
    const project = createProject({ name: 'P', goal: 'G' });
    const run = createRun({ projectId: project.id });
    const task = createTask({ runId: run.id, title: 'T', description: 'D' });
    expect(task.status).toBe('pending');
    updateTask(task.id, { status: 'ready' });
    updateTask(task.id, { status: 'running' });
    const updated = updateTask(task.id, { status: 'completed', output: { ok: true } });
    expect(updated?.status).toBe('completed');
    expect(getTask(task.id)?.output).toEqual({ ok: true });
  });

  it('rejects invalid task status transitions at the repository boundary', () => {
    const project = createProject({ name: 'P', goal: 'G' });
    const run = createRun({ projectId: project.id });
    const task = createTask({ runId: run.id, title: 'T', description: 'D' });
    expect(() => updateTask(task.id, { status: 'completed' })).toThrow(/Invalid task transition/);
    expect(getTask(task.id)?.status).toBe('pending');
  });

  it('saves and retrieves events', () => {
    const project = createProject({ name: 'P', goal: 'G' });
    const run = createRun({ projectId: project.id });
    recordEvent({ projectId: project.id, runId: run.id, type: 'run.started', payload: { a: 1 } });
    const events = listEventsForRun(run.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('run.started');
    expect(events[0]?.payload).toEqual({ a: 1 });
  });

  it('saves and retrieves model calls', () => {
    const project = createProject({ name: 'P', goal: 'G' });
    const run = createRun({ projectId: project.id });
    const agent = seedAgent(project.id);
    recordModelCall({
      runId: run.id,
      taskId: null,
      agentId: agent.id,
      provider: 'mock',
      model: 'mock-model',
      inputTokens: 10,
      outputTokens: 20,
      estimatedCost: 0.001,
      finishReason: 'stop',
      durationMs: 5,
    });
    const calls = listModelCallsForRun(run.id);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.outputTokens).toBe(20);
  });

  it('requires agents to belong to an existing project', () => {
    expect(() =>
      createAgent({
        projectId: '',
        slug: 'ceo',
        name: 'CEO',
        description: 'plans',
        role: 'ceo',
        instructions: 'plan',
        model: 'gpt-4o',
        provider: 'mock',
      })
    ).toThrow(ValidationError);

    expect(() =>
      createAgent({
        projectId: 'missing',
        slug: 'ceo',
        name: 'CEO',
        description: 'plans',
        role: 'ceo',
        instructions: 'plan',
        model: 'gpt-4o',
        provider: 'mock',
      })
    ).toThrow(ConfigurationError);
  });

  it('saves and retrieves artifacts', () => {
    const project = createProject({ name: 'P', goal: 'G' });
    const run = createRun({ projectId: project.id });
    const artifact = createArtifact({
      runId: run.id,
      name: 'doc',
      type: 'markdown',
      content: '# Title',
    });
    expect(artifact.type).toBe('markdown');
    const list = listArtifactsForRun(run.id);
    expect(list).toHaveLength(1);
    expect(list[0]?.content).toBe('# Title');
  });

  it('removes artifact files when the database insert fails', () => {
    const runId = 'missing-run';
    expect(() =>
      createArtifact({
        runId,
        name: 'orphan',
        type: 'markdown',
        content: '# Orphan',
      })
    ).toThrow();
    const runDir = path.join(config.artifactsDir, runId);
    expect(fs.existsSync(path.join(runDir, 'orphan.md'))).toBe(false);
    expect(fs.existsSync(runDir) ? fs.readdirSync(runDir) : []).toEqual([]);
  });
});
