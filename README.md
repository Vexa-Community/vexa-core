# VEXA Core

VEXA Core is an open-source TypeScript orchestration engine for structured teams of AI agents.
It models a project as a goal, plans it into a dependency graph of tasks, assigns those tasks to
role-based agents, executes them against pluggable model providers, and records every event,
model call, and artifact along the way.

The reference workflow ships three agents — a **CEO** that plans, a **Frontend Developer** that
produces a technical architecture, and a **QA Reviewer** that validates the result — but the
engine is generic: agents are declarative YAML, providers are pluggable, and outputs are validated
with Zod schemas.

## Features

- Goal-to-tasks planning with an explicit, validated dependency graph
- Deterministic task **state machine** with guarded transitions
- Pluggable **model providers** (mock + OpenAI-compatible) behind a single interface
- Structured agent output validated with **Zod**, with one automatic correction attempt
- Full **observability**: events, model calls, messages, and artifacts persisted to SQLite
- Budget controls (`maxModelCalls`, `maxCost`) and graceful cancellation
- Normalized error model with retryable/non-retryable classification and exponential backoff
- **REST API** (Fastify) and a **CLI** (Commander) over the same engine
- Strict TypeScript, Drizzle ORM migrations, Pino logging with secret redaction

## Tech stack

TypeScript (strict) · Node.js · Fastify · Zod · SQLite + Drizzle ORM · better-sqlite3 ·
Pino · Vitest · Commander · js-yaml · ESLint + Prettier.

## Requirements

- Node.js 22+ (developed against Node 26)
- pnpm

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm db:generate        # generate SQL migrations from the Drizzle schema
pnpm dev                # start the API (runs migrations on boot)
```

Run the bundled example end-to-end with the CLI (uses the deterministic mock provider):

```bash
pnpm cli run examples/landing-page-project/project.yaml
```

Expected output:

```
VEXA Core

Project: SaaS Landing Page
Run: run_xxxx

  planned task: Plan project
[ceo] working...
  task completed
  planned task: Create Frontend Architecture
  planned task: Review architecture
[frontend-developer] working...
  task completed
  artifact created: frontend-architecture
[qa-reviewer] working...
  task completed

Status: completed
Model calls: 3
Artifacts: 1
```

Check your environment at any time:

```bash
pnpm cli doctor
```

## CLI

| Command | Description |
|---|---|
| `vexa init` | Scaffold `.env.example`, `agents/`, and an example project |
| `vexa doctor` | Check env, DB, agent YAMLs, provider config, artifacts dir |
| `vexa project create` | Create a project (flags or interactive prompts) |
| `vexa run <project.yaml>` | Run a project from YAML and stream progress |
| `vexa run status <runId>` | Show run status |
| `vexa run cancel <runId>` | Cancel a run |
| `vexa agents list` | List agents loaded from `agents/` |

## REST API

Responses are `{ data, meta }` on success and `{ error: { code, message, details } }` on failure.

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness, version, uptime |
| `POST /projects` | Create a project |
| `GET /projects` | List projects |
| `GET /projects/:projectId` | Get a project |
| `POST /projects/:projectId/agents` | Register an agent to a project |
| `GET /projects/:projectId/agents` | List a project's agents |
| `POST /projects/:projectId/runs` | Start a run |
| `GET /projects/:projectId/runs` | List a project's runs |
| `GET /runs/:runId` | Get a run with a task summary |
| `POST /runs/:runId/cancel` | Cancel a run |
| `GET /runs/:runId/tasks` | List a run's tasks |
| `GET /runs/:runId/events` | List a run's events |
| `GET /runs/:runId/artifacts` | List a run's artifacts |
| `GET /runs/:runId/model-calls` | List a run's model calls |

See [docs/api.md](docs/api.md) for full details.

## Scripts

```bash
pnpm dev            # watch-mode API server
pnpm build          # compile to dist/
pnpm start          # run the compiled server
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint src tests
pnpm test           # vitest run
pnpm test:coverage  # vitest with coverage
pnpm db:generate    # drizzle-kit generate
pnpm db:migrate     # drizzle-kit migrate
pnpm cli <command>  # run the CLI via tsx
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — system design and run lifecycle
- [docs/providers.md](docs/providers.md) — provider interface and writing a provider
- [docs/agents.md](docs/agents.md) — agent YAML format and output schemas
- [docs/api.md](docs/api.md) — REST API reference
- [docs/development.md](docs/development.md) — local development workflow

## Security

See [SECURITY.md](SECURITY.md). Secrets are redacted from logs, API keys are never returned by the
API, artifact paths are sandboxed to the configured artifacts directory, and stack traces are
suppressed in production responses.

## License

Apache-2.0. See [LICENSE](LICENSE).
