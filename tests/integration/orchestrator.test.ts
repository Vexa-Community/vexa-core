import { describe, it, expect, beforeEach } from 'vitest';
import { resetDatabase } from '../helpers.js';
import { Orchestrator } from '../../src/orchestration/orchestrator.js';
import { RunManager } from '../../src/orchestration/run-manager.js';
import { AgentEngine } from '../../src/agents/agent.engine.js';
import { ProviderRegistry } from '../../src/providers/provider.registry.js';
import { MockProvider } from '../../src/providers/mock.provider.js';
import { createProject } from '../../src/projects/project.repository.js';
import { createAgent } from '../../src/agents/agent.repository.js';
import { createRun, getRun } from '../../src/runs/run.repository.js';
import { listTasksForRun } from '../../src/tasks/task.repository.js';
import { listEventsForRun } from '../../src/events/event.repository.js';
import { listModelCallsForRun } from '../../src/runs/model-call.repository.js';
import type { ModelProvider, ModelRequest, ModelResponse } from '../../src/providers/provider.interface.js';

function buildOrchestrator(provider: ModelProvider = new MockProvider('success')): Orchestrator {
  const registry = new ProviderRegistry();
  registry.register(provider);
  return new Orchestrator(new AgentEngine(registry));
}

function seedProjectWithAgents(provider = 'mock') {
  const project = createProject({ name: 'SaaS Landing Page', goal: 'Build a landing page' });
  for (const role of ['ceo', 'frontend-developer', 'qa-reviewer']) {
    createAgent({
      projectId: project.id,
      slug: role,
      name: role,
      description: role,
      role,
      instructions: `You are the ${role}`,
      model: 'gpt-4o',
      provider,
    });
  }
  return project;
}

function modelResponse(content: string): ModelResponse {
  return {
    content,
    inputTokens: 1,
    outputTokens: 1,
    estimatedCost: 0,
    finishReason: 'stop',
    providerMetadata: {},
  };
}

class CircularPlanProvider implements ModelProvider {
  readonly name = 'cycle';

  async validateConfiguration(): Promise<void> {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const role = request.metadata?.role;
    if (role !== 'ceo') return modelResponse('{}');
    return modelResponse(
      JSON.stringify({
        summary: 'bad plan',
        tasks: [
          {
            id: 'a',
            title: 'A',
            description: 'A',
            assignedRole: 'frontend-developer',
            dependsOn: ['b'],
            expectedOutput: 'A',
          },
          {
            id: 'b',
            title: 'B',
            description: 'B',
            assignedRole: 'qa-reviewer',
            dependsOn: ['a'],
            expectedOutput: 'B',
          },
        ],
      })
    );
  }
}

class AbortOnlyProvider implements ModelProvider {
  readonly name = 'abort-only';

  async validateConfiguration(): Promise<void> {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    return new Promise((_resolve, reject) => {
      request.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true }
      );
    });
  }
}

describe('orchestrator', () => {
  beforeEach(() => {
    resetDatabase();
  });

  it('completes a full sequential run', async () => {
    const project = seedProjectWithAgents();
    const run = createRun({ projectId: project.id });
    await buildOrchestrator().executeRun(run.id, new AbortController().signal);

    const finished = getRun(run.id);
    expect(finished?.status).toBe('completed');
    const tasks = listTasksForRun(run.id);
    expect(tasks).toHaveLength(3);
    expect(tasks.every((t) => t.status === 'completed')).toBe(true);
    expect(listModelCallsForRun(run.id)).toHaveLength(3);
  });

  it('respects the maxModelCalls limit', async () => {
    const project = seedProjectWithAgents();
    const run = createRun({ projectId: project.id, maxModelCalls: 1 });
    await buildOrchestrator().executeRun(run.id, new AbortController().signal);

    const finished = getRun(run.id);
    expect(finished?.status).toBe('failed');
    expect(finished?.failureReason).toMatch(/[Bb]udget/);
  });

  it('fails invalid model output without leaving running tasks', async () => {
    const project = seedProjectWithAgents();
    const run = createRun({ projectId: project.id });
    await buildOrchestrator(new MockProvider('invalid-output')).executeRun(
      run.id,
      new AbortController().signal
    );

    const finished = getRun(run.id);
    const tasks = listTasksForRun(run.id);
    expect(finished?.status).toBe('failed');
    expect(finished?.failureReason).toMatch(/invalid output/i);
    expect(tasks.some((t) => t.status === 'running')).toBe(false);
    expect(listModelCallsForRun(run.id)).toHaveLength(2);
  });

  it('stops retrying provider rate limits at the task attempt limit', async () => {
    const project = seedProjectWithAgents();
    const run = createRun({ projectId: project.id });
    await buildOrchestrator(new MockProvider('rate-limit')).executeRun(
      run.id,
      new AbortController().signal
    );

    const [task] = listTasksForRun(run.id);
    expect(getRun(run.id)?.status).toBe('failed');
    expect(task?.status).toBe('failed');
    expect(task?.attempts).toBe(task?.maxAttempts);
  });

  it('fails circular planned dependencies with a clear error', async () => {
    const project = seedProjectWithAgents('cycle');
    const run = createRun({ projectId: project.id });
    await buildOrchestrator(new CircularPlanProvider()).executeRun(
      run.id,
      new AbortController().signal
    );

    const finished = getRun(run.id);
    expect(finished?.status).toBe('failed');
    expect(finished?.failureReason).toMatch(/Circular dependency/);
    expect(listTasksForRun(run.id).some((t) => t.status === 'running')).toBe(false);
  });

  it('cancels a run gracefully when the signal is aborted', async () => {
    const project = seedProjectWithAgents();
    const run = createRun({ projectId: project.id });
    const controller = new AbortController();
    controller.abort();
    await buildOrchestrator().executeRun(run.id, controller.signal);

    const finished = getRun(run.id);
    expect(finished?.status).toBe('cancelled');
    expect(finished?.cancelledAt).not.toBeNull();
  });

  it('cancels a run while provider execution is in flight', async () => {
    const project = seedProjectWithAgents('abort-only');
    const run = createRun({ projectId: project.id });
    const controller = new AbortController();
    const promise = buildOrchestrator(new AbortOnlyProvider()).executeRun(run.id, controller.signal);
    setTimeout(() => controller.abort(), 0);
    await promise;

    const finished = getRun(run.id);
    expect(finished?.status).toBe('cancelled');
    expect(listTasksForRun(run.id).some((t) => t.status === 'running')).toBe(false);
  });

  it('does not start the same run twice', async () => {
    const project = seedProjectWithAgents();
    const run = createRun({ projectId: project.id });
    const registry = new ProviderRegistry();
    registry.register(new MockProvider('success'));
    const manager = new RunManager(registry);

    const first = manager.startRun(run.id);
    const second = manager.startRun(run.id);
    expect(second).toBe(first);
    await first;

    const tasks = listTasksForRun(run.id);
    expect(getRun(run.id)?.status).toBe('completed');
    expect(tasks.filter((t) => t.title === 'Plan project')).toHaveLength(1);
  });

  it('emits events for the key state transitions', async () => {
    const project = seedProjectWithAgents();
    const run = createRun({ projectId: project.id });
    await buildOrchestrator().executeRun(run.id, new AbortController().signal);

    const types = listEventsForRun(run.id).map((e) => e.type);
    for (const expected of [
      'run.started',
      'task.created',
      'task.started',
      'task.completed',
      'model.requested',
      'model.completed',
      'artifact.created',
      'run.completed',
    ]) {
      expect(types).toContain(expected);
    }
  });
});
