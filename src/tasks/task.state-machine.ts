import type { TaskStatus } from './task.types.js';

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['ready', 'blocked', 'cancelled', 'failed'],
  ready: ['running', 'cancelled', 'failed'],
  running: ['completed', 'failed', 'cancelled'],
  failed: ['ready'],
  blocked: ['ready', 'cancelled', 'failed'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid task transition: ${from} -> ${to}`);
  }
}
