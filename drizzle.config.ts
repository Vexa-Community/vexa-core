import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/storage/schema.ts',
  out: './src/storage/migrations',
  dialect: 'sqlite',
  dbCredentials: { url: process.env.VEXA_DATABASE_URL ?? './vexa.db' },
});
