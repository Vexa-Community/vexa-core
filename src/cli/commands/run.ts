import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { runMigrations } from '../../storage/database.js';
import { createProject, updateProjectStatus } from '../../projects/project.repository.js';
import { createRun, getRun } from '../../runs/run.repository.js';
import { listTasksForRun } from '../../tasks/task.repository.js';
import { listModelCallsForRun } from '../../runs/model-call.repository.js';
import { listArtifactsForRun } from '../../artifacts/artifact.repository.js';
import { recordEvent, listEventsForRun } from '../../events/event.repository.js';
import { createAgent, getAgentBySlugForProject } from '../../agents/agent.repository.js';
import { loadAgentsFromDir, toCreateAgentInput } from '../../agents/agent.loader.js';
import { getRunManager } from '../../orchestration/run-manager.js';
import { ConfigurationError } from '../../shared/errors.js';

const ProjectFileSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  description: z.string().nullable().optional(),
  agents: z.array(z.string()).min(1),
  run: z
    .object({
      maxModelCalls: z.number().int().positive().optional(),
      maxCost: z.number().positive().optional(),
    })
    .optional(),
});

function out(line: string): void {
  process.stdout.write(`${line}\n`);
}

export async function runProject(projectFile: string, agentsDir = path.join(process.cwd(), 'agents')): Promise<void> {
  runMigrations();
  const absFile = path.resolve(projectFile);
  if (!fs.existsSync(absFile)) {
    throw new ConfigurationError(`Project file not found: ${absFile}`);
  }
  const parsed = ProjectFileSchema.parse(yaml.load(fs.readFileSync(absFile, 'utf8')));

  const project = createProject({
    name: parsed.name,
    goal: parsed.goal,
    description: parsed.description ?? null,
  });
  updateProjectStatus(project.id, 'active');
  recordEvent({ projectId: project.id, type: 'project.created', payload: { name: project.name } });

  const available = loadAgentsFromDir(agentsDir);
  const bySlug = new Map(available.map((a) => [a.slug, a]));
  for (const slug of parsed.agents) {
    const cfg = bySlug.get(slug);
    if (!cfg) throw new ConfigurationError(`Agent not found in ${agentsDir}: ${slug}`);
    if (!getAgentBySlugForProject(project.id, slug)) {
      createAgent(toCreateAgentInput(cfg, project.id));
    }
  }

  const run = createRun({
    projectId: project.id,
    maxModelCalls: parsed.run?.maxModelCalls ?? null,
    maxCost: parsed.run?.maxCost ?? null,
  });
  recordEvent({ projectId: project.id, runId: run.id, type: 'run.queued', payload: {} });

  out('VEXA Core\n');
  out(`Project: ${project.name}`);
  out(`Run: ${run.id}\n`);

  const manager = getRunManager();
  manager.startRun(run.id);
  await manager.waitForRun(run.id);

  renderRunNarrative(run.id);

  const finalRun = getRun(run.id);
  const calls = listModelCallsForRun(run.id);
  const artifacts = listArtifactsForRun(run.id);
  out(`\nStatus: ${finalRun?.status ?? 'unknown'}`);
  out(`Model calls: ${calls.length}`);
  out(`Artifacts: ${artifacts.length}`);
}

function renderRunNarrative(runId: string): void {
  const events = listEventsForRun(runId);
  for (const evt of events) {
    const title = typeof evt.payload.title === 'string' ? evt.payload.title : '';
    switch (evt.type) {
      case 'agent.started':
        out(`[${evt.payload.slug ?? 'agent'}] working...`);
        break;
      case 'task.completed':
        out(`  task completed`);
        break;
      case 'artifact.created':
        out(`  artifact created: ${evt.payload.name ?? ''}`);
        break;
      case 'task.created':
        if (title) out(`  planned task: ${title}`);
        break;
      default:
        break;
    }
  }
}

export function runStatus(runId: string): void {
  runMigrations();
  const run = getRun(runId);
  if (!run) {
    out(`Run not found: ${runId}`);
    return;
  }
  const tasks = listTasksForRun(runId);
  out(`Run ${run.id}`);
  out(`Status: ${run.status}`);
  out(`Tasks: ${tasks.length}`);
  out(`Model calls: ${run.currentModelCalls}`);
  out(`Estimated cost: ${run.estimatedCost}`);
}

export function runCancel(runId: string): void {
  runMigrations();
  const run = getRun(runId);
  if (!run) {
    out(`Run not found: ${runId}`);
    return;
  }
  getRunManager().cancelRun(runId);
  out(`Run ${runId} cancelled.`);
}
