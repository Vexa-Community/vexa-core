import readline from 'node:readline';
import { runMigrations } from '../../storage/database.js';
import { createProject } from '../../projects/project.repository.js';

interface ProjectCreateOptions {
  name?: string;
  goal?: string;
  description?: string;
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

export async function runProjectCreate(options: ProjectCreateOptions): Promise<void> {
  runMigrations();

  let { name, goal, description } = options;

  if (!name || !goal) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      if (!name) name = await ask(rl, 'Project name: ');
      if (!goal) goal = await ask(rl, 'Project goal: ');
      if (description === undefined) description = await ask(rl, 'Description (optional): ');
    } finally {
      rl.close();
    }
  }

  const project = createProject({
    name: name!,
    goal: goal!,
    description: description ? description : null,
  });

  process.stdout.write(`Created project ${project.id}: ${project.name}\n`);
}
