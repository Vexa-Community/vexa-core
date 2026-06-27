import { DependencyError } from '../shared/errors.js';
import type { TaskStatus, TaskDependency } from '../tasks/task.types.js';

export interface ResolvableTask {
  id: string;
  status: TaskStatus;
}

export function validateDependencyGraph(
  tasks: ResolvableTask[],
  dependencies: TaskDependency[]
): void {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (ids.has(task.id)) {
      throw new DependencyError(`Duplicate task ID: ${task.id}`);
    }
    ids.add(task.id);
  }

  for (const dep of dependencies) {
    if (!ids.has(dep.taskId)) {
      throw new DependencyError(`Dependency references unknown task: ${dep.taskId}`);
    }
    if (!ids.has(dep.dependsOnTaskId)) {
      throw new DependencyError(`Dependency references unknown task: ${dep.dependsOnTaskId}`);
    }
  }

  const adjacency = new Map<string, string[]>();
  for (const id of ids) adjacency.set(id, []);
  for (const dep of dependencies) {
    adjacency.get(dep.taskId)!.push(dep.dependsOnTaskId);
  }

  const VISITING = 1;
  const DONE = 2;
  const state = new Map<string, number>();

  for (const startId of ids) {
    if (state.get(startId) === DONE) continue;
    const stack: Array<{ node: string; childIndex: number }> = [{ node: startId, childIndex: 0 }];
    state.set(startId, VISITING);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      if (frame === undefined) continue;
      const children = adjacency.get(frame.node) ?? [];
      if (frame.childIndex >= children.length) {
        state.set(frame.node, DONE);
        stack.pop();
        continue;
      }
      const child = children[frame.childIndex++];
      if (child === undefined) {
        continue;
      }
      const childState = state.get(child);
      if (childState === DONE) continue;
      if (childState === VISITING) {
        throw new DependencyError(`Circular dependency detected involving task: ${child}`);
      }
      state.set(child, VISITING);
      stack.push({ node: child, childIndex: 0 });
    }
  }
}

export function getReadyTaskIds(
  tasks: ResolvableTask[],
  dependencies: TaskDependency[]
): string[] {
  const statusById = new Map(tasks.map((t) => [t.id, t.status]));
  const depsByTask = new Map<string, string[]>();
  for (const dep of dependencies) {
    const list = depsByTask.get(dep.taskId) ?? [];
    list.push(dep.dependsOnTaskId);
    depsByTask.set(dep.taskId, list);
  }

  const ready: string[] = [];
  for (const task of tasks) {
    if (task.status !== 'pending' && task.status !== 'blocked') continue;
    const deps = depsByTask.get(task.id) ?? [];
    const allDone = deps.every((depId) => statusById.get(depId) === 'completed');
    if (allDone) ready.push(task.id);
  }
  return ready;
}

export function hasUnfinishedBlockingDep(
  taskId: string,
  tasks: ResolvableTask[],
  dependencies: TaskDependency[]
): boolean {
  const statusById = new Map(tasks.map((t) => [t.id, t.status]));
  return dependencies
    .filter((d) => d.taskId === taskId)
    .some((d) => statusById.get(d.dependsOnTaskId) !== 'completed');
}
