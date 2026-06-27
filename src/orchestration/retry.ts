import {
  BudgetExceededError,
  CancelledError,
  RateLimitError,
  VexaError,
} from '../shared/errors.js';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  multiplier: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 10000,
};

export interface RetryOptions {
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export function computeBackoffDelay(attempt: number, config: RetryConfig): number {
  const raw = config.initialDelayMs * Math.pow(config.multiplier, attempt - 1);
  return Math.min(raw, config.maxDelayMs);
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof CancelledError || error instanceof BudgetExceededError) {
    return false;
  }
  if (error instanceof VexaError) {
    return error.retryable;
  }
  return false;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  options: RetryOptions = {}
): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;
  let attempt = 0;

  for (;;) {
    attempt += 1;
    if (options.signal?.aborted) {
      throw new CancelledError('Operation cancelled');
    }
    try {
      return await fn(attempt);
    } catch (error) {
      if (error instanceof CancelledError || error instanceof BudgetExceededError) {
        throw error;
      }
      if (!isRetryable(error) || attempt >= config.maxAttempts) {
        throw error;
      }
      let delayMs = computeBackoffDelay(attempt, config);
      if (error instanceof RateLimitError && typeof error.retryAfterMs === 'number') {
        delayMs = error.retryAfterMs;
      }
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
