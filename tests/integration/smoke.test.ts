import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/api/server.js';
import { runMigrations, closeDb } from '../../src/storage/database.js';

describe('smoke', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    runMigrations();
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    closeDb();
  });

  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toBe('0.1.0');
    expect(typeof body.data.uptime).toBe('number');
  });
});
