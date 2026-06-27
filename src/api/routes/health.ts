import type { FastifyInstance } from 'fastify';

const startedAt = Date.now();
const version = '0.1.0';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return {
      data: {
        status: 'ok',
        version,
        uptime: (Date.now() - startedAt) / 1000,
      },
      meta: {},
    };
  });
}
