import { closeDb, runMigrations } from '../src/storage/database.js';
import { resetRunManager } from '../src/orchestration/run-manager.js';

export function resetDatabase(): void {
  closeDb();
  runMigrations();
}

export function resetTestState(): void {
  resetDatabase();
  resetRunManager();
}
