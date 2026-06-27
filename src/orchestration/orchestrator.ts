import { z } from 'zod';
import {
  BudgetExceededError,
  CancelledError,
  ConfigurationError,
  VexaError,
} from '../shared/errors.js';
import { nowIso } from '../shared/util.js';
import { logger } from '../logging/logger.js';
import { getRun, updateRun } from '../runs/run.repository.js';
import { recordModelCall } from '../runs/model-call.repository.js';
import {
  createTask,
  getTask,
  listTasksForRun,
  updateTask,
  addTaskDependency,
  listDependenciesForRun,
} from '../tasks/task.repository.js';
import { assertTransition } from '../tasks/task.state-machine.js';
import { getReadyTaskIds, validateDependencyGraph } from './dependency-resolver.js';
import { recordEvent } from '../events/event.repository.js';
import { createArtifact } from '../artifacts/artifact.repository.js';
import {
  getAgentByRoleForProject,
  getAgent,
  listAgentsForProject,
} from '../agents/agent.repository.js';
import { getProject } from '../projects/project.repository.js';
import { CeoOutputSchema, FrontendDevOutputSchema } from '../agents/agent.schema.js';
import type { AgentEngine, DependencyOutput, ModelCallSink } from '../agents/agent.engine.js';
import type { Task } from '../tasks/task.types.js';
import type { Run } from '../runs/run.types.js';
import type { Agent } from '../agents/agent.types.js';
import type { CreateModelCallInput } from '../runs/model-call.types.js';

export class Orchestrator {
  constructor(private readonly engine: AgentEngine) {}

  async executeRun(runId: string, signal: AbortSignal): Promise<void> {
    const run = getRun(runId);
    if (!run) throw new ConfigurationError(`Run not found: ${runId}`);
    const project = getProject(run.projectId);
    if (!project) throw new ConfigurationError(`Project not found: ${run.projectId}`);

    updateRun(runId, { status: 'running', startedAt: nowIso() });
    this.emit({ projectId: run.projectId, runId, type: 'run.started', payload: {} });

    const ceoAgent = getAgentByRoleForProject(run.projectId, 'ceo');
    if (!ceoAgent) {
      this.failRun(run, 'No CEO agent registered for project');
      return;
    }

    const ceoTask = createTask({
      runId,
      title: 'Plan project',
      description: `Analyze the project goal and produce a structured task plan. Goal: ${project.goal}`,
      assignedAgentId: ceoAgent.id,
      status: 'ready',
    });
    this.emit({
      projectId: run.projectId,
      runId,
      taskId: ceoTask.id,
      agentId: ceoAgent.id,
      type: 'task.created',
      payload: { title: ceoTask.title },
    });

    try {
      for (;;) {
        if (signal.aborted) {
          this.cancelRun(run);
          return;
        }

        const tasks = listTasksForRun(runId);
        const readyIds = tasks.filter((t) => t.status === 'ready').map((t) => t.id);
        const runningCount = tasks.filter((t) => t.status === 'running').length;

        if (readyIds.length === 0 && runningCount === 0) {
          const allDone = tasks.every(
            (t) => t.status === 'completed' || t.status === 'cancelled'
          );
          if (allDone) {
            this.completeRun(run);
            return;
          }
          this.failRun(run, 'Deadlock: no runnable tasks remain');
          return;
        }

        const nextId = readyIds[0];
        if (nextId === undefined) {
          this.failRun(run, 'Deadlock: tasks running with no progress');
          return;
        }

        const stop = await this.executeTask(run, nextId, project.goal, signal);
        if (stop) return;

        this.updateReadiness(runId);
      }
    } catch (err) {
      if (err instanceof CancelledError) {
        this.cancelRun(run);
        return;
      }
      this.failRun(run, err instanceof Error ? err.message : 'Unknown orchestration error');
    }
  }

  private async executeTask(
    run: Run,
    taskId: string,
    goal: string,
    signal: AbortSignal
  ): Promise<boolean> {
    const task = getTask(taskId);
    if (!task) return false;
    const agent = task.assignedAgentId ? getAgent(task.assignedAgentId) : null;
    if (!agent) {
      this.markTaskFailed(task, 'No agent assigned');
      this.failRun(run, `Task ${task.id} has no assigned agent`);
      return true;
    }

    const current = getRun(run.id);
    if (current && this.budgetExceeded(current)) {
      this.markTaskFailed(task, 'Budget exceeded before execution');
      this.failRunBudget(run);
      return true;
    }

    assertTransition(task.status, 'running');
    const startedTask = updateTask(task.id, {
      status: 'running',
      attempts: task.attempts + 1,
      startedAt: nowIso(),
    })!;
    this.emit({
      projectId: run.projectId,
      runId: run.id,
      taskId: task.id,
      agentId: agent.id,
      type: 'task.started',
      payload: { attempt: startedTask.attempts },
    });
    this.emit({
      projectId: run.projectId,
      runId: run.id,
      taskId: task.id,
      agentId: agent.id,
      type: 'agent.started',
      payload: { slug: agent.slug },
    });

    const context = this.buildContext(goal, task);
    const sink: ModelCallSink = (call: CreateModelCallInput) => {
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: task.id,
        agentId: agent.id,
        type: 'model.requested',
        payload: { model: call.model },
      });
      recordModelCall(call);
      const updated = getRun(run.id);
      if (updated) {
        updateRun(run.id, {
          currentModelCalls: updated.currentModelCalls + 1,
          estimatedCost: updated.estimatedCost + call.estimatedCost,
        });
      }
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: task.id,
        agentId: agent.id,
        type: 'model.completed',
        payload: { inputTokens: call.inputTokens, outputTokens: call.outputTokens },
      });
    };

    try {
      const result = await this.engine.executeTask(agent, startedTask, context, signal, sink);
      const completed = updateTask(task.id, {
        status: 'completed',
        output: result.output as Record<string, unknown>,
        completedAt: nowIso(),
      })!;
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: task.id,
        agentId: agent.id,
        type: 'agent.completed',
        payload: { slug: agent.slug },
      });
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: task.id,
        agentId: agent.id,
        type: 'task.completed',
        payload: {},
      });

      this.handleTaskOutput(run, completed, agent, result.output);

      const after = getRun(run.id);
      if (after && this.budgetExceeded(after)) {
        this.failRunBudget(run);
        return true;
      }
      return false;
    } catch (err) {
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: task.id,
        agentId: agent.id,
        type: 'model.failed',
        payload: { error: err instanceof Error ? err.message : 'unknown' },
      });
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: task.id,
        agentId: agent.id,
        type: 'agent.failed',
        payload: { error: err instanceof Error ? err.message : 'unknown' },
      });

      if (err instanceof CancelledError) {
        throw err;
      }

      const retryable = err instanceof VexaError && err.retryable;
      const message = err instanceof Error ? err.message : 'Task execution failed';
      const latest = getTask(task.id)!;

      if (retryable && latest.attempts < latest.maxAttempts) {
        updateTask(task.id, { status: 'failed', error: message });
        assertTransition('failed', 'ready');
        updateTask(task.id, { status: 'ready' });
        this.emit({
          projectId: run.projectId,
          runId: run.id,
          taskId: task.id,
          agentId: agent.id,
          type: 'task.retrying',
          payload: { attempts: latest.attempts },
        });
        logger.warn({ runId: run.id, taskId: task.id, attempts: latest.attempts }, 'retrying task');
        return false;
      }

      this.markTaskFailed(latest, message);
      this.failRun(run, `Task ${task.id} failed: ${message}`);
      return true;
    }
  }

  private handleTaskOutput(run: Run, task: Task, agent: Agent, output: unknown): void {
    if (agent.role === 'ceo') {
      this.createPlannedTasks(run, task, output);
      return;
    }
    if (agent.role === 'frontend-developer') {
      this.createFrontendArtifact(run, task, agent, output);
    }
  }

  private createPlannedTasks(run: Run, ceoTask: Task, output: unknown): void {
    const parsed = CeoOutputSchema.safeParse(output);
    if (!parsed.success) return;

    const projectAgents = listAgentsForProject(run.projectId);
    const byRole = new Map(projectAgents.map((a) => [a.role, a]));
    const plannedIdToTaskId = new Map<string, string>();
    const createdTaskIds: string[] = [];

    for (const planned of parsed.data.tasks) {
      const agent = byRole.get(planned.assignedRole);
      const created = createTask({
        runId: run.id,
        title: planned.title,
        description: `${planned.description}\nExpected output: ${planned.expectedOutput}`,
        assignedAgentId: agent ? agent.id : null,
        status: 'blocked',
      });
      plannedIdToTaskId.set(planned.id, created.id);
      createdTaskIds.push(created.id);
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: created.id,
        agentId: agent ? agent.id : null,
        type: 'task.created',
        payload: { title: created.title, role: planned.assignedRole },
      });
    }

    for (const planned of parsed.data.tasks) {
      const taskId = plannedIdToTaskId.get(planned.id);
      if (!taskId) continue;
      for (const dependsOn of planned.dependsOn) {
        const depTaskId = plannedIdToTaskId.get(dependsOn);
        if (depTaskId) addTaskDependency(taskId, depTaskId);
      }
    }

    const qaAgent = byRole.get('qa-reviewer');
    if (qaAgent && createdTaskIds.length > 0) {
      const qaTask = createTask({
        runId: run.id,
        title: 'Review architecture',
        description:
          'Review the produced architecture artifact against the original task description and return a pass/fail verdict.',
        assignedAgentId: qaAgent.id,
        status: 'blocked',
      });
      for (const specialistId of createdTaskIds) {
        addTaskDependency(qaTask.id, specialistId);
      }
      this.emit({
        projectId: run.projectId,
        runId: run.id,
        taskId: qaTask.id,
        agentId: qaAgent.id,
        type: 'task.created',
        payload: { title: qaTask.title, role: 'qa-reviewer' },
      });
    }

    validateDependencyGraph(listTasksForRun(run.id), listDependenciesForRun(run.id));
  }

  private createFrontendArtifact(run: Run, task: Task, agent: Agent, output: unknown): void {
    const parsed = FrontendDevOutputSchema.safeParse(output);
    if (!parsed.success) return;
    const data = parsed.data;
    const md = this.renderArchitectureMarkdown(data);
    const artifact = createArtifact({
      runId: run.id,
      taskId: task.id,
      createdByAgentId: agent.id,
      name: 'frontend-architecture',
      type: 'markdown',
      content: md,
      metadata: { risks: data.risks, assumptions: data.assumptions },
    });
    this.emit({
      projectId: run.projectId,
      runId: run.id,
      taskId: task.id,
      agentId: agent.id,
      type: 'artifact.created',
      payload: { artifactId: artifact.id, name: artifact.name, type: artifact.type },
    });
  }

  private renderArchitectureMarkdown(data: z.infer<typeof FrontendDevOutputSchema>): string {
    const section = (title: string, items: string[]): string =>
      `## ${title}\n\n${items.map((i) => `- ${i}`).join('\n')}\n`;
    return [
      `# Frontend Architecture\n`,
      `${data.summary}\n`,
      section('Pages', data.architecture.pages),
      section('Components', data.architecture.components),
      section('State Management', data.architecture.stateManagement),
      section('Data Flow', data.architecture.dataFlow),
      section('Accessibility', data.architecture.accessibility),
      section('Testing', data.architecture.testing),
      section('Risks', data.risks),
      section('Assumptions', data.assumptions),
    ].join('\n');
  }

  private buildContext(goal: string, task: Task): { goal: string; dependencyOutputs: DependencyOutput[] } {
    const allTasks = listTasksForRun(task.runId);
    const deps = listDependenciesForRun(task.runId).filter((d) => d.taskId === task.id);
    const byId = new Map(allTasks.map((t) => [t.id, t]));
    const dependencyOutputs: DependencyOutput[] = [];
    for (const dep of deps) {
      const depTask = byId.get(dep.dependsOnTaskId);
      if (depTask && depTask.output) {
        const agent = depTask.assignedAgentId ? getAgent(depTask.assignedAgentId) : null;
        dependencyOutputs.push({
          taskTitle: depTask.title,
          role: agent?.role ?? 'unknown',
          output: depTask.output,
        });
      }
    }
    return { goal, dependencyOutputs };
  }

  private updateReadiness(runId: string): void {
    const tasks = listTasksForRun(runId);
    const deps = listDependenciesForRun(runId);
    const readyIds = new Set(getReadyTaskIds(tasks, deps));
    const run = getRun(runId);
    for (const task of tasks) {
      if ((task.status === 'pending' || task.status === 'blocked') && readyIds.has(task.id)) {
        assertTransition(task.status, 'ready');
        const updated = updateTask(task.id, { status: 'ready' })!;
        this.emit({
          projectId: run?.projectId ?? null,
          runId,
          taskId: updated.id,
          agentId: updated.assignedAgentId,
          type: 'task.ready',
          payload: {},
        });
      }
    }
  }

  private markTaskFailed(task: Task, message: string): void {
    const fresh = getTask(task.id);
    if (!fresh) return;
    if (fresh.status === 'completed' || fresh.status === 'cancelled' || fresh.status === 'failed') {
      return;
    }
    assertTransition(fresh.status, 'failed');
    updateTask(task.id, { status: 'failed', error: message, completedAt: nowIso() });
    const run = getRun(task.runId);
    this.emit({
      projectId: run?.projectId ?? null,
      runId: task.runId,
      taskId: task.id,
      agentId: task.assignedAgentId,
      type: 'task.failed',
      payload: { error: message },
    });
  }

  private budgetExceeded(run: Run): boolean {
    if (run.maxModelCalls !== null && run.currentModelCalls >= run.maxModelCalls) return true;
    if (run.maxCost !== null && run.estimatedCost >= run.maxCost) return true;
    return false;
  }

  private completeRun(run: Run): void {
    updateRun(run.id, { status: 'completed', completedAt: nowIso() });
    this.emit({ projectId: run.projectId, runId: run.id, type: 'run.completed', payload: {} });
  }

  private failRun(run: Run, reason: string): void {
    updateRun(run.id, { status: 'failed', completedAt: nowIso(), failureReason: reason });
    this.emit({
      projectId: run.projectId,
      runId: run.id,
      type: 'run.failed',
      payload: { reason },
    });
  }

  private failRunBudget(run: Run): void {
    const reason = 'Budget exceeded';
    updateRun(run.id, { status: 'failed', completedAt: nowIso(), failureReason: reason });
    this.emit({
      projectId: run.projectId,
      runId: run.id,
      type: 'run.failed',
      payload: { reason, error: new BudgetExceededError(reason).code },
    });
  }

  private cancelRun(run: Run): void {
    const now = nowIso();
    const tasks = listTasksForRun(run.id);
    for (const task of tasks) {
      if (['pending', 'ready', 'blocked', 'running'].includes(task.status)) {
        assertTransition(task.status, 'cancelled');
        updateTask(task.id, { status: 'cancelled', completedAt: now });
      }
    }
    updateRun(run.id, { status: 'cancelled', cancelledAt: now, completedAt: now });
    this.emit({ projectId: run.projectId, runId: run.id, type: 'run.cancelled', payload: {} });
  }

  private emit(input: {
    projectId?: string | null;
    runId?: string | null;
    taskId?: string | null;
    agentId?: string | null;
    type: string;
    payload: Record<string, unknown>;
  }): void {
    recordEvent(input);
  }
}
