import os from 'node:os';
import path from 'node:path';

process.env.VEXA_ENV = 'test';
process.env.VEXA_DATABASE_URL = ':memory:';
process.env.VEXA_DEFAULT_PROVIDER = 'mock';
process.env.VEXA_DEFAULT_MODEL = 'mock-model';
process.env.VEXA_LOG_LEVEL = 'silent';
process.env.VEXA_ARTIFACTS_DIR = path.join(os.tmpdir(), 'vexa-test-artifacts');
