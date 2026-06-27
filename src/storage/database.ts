import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { config } from '../config/config.js';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let dbInstance: Db | null = null;
let sqliteInstance: Database.Database | null = null;

export function getDb(): Db {
  if (!dbInstance) {
    const sqlite = new Database(config.databaseUrl);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqliteInstance = sqlite;
    dbInstance = drizzle(sqlite, { schema });
  }
  return dbInstance;
}

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export function runMigrations(): void {
  const db = getDb();
  migrate(db, { migrationsFolder });
}

export function closeDb(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}

export function resetDbForTests(): void {
  closeDb();
}
