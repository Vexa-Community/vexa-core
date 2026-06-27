# Development

## Prerequisites

- Node.js 22+ (developed against Node 26)
- pnpm

> Note: `better-sqlite3` is a native module. This project pins a version with prebuilt binaries for
> current Node releases. If you change Node major versions, run `pnpm rebuild better-sqlite3`.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `VEXA_ENV` | `development` | `development` \| `production` \| `test` |
| `VEXA_HOST` | `0.0.0.0` | API bind host |
| `VEXA_PORT` | `3000` | API port |
| `VEXA_DATABASE_URL` | `./vexa.db` | SQLite file path (or `:memory:`) |
| `VEXA_ARTIFACTS_DIR` | `./artifacts` | Where artifacts are written |
| `VEXA_LOG_LEVEL` | `info` | Pino level (`trace`..`fatal`, `silent`) |
| `VEXA_DEFAULT_PROVIDER` | `mock` | Fallback provider name |
| `VEXA_DEFAULT_MODEL` | `mock-model` | Fallback model name |
| `VEXA_API_KEY` | – | Provider API key (never logged or returned) |
| `VEXA_PROVIDER_BASE_URL` | – | OpenAI-compatible base URL |

## Running

```bash
pnpm dev                # API with watch mode (migrations run on boot)
pnpm cli doctor         # environment + config diagnostics
pnpm cli run examples/landing-page-project/project.yaml
```

## Quality gates

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm test:coverage` produces a coverage report.

## Database & migrations

The Drizzle schema lives in `src/storage/schema.ts`. After changing it:

```bash
pnpm db:generate        # write a new SQL migration under src/storage/migrations
```

Migrations are applied automatically on server startup and in tests via the migrator (so they work
against `:memory:` too).

## Testing notes

- Tests set `VEXA_ENV=test`, `VEXA_DATABASE_URL=:memory:`, and use the mock provider
  (`tests/setup.ts`).
- Use `resetDatabase()` from `tests/helpers.ts` in `beforeEach` to get an isolated in-memory DB.
- Suites: `tests/unit`, `tests/integration`, `tests/e2e`.

## Conventions

- NodeNext modules: use `.js` extensions in relative imports.
- IDs via `nanoid`; timestamps as ISO 8601 strings.
- Validate external input with Zod at boundaries.
- Keep `any` out of the codebase (lint-enforced).
