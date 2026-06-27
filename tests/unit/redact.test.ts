import { describe, it, expect } from 'vitest';
import pino from 'pino';
import { LOG_REDACT_PATHS } from '../../src/logging/logger.js';
import { redact, redactText, safeErrorResponse } from '../../src/security/redact.js';

describe('redact', () => {
  it('redacts api keys from objects', () => {
    const input = { apiKey: 'secret-123', name: 'vexa' };
    const output = redact(input) as Record<string, unknown>;
    expect(output.apiKey).toBe('[REDACTED]');
    expect(output.name).toBe('vexa');
  });

  it('redacts authorization headers nested in objects', () => {
    const input = { req: { headers: { authorization: 'Bearer xyz', accept: 'json' } } };
    const output = redact(input) as { req: { headers: Record<string, unknown> } };
    expect(output.req.headers.authorization).toBe('[REDACTED]');
    expect(output.req.headers.accept).toBe('json');
  });

  it('redacts token and password keys', () => {
    const input = { token: 'abc', password: 'pw', other: 1 };
    const output = redact(input) as Record<string, unknown>;
    expect(output.token).toBe('[REDACTED]');
    expect(output.password).toBe('[REDACTED]');
    expect(output.other).toBe(1);
  });

  it('redacts secret-looking strings', () => {
    expect(redactText('authorization: Bearer abc.def-123')).toBe('authorization: [REDACTED]');
    expect(redactText('key sk-1234567890')).toBe('key [REDACTED]');
    expect(redactText('exact secret leaked', ['secret'])).toBe('exact [REDACTED] leaked');
  });

  it('omits stack traces from production error responses', () => {
    const err = new Error('boom');
    const prod = safeErrorResponse(err, { includeStack: false });
    expect(prod.details).toBeNull();
    const dev = safeErrorResponse(err, { includeStack: true });
    expect(dev.details).toContain('boom');
  });

  it('redacts secrets from error responses', () => {
    const err = new Error('failed with sk-1234567890');
    expect(JSON.stringify(safeErrorResponse(err, { includeStack: true }))).not.toContain(
      'sk-1234567890'
    );
  });

  it('redacts secrets from structured error logs', () => {
    let line = '';
    const stream = { write: (chunk: string): void => void (line += chunk) };
    const log = pino({ redact: LOG_REDACT_PATHS }, stream);
    log.error({ err: new Error('failed with sk-1234567890'), apiKey: 'sk-abcdefgh' }, 'request failed');
    expect(line).not.toContain('sk-1234567890');
    expect(line).not.toContain('sk-abcdefgh');
  });
});
