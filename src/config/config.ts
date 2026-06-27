import { z } from 'zod';
import * as dotenv from 'dotenv';
import { ConfigurationError } from '../shared/errors.js';

dotenv.config();

const ConfigSchema = z.object({
  env: z.enum(['development', 'production', 'test']).default('development'),
  host: z.string().default('0.0.0.0'),
  port: z.number().int().positive().max(65535).default(3000),
  databaseUrl: z.string().default('./vexa.db'),
  artifactsDir: z.string().default('./artifacts'),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  defaultProvider: z.string().default('mock'),
  defaultModel: z.string().default('mock-model'),
  apiKey: z.string().optional(),
  providerBaseUrl: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse({
    env: env.VEXA_ENV,
    host: env.VEXA_HOST,
    port: env.VEXA_PORT ? Number(env.VEXA_PORT) : undefined,
    databaseUrl: env.VEXA_DATABASE_URL,
    artifactsDir: env.VEXA_ARTIFACTS_DIR,
    logLevel: env.VEXA_LOG_LEVEL,
    defaultProvider: env.VEXA_DEFAULT_PROVIDER,
    defaultModel: env.VEXA_DEFAULT_MODEL,
    apiKey: env.VEXA_API_KEY,
    providerBaseUrl: env.VEXA_PROVIDER_BASE_URL,
  });
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ConfigurationError(`Invalid configuration: ${details}`);
  }
  return result.data;
}

export const config: Config = loadConfig();
