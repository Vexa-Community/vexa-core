# Architecture

VEXA Core turns a project **goal** into a completed **run** by planning tasks, assigning them to
agents, executing them against model providers, and persisting everything that happens.

## High-level flow

```
Project (goal)
  └─ Run
       ├─ CEO task ──────────► plans tasks (CeoOutput)
       │                         │
       │                         ▼
       ├─ Specialist task(s) ─► produce artifacts (e.g. FrontendDevOutput → markdown)
       │                         │
       │                         ▼
       └─ QA task ────────────► reviews artifacts (QaOutput)
```

Every transition emits an **event**; every provider call is recorded as a **model call**; agent
deliverables are stored as **artifacts**.

## Modules

| Area | Path | Responsibility |
|---|---|---|
| Config | `src/config` | Environment parsing/validation (Zod) |
| Logging | `src/logging` | Pino logger with secret redaction |
| Errors | `src/shared/errors.ts` | Normalized error hierarchy (`VexaError`) |
| Storage | `src/storage` | Drizzle schema, SQLite connection, migrations |
| Domain | `src/projects`, `src/runs`, `src/tasks`, `src/agents`, `src/events`, `src/artifacts` | Types, Zod schemas, repositories |
| Providers | `src/providers` | Provider interface, mock + OpenAI-compatible, registry |
| Agents | `src/agents` | YAML loader, output schemas, execution engine |
| Orchestration | `src/orchestration` | Dependency resolver, retry policy, orchestrator, run manager |
| API | `src/api` | Fastify server, routes, schemas, error handler |
| CLI | `src/cli` | Commander commands |

## Run lifecycle (orchestrator)

`Orchestrator.executeRun(runId, signal)`:

1. Load the run and project; mark the run `running` and emit `run.started`.
2. Create the **CEO planning task** (status `ready`) assigned to the project's `ceo` agent.
3. Loop:
   - Select tasks whose status is `ready` (sequential execution in the MVP).
   - If none are ready and none are running: complete the run if all tasks are done, otherwise fail
     it (deadlock).
   - Execute the next ready task (see below).
   - Re-evaluate readiness: `blocked`/`pending` tasks whose dependencies are all `completed`
     transition to `ready`.
   - Honor the abort signal (graceful cancellation) and budget limits after each model call.
4. When the CEO task completes, its planned tasks are created (`blocked`), dependencies wired, and a
   QA review task is appended depending on all specialist tasks.
5. Specialist outputs are converted into artifacts (the frontend output becomes a markdown
   architecture document).

## Task state machine

Guarded transitions only (`src/tasks/task.state-machine.ts`):

```
pending  -> ready | blocked | cancelled
ready    -> running | cancelled
running  -> completed | failed | cancelled
failed   -> ready        (retry, attempts < maxAttempts)
blocked  -> ready        (dependencies complete)
```

Any other transition throws.

## Agent execution

`AgentEngine.executeTask` builds a system prompt (agent instructions) and a user message
(task + upstream dependency outputs), calls the resolved provider, and validates the structured
output against the agent's Zod schema (looked up by role). On invalid output it performs **one
correction attempt**, feeding the validation error back to the model, then throws
`InvalidOutputError` if it still fails. Every provider call is reported to a sink so the orchestrator
can record model calls and enforce budgets regardless of success or failure.

## Error handling and retries

Errors are normalized into a `VexaError` hierarchy with `code` and `retryable` flags. The retry
helper (`src/orchestration/retry.ts`) applies exponential backoff (capped by `maxDelayMs`), honors
`RateLimitError.retryAfterMs`, and never retries non-retryable errors. At the orchestrator level,
retryable task failures re-queue the task (`failed -> ready`) until `maxAttempts` is reached.

## Persistence

SQLite via better-sqlite3 and Drizzle ORM. JSON-shaped fields are stored as TEXT and parsed in the
repository layer. Migrations are generated with `drizzle-kit` and applied on startup.

## Observability

The complete event taxonomy: `project.created`, `run.queued|started|completed|failed|cancelled`,
`task.created|ready|started|completed|failed|retrying`, `agent.started|completed|failed`,
`model.requested|completed|failed`, and `artifact.created`.
