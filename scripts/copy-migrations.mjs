import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'src', 'storage', 'migrations');
const dest = path.join(root, 'dist', 'storage', 'migrations');

if (!existsSync(src)) {
  console.error(`Migrations source not found: ${src}. Run "pnpm db:generate" first.`);
  process.exit(1);
}

cpSync(src, dest, { recursive: true });
console.log(`Copied migrations to ${dest}`);
