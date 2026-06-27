import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from '../config/config.js';
import { LOG_REDACT_PATHS } from '../logging/logger.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { healthRoutes } from './routes/health.js';
import { projectRoutes } from './routes/projects.js';
import { agentRoutes } from './routes/agents.js';
import { runRoutes } from './routes/runs.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.logLevel, redact: LOG_REDACT_PATHS },
    bodyLimit: 1024 * 1024,
  });

  await app.register(cors);
  await app.register(helmet);

  registerErrorHandler(app);

  await app.register(healthRoutes);
  await app.register(projectRoutes);
  await app.register(agentRoutes);
  await app.register(runRoutes);

  return app;
}
