import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config/config.js';
import { runMigrations, getDb } from '../../storage/database.js';
import { loadAgentsFromDir } from '../../agents/agent.loader.js';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export function runDoctor(cwd: string = process.cwd()): boolean {
  const checks: Check[] = [];

  checks.push({
    name: 'Environment',
    ok: true,
    detail: `env=${config.env}, provider=${config.defaultProvider}, model=${config.defaultModel}`,
  });

  try {
    runMigrations();
    getDb();
    checks.push({ name: 'Database', ok: true, detail: `migrations applied (${config.databaseUrl})` });
  } catch (err) {
    checks.push({ name: 'Database', ok: false, detail: (err as Error).message });
  }

  const agentsDir = path.join(cwd, 'agents');
  try {
    const agents = loadAgentsFromDir(agentsDir);
    checks.push({ name: 'Agent YAMLs', ok: true, detail: `${agents.length} valid agent(s)` });
  } catch (err) {
    checks.push({ name: 'Agent YAMLs', ok: false, detail: (err as Error).message });
  }

  const providerOk =
    config.defaultProvider === 'mock' || Boolean(config.apiKey && config.providerBaseUrl);
  checks.push({
    name: 'Provider config',
    ok: providerOk,
    detail: providerOk
      ? 'provider configuration present'
      : 'non-mock provider requires VEXA_API_KEY and VEXA_PROVIDER_BASE_URL',
  });

  const artifactsDir = path.resolve(config.artifactsDir);
  try {
    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.accessSync(artifactsDir, fs.constants.W_OK);
    checks.push({ name: 'Artifacts dir', ok: true, detail: artifactsDir });
  } catch (err) {
    checks.push({ name: 'Artifacts dir', ok: false, detail: (err as Error).message });
  }

  process.stdout.write('VEXA Core doctor\n\n');
  let allOk = true;
  for (const check of checks) {
    const mark = check.ok ? 'OK ' : 'FAIL';
    if (!check.ok) allOk = false;
    process.stdout.write(`[${mark}] ${check.name}: ${check.detail}\n`);
  }
  process.stdout.write(`\n${allOk ? 'All checks passed.' : 'Some checks failed.'}\n`);
  return allOk;
}
