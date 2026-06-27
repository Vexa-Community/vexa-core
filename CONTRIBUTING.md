# Contributing to VEXA Core

Thanks for your interest in contributing. This document covers how to get set up and the
expectations for changes.

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm test
```

## Development workflow

1. Create a branch for your change.
2. Make your change with accompanying tests.
3. Run the full check suite locally before opening a PR:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build
   ```

4. Open a pull request describing the change and its motivation.

## Project layout

- `src/` — engine, API, CLI, storage, providers, agents (see `docs/architecture.md`)
- `agents/` — declarative agent definitions (YAML)
- `examples/` — runnable example projects
- `tests/` — `unit/`, `integration/`, and `e2e/` suites

## Coding standards

- TypeScript strict mode; avoid `any` (lint enforces this — document any rare exception).
- Use `.js` extensions in relative imports (NodeNext module resolution).
- Validate all external input with Zod at system boundaries.
- Prefer small, focused modules and pure functions where practical.
- Comments explain *why*, not *what*. Let names carry the *what*.
- Generate IDs with `nanoid`; store timestamps as ISO 8601 strings.
- JSON columns are stored as TEXT and parsed/stringified in the repository layer.

## Tests

- Unit tests cover pure logic (state machine, dependency resolver, retry, errors, redaction).
- Integration tests cover repositories, the agent engine, the orchestrator, and the API.
- The E2E test drives the full three-agent workflow through the HTTP layer.
- Tests run against an in-memory SQLite database and the deterministic mock provider.

## Adding a provider

Implement the `ModelProvider` interface (`src/providers/provider.interface.ts`) and register it in
`createDefaultRegistry`. See `docs/providers.md`.

## Adding an agent

Add a YAML file under `agents/` and, if it produces structured output, register a Zod schema in
`src/agents/agent.schema.ts`. See `docs/agents.md`.

## Reporting issues

Please include reproduction steps, expected vs. actual behavior, and environment details.
