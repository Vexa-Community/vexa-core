import { describe, it, expect } from 'vitest';
import { canTransition, assertTransition } from '../../src/tasks/task.state-machine.js';

describe('task state machine', () => {
  const valid: Array<[string, string]> = [
    ['pending', 'ready'],
    ['pending', 'blocked'],
    ['pending', 'cancelled'],
    ['ready', 'running'],
    ['ready', 'cancelled'],
    ['running', 'completed'],
    ['running', 'failed'],
    ['running', 'cancelled'],
    ['failed', 'ready'],
    ['blocked', 'ready'],
  ];

  it.each(valid)('allows %s -> %s', (from, to) => {
    expect(canTransition(from as never, to as never)).toBe(true);
    expect(() => assertTransition(from as never, to as never)).not.toThrow();
  });

  const invalid: Array<[string, string]> = [
    ['completed', 'running'],
    ['completed', 'ready'],
    ['cancelled', 'ready'],
    ['pending', 'running'],
    ['pending', 'completed'],
    ['ready', 'completed'],
    ['blocked', 'running'],
    ['failed', 'completed'],
  ];

  it.each(invalid)('rejects %s -> %s', (from, to) => {
    expect(canTransition(from as never, to as never)).toBe(false);
    expect(() => assertTransition(from as never, to as never)).toThrow(/Invalid task transition/);
  });
});
