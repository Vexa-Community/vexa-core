import { describe, it, expect, vi } from 'vitest';
import { withRetry, computeBackoffDelay, DEFAULT_RETRY_CONFIG } from '../../src/orchestration/retry.js';
import {
  RateLimitError,
  AuthenticationError,
  BudgetExceededError,
  CancelledError,
  InvalidOutputError,
  ProviderError,
} from '../../src/shared/errors.js';

const noSleep = async (): Promise<void> => {};

describe('retry', () => {
  it('retries RateLimitError and eventually succeeds', async () => {
    const fn = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new RateLimitError('slow down', 5))
      .mockResolvedValueOnce('ok');
    const result = await withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep: noSleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry AuthenticationError', async () => {
    const fn = vi.fn().mockRejectedValue(new AuthenticationError('nope'));
    await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep: noSleep })).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry InvalidOutputError', async () => {
    const fn = vi.fn().mockRejectedValue(new InvalidOutputError('bad structure'));
    await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep: noSleep })).rejects.toBeInstanceOf(
      InvalidOutputError
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops immediately on BudgetExceededError', async () => {
    const fn = vi.fn().mockRejectedValue(new BudgetExceededError('too much'));
    await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep: noSleep })).rejects.toBeInstanceOf(
      BudgetExceededError
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exponential backoff respects maxDelayMs', () => {
    const config = { maxAttempts: 10, initialDelayMs: 1000, multiplier: 2, maxDelayMs: 5000 };
    expect(computeBackoffDelay(1, config)).toBe(1000);
    expect(computeBackoffDelay(2, config)).toBe(2000);
    expect(computeBackoffDelay(3, config)).toBe(4000);
    expect(computeBackoffDelay(4, config)).toBe(5000);
    expect(computeBackoffDelay(10, config)).toBe(5000);
  });

  it('uses retryAfterMs from RateLimitError for the delay', async () => {
    const delays: number[] = [];
    const sleep = async (ms: number): Promise<void> => {
      delays.push(ms);
    };
    const fn = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new RateLimitError('slow down', 1234))
      .mockResolvedValueOnce('ok');
    await withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep });
    expect(delays).toEqual([1234]);
  });

  it('throws after all attempts are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new ProviderError('always fails'));
    await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep: noSleep })).rejects.toBeInstanceOf(
      ProviderError
    );
    expect(fn).toHaveBeenCalledTimes(DEFAULT_RETRY_CONFIG.maxAttempts);
  });

  it('does not retry CancelledError', async () => {
    const fn = vi.fn().mockRejectedValue(new CancelledError('cancelled'));
    await expect(withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep: noSleep })).rejects.toBeInstanceOf(
      CancelledError
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('aborts immediately when AbortSignal is already aborted', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const controller = new AbortController();
    controller.abort();
    await expect(
      withRetry(fn, DEFAULT_RETRY_CONFIG, { sleep: noSleep, signal: controller.signal })
    ).rejects.toBeInstanceOf(CancelledError);
    expect(fn).toHaveBeenCalledTimes(0);
  });
});
