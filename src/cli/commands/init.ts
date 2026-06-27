import fs from 'node:fs';
import path from 'node:path';

const ENV_EXAMPLE = `VEXA_ENV=development
VEXA_HOST=0.0.0.0
VEXA_PORT=3000
VEXA_DATABASE_URL=./vexa.db
VEXA_ARTIFACTS_DIR=./artifacts
VEXA_LOG_LEVEL=info
VEXA_DEFAULT_PROVIDER=mock
VEXA_DEFAULT_MODEL=mock-model
# VEXA_API_KEY=your-api-key-here
# VEXA_PROVIDER_BASE_URL=https://api.openai.com/v1
`;

const EXAMPLE_PROJECT = `name: SaaS Landing Page
goal: "Create a technical architecture plan for a modern, accessible SaaS landing page with a dark premium design."
description: "MVP example project demonstrating VEXA Core's three-agent workflow."
agents:
  - ceo
  - frontend-developer
  - qa-reviewer
run:
  maxModelCalls: 20
  maxCost: 1.00
expectedArtifacts:
  - name: frontend-architecture
    type: markdown
`;

export function runInit(cwd: string = process.cwd()): void {
  const envPath = path.join(cwd, '.env.example');
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, ENV_EXAMPLE, 'utf8');
    process.stdout.write(`Created ${envPath}\n`);
  } else {
    process.stdout.write(`.env.example already exists, skipping\n`);
  }

  const agentsDir = path.join(cwd, 'agents');
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
    process.stdout.write(`Created ${agentsDir}\n`);
  }

  const exampleDir = path.join(cwd, 'examples', 'landing-page-project');
  const examplePath = path.join(exampleDir, 'project.yaml');
  if (!fs.existsSync(examplePath)) {
    fs.mkdirSync(exampleDir, { recursive: true });
    fs.writeFileSync(examplePath, EXAMPLE_PROJECT, 'utf8');
    process.stdout.write(`Created ${examplePath}\n`);
  } else {
    process.stdout.write(`Example project already exists, skipping\n`);
  }

  process.stdout.write('VEXA Core initialized.\n');
}
