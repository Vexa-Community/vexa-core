import { describe, it, expect } from 'vitest';
import {
  VexaError,
  ConfigurationError,
  ProviderError,
  AuthenticationError,
  RateLimitError,
  TimeoutError,
  InvalidOutputError,
  TaskExecutionError,
  DependencyError,
  BudgetExceededError,
  CancelledError,
} from '../../src/shared/errors.js';

describe('error classes', () => {
  const cases: Array<[VexaError, string, boolean]> = [
    [new ConfigurationError('x'), 'CONFIGURATION_ERROR', false],
    [new ProviderError('x'), 'PROVIDER_ERROR', true],
    [new AuthenticationError('x'), 'AUTHENTICATION_ERROR', false],
    [new RateLimitError('x'), 'RATE_LIMIT_ERROR', true],
    [new TimeoutError('x'), 'TIMEOUT_ERROR', true],
    [new InvalidOutputError('x'), 'INVALID_OUTPUT_ERROR', false],
    [new TaskExecutionError('x'), 'TASK_EXECUTION_ERROR', false],
    [new DependencyError('x'), 'DEPENDENCY_ERROR', false],
    [new BudgetExceededError('x'), 'BUDGET_EXCEEDED_ERROR', false],
    [new CancelledError('x'), 'CANCELLED_ERROR', false],
  ];

  it.each(cases)('%o has correct code and retryable flag', (error, code, retryable) => {
    expect(error).toBeInstanceOf(VexaError);
    expect(error.code).toBe(code);
    expect(error.retryable).toBe(retryable);
  });

  it('RateLimitError carries retryAfterMs', () => {
    const err = new RateLimitError('slow', 500);
    expect(err.retryAfterMs).toBe(500);
  });
});
