import { Orchestrator } from './orchestrator.js';
import { AgentEngine } from '../agents/agent.engine.js';
import { createDefaultRegistry, type ProviderRegistry } from '../providers/provider.registry.js';
import { getRun, updateRun } from '../runs/run.repository.js';
import { updateTask, listTasksForRun } from '../tasks/task.repository.js';
import { assertTransition } from '../tasks/task.state-machine.js';
import { recordEvent } from '../events/event.repository.js';
import { nowIso } from '../shared/util.js';
import { logger } from '../logging/logger.js';

export class RunManager {
  private readonly orchestrator: Orchestrator;
  private readonly controllers = new Map<string, AbortController>();
  private readonly inflight = new Map<string, Promise<void>>();

  constructor(registry: ProviderRegistry) {
    this.orchestrator = new Orchestrator(new AgentEngine(registry));
  }

  startRun(runId: string): Promise<void> {
    const existing = this.inflight.get(runId);
    if (existing) return existing;

    const controller = new AbortController();
    this.controllers.set(runId, controller);
    const promise = this.orchestrator
      .executeRun(runId, controller.signal)
      .catch((err) => {
        logger.error({ err, runId }, 'run execution error');
        this.failCrashedRun(runId, err);
      })
      .finally(() => {
        this.controllers.delete(runId);
        this.inflight.delete(runId);
      });
    this.inflight.set(runId, promise);
    return promise;
  }

  cancelRun(runId: string): void {
    const controller = this.controllers.get(runId);
    if (controller) {
      controller.abort();
      return;
    }
    const run = getRun(runId);
    if (run && (run.status === 'queued' || run.status === 'running')) {
      const now = nowIso();
      for (const task of listTasksForRun(runId)) {
        if (['pending', 'ready', 'blocked', 'running'].includes(task.status)) {
          assertTransition(task.status, 'cancelled');
          updateTask(task.id, { status: 'cancelled', completedAt: now });
        }
      }
      updateRun(runId, { status: 'cancelled', cancelledAt: now, completedAt: now });
      recordEvent({
        projectId: run.projectId,
        runId,
        type: 'run.cancelled',
        payload: {},
      });
    }
  }

  async waitForRun(runId: string): Promise<void> {
    const promise = this.inflight.get(runId);
    if (promise) await promise;
  }

  private failCrashedRun(runId: string, err: unknown): void {
    const run = getRun(runId);
    if (!run || (run.status !== 'queued' && run.status !== 'running')) return;
    const now = nowIso();
    const message = err instanceof Error ? err.message : 'Run execution failed';
    for (const task of listTasksForRun(runId)) {
      if (['pending', 'ready', 'blocked', 'running'].includes(task.status)) {
        assertTransition(task.status, 'failed');
        updateTask(task.id, { status: 'failed', error: message, completedAt: now });
      }
    }
    updateRun(runId, { status: 'failed', completedAt: now, failureReason: message });
    recordEvent({
      projectId: run.projectId,
      runId,
      type: 'run.failed',
      payload: { reason: message },
    });
  }
}

let defaultManager: RunManager | null = null;

export function getRunManager(): RunManager {
  if (!defaultManager) {
    defaultManager = new RunManager(createDefaultRegistry());
  }
  return defaultManager;
}

export function resetRunManager(): void {
  defaultManager = null;
}
