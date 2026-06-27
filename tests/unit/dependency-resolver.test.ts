import { describe, it, expect } from 'vitest';
import {
  validateDependencyGraph,
  getReadyTaskIds,
  type ResolvableTask,
} from '../../src/orchestration/dependency-resolver.js';
import { DependencyError } from '../../src/shared/errors.js';
import type { TaskDependency } from '../../src/tasks/task.types.js';

describe('dependency resolver', () => {
  it('marks tasks with no dependencies as ready', () => {
    const tasks: ResolvableTask[] = [
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'pending' },
    ];
    expect(getReadyTaskIds(tasks, []).sort()).toEqual(['a', 'b']);
  });

  it('marks a task ready when its dependencies are completed', () => {
    const tasks: ResolvableTask[] = [
      { id: 'a', status: 'completed' },
      { id: 'b', status: 'blocked' },
    ];
    const deps: TaskDependency[] = [{ taskId: 'b', dependsOnTaskId: 'a' }];
    expect(getReadyTaskIds(tasks, deps)).toEqual(['b']);
  });

  it('does not mark a task ready when a dependency is incomplete', () => {
    const tasks: ResolvableTask[] = [
      { id: 'a', status: 'running' },
      { id: 'b', status: 'blocked' },
    ];
    const deps: TaskDependency[] = [{ taskId: 'b', dependsOnTaskId: 'a' }];
    expect(getReadyTaskIds(tasks, deps)).toEqual([]);
  });

  it('throws on circular dependencies', () => {
    const tasks: ResolvableTask[] = [
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'pending' },
    ];
    const deps: TaskDependency[] = [
      { taskId: 'a', dependsOnTaskId: 'b' },
      { taskId: 'b', dependsOnTaskId: 'a' },
    ];
    expect(() => validateDependencyGraph(tasks, deps)).toThrow(DependencyError);
  });

  it('throws on a missing dependency id', () => {
    const tasks: ResolvableTask[] = [{ id: 'a', status: 'pending' }];
    const deps: TaskDependency[] = [{ taskId: 'a', dependsOnTaskId: 'missing' }];
    expect(() => validateDependencyGraph(tasks, deps)).toThrow(DependencyError);
  });

  it('throws on duplicate task ids', () => {
    const tasks: ResolvableTask[] = [
      { id: 'a', status: 'pending' },
      { id: 'a', status: 'pending' },
    ];
    expect(() => validateDependencyGraph(tasks, [])).toThrow(DependencyError);
  });

  it('accepts a valid acyclic graph', () => {
    const tasks: ResolvableTask[] = [
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'pending' },
      { id: 'c', status: 'pending' },
    ];
    const deps: TaskDependency[] = [
      { taskId: 'b', dependsOnTaskId: 'a' },
      { taskId: 'c', dependsOnTaskId: 'b' },
    ];
    expect(() => validateDependencyGraph(tasks, deps)).not.toThrow();
  });

  it('accepts tasks with empty children arrays', () => {
    const tasks: ResolvableTask[] = [{ id: 'a', status: 'pending' }];
    expect(() => validateDependencyGraph(tasks, [])).not.toThrow();
  });

  it('handles a large graph without recursion', () => {
    const tasks: ResolvableTask[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `task-${i}`,
      status: 'pending',
    }));
    const deps: TaskDependency[] = tasks.slice(1).map((task, i) => ({
      taskId: task.id,
      dependsOnTaskId: `task-${i}`,
    }));
    expect(() => validateDependencyGraph(tasks, deps)).not.toThrow();
  });
});
