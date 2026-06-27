#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runDoctor } from './commands/doctor.js';
import { runProjectCreate } from './commands/project.js';
import { runProject, runStatus, runCancel } from './commands/run.js';
import { runAgentsList } from './commands/agents.js';

const program = new Command();

program.name('vexa').description('VEXA Core orchestration engine CLI').version('0.1.0');

program
  .command('init')
  .description('Scaffold .env.example, agents directory, and an example project')
  .action(() => {
    runInit();
  });

program
  .command('doctor')
  .description('Check environment, database, agents, provider config, and artifacts directory')
  .action(() => {
    const ok = runDoctor();
    if (!ok) process.exitCode = 1;
  });

const project = program.command('project').description('Project commands');
project
  .command('create')
  .description('Create a project')
  .option('--name <name>', 'Project name')
  .option('--goal <goal>', 'Project goal')
  .option('--description <description>', 'Project description')
  .action(async (options) => {
    await runProjectCreate(options);
  });

program
  .command('run')
  .description('Run a project from YAML, or check/cancel a run')
  .argument('[arg]', 'project YAML file, or "status" / "cancel"')
  .argument('[value]', 'run id when using status/cancel')
  .action(async (arg?: string, value?: string) => {
    if (!arg) {
      process.stdout.write('Usage: vexa run <project.yaml> | vexa run status <runId> | vexa run cancel <runId>\n');
      return;
    }
    if (arg === 'status') {
      if (!value) {
        process.stdout.write('Usage: vexa run status <runId>\n');
        return;
      }
      runStatus(value);
      return;
    }
    if (arg === 'cancel') {
      if (!value) {
        process.stdout.write('Usage: vexa run cancel <runId>\n');
        return;
      }
      runCancel(value);
      return;
    }
    await runProject(arg);
  });

const agents = program.command('agents').description('Agent commands');
agents
  .command('list')
  .description('List loaded agents')
  .action(() => {
    runAgentsList();
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
