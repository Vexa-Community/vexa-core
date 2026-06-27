import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
    setupFiles: ['tests/setup.ts'],
    env: {
      VEXA_ENV: 'test',
      VEXA_DATABASE_URL: ':memory:',
      VEXA_LOG_LEVEL: 'silent',
      VEXA_DEFAULT_PROVIDER: 'mock',
      VEXA_DEFAULT_MODEL: 'mock-model',
    },
  },
});
