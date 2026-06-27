import { buildServer } from './api/server.js';
import { runMigrations, closeDb } from './storage/database.js';
import { config } from './config/config.js';
import { logger } from './logging/logger.js';

async function main(): Promise<void> {
  runMigrations();
  logger.info('migrations applied');

  const app = await buildServer();

  await app.listen({ host: config.host, port: config.port });
  logger.info({ host: config.host, port: config.port }, 'VEXA Core API listening');

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
      closeDb();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'failed to start');
  process.exit(1);
});
