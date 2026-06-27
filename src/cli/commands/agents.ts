import path from 'node:path';
import { loadAgentsFromDir } from '../../agents/agent.loader.js';

export function runAgentsList(agentsDir = path.join(process.cwd(), 'agents')): void {
  const agents = loadAgentsFromDir(agentsDir);
  if (agents.length === 0) {
    process.stdout.write('No agents found.\n');
    return;
  }
  process.stdout.write('Loaded agents:\n');
  for (const agent of agents) {
    process.stdout.write(`- ${agent.slug} (${agent.role}): ${agent.name}\n`);
  }
}
