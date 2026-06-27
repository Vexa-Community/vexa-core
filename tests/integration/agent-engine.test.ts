import { describe, it, expect, vi } from 'vitest';
import { AgentEngine, type ModelCallSink, type TaskContext } from '../../src/agents/agent.engine.js';
import { ProviderRegistry } from '../../src/providers/provider.registry.js';
import { MockProvider, type MockMode } from '../../src/providers/mock.provider.js';
import { AuthenticationError, InvalidOutputError } from '../../src/shared/errors.js';
import type { Agent } from '../../src/agents/agent.types.js';
import type { Task } from '../../src/tasks/task.types.js';

function makeRegistry(mode: MockMode): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new MockProvider(mode));
  return registry;
}

const agent: Agent = {
  id: 'agent_1',
  projectId: 'proj_1',
  slug: 'ceo',
  name: 'CEO',
  description: 'plans',
  role: 'ceo',
  instructions: 'Plan the project',
  model: 'gpt-4o',
  provider: 'mock',
  tools: [],
  maxIterations: 3,
  maxOutputTokens: 2000,
  enabled: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const task: Task = {
  id: 'task_1',
  runId: 'run_1',
  title: 'Plan',
  description: 'Plan the project',
  assignedAgentId: 'agent_1',
  status: 'running',
  input: null,
  output: null,
  error: null,
  attempts: 1,
  maxAttempts: 3,
  startedAt: null,
  completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const context: TaskContext = { goal: 'Build a landing page', dependencyOutputs: [] };

describe('agent engine', () => {
  it('executes a task with the mock provider (success)', async () => {
    const engine = new AgentEngine(makeRegistry('success'));
    const sink: ModelCallSink = vi.fn();
    const result = await engine.executeTask(agent, task, context, new AbortController().signal, sink);
    expect(result.output).toMatchObject({ summary: expect.any(String) });
    expect((result.output as { tasks: unknown[] }).tasks).toHaveLength(1);
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it('attempts a correction on invalid output then throws', async () => {
    const engine = new AgentEngine(makeRegistry('invalid-output'));
    const sink = vi.fn();
    await expect(
      engine.executeTask(agent, task, context, new AbortController().signal, sink)
    ).rejects.toBeInstanceOf(InvalidOutputError);
    expect(sink).toHaveBeenCalledTimes(2);
  });

  it('propagates an authentication failure without retrying', async () => {
    const engine = new AgentEngine(makeRegistry('auth-failure'));
    const sink = vi.fn();
    await expect(
      engine.executeTask(agent, task, context, new AbortController().signal, sink)
    ).rejects.toBeInstanceOf(AuthenticationError);
    expect(sink).not.toHaveBeenCalled();
  });
});
