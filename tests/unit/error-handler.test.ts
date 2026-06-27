import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { registerErrorHandler } from '../../src/api/plugins/error-handler.js';

describe('API error handler', () => {
  it('does not leak secrets in error responses', async () => {
    const app = Fastify({ logger: false });
    registerErrorHandler(app);
    app.get('/boom', async () => {
      throw new Error('provider failed with sk-1234567890');
    });

    const res = await app.inject({ method: 'GET', url: '/boom' });
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('sk-1234567890');
    expect(res.body).toContain('[REDACTED]');
    await app.close();
  });
});
