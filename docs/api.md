# REST API

The API is built with Fastify. All successful responses have the shape `{ data, meta }`. Errors have
the shape `{ error: { code, message, details } }`.

## Status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 404 | Not found |
| 409 | Conflict |
| 500 | Server error |

## Health

### `GET /health`
```json
{ "data": { "status": "ok", "version": "0.1.0", "uptime": 12.3 }, "meta": {} }
```

## Projects

### `POST /projects` → 201
Body: `{ "name": string, "goal": string, "description"?: string | null }`

### `GET /projects` → 200
Returns an array of projects.

### `GET /projects/:projectId` → 200 / 404
Returns a single project.

## Agents

### `POST /projects/:projectId/agents` → 201 / 404
Body:
```json
{
  "slug": "ceo",
  "name": "CEO Agent",
  "description": "Plans work",
  "role": "ceo",
  "instructions": "You are the CEO Agent...",
  "model": "gpt-4o",
  "provider": "openai",
  "tools": [],
  "maxIterations": 3,
  "maxOutputTokens": 2000,
  "enabled": true
}
```

### `GET /projects/:projectId/agents` → 200 / 404
Returns the agents registered to a project.

## Runs

### `POST /projects/:projectId/runs` → 201 / 404
Body: `{ "maxModelCalls"?: number | null, "maxCost"?: number | null }`
Creates and starts a run. The run executes asynchronously.

### `GET /projects/:projectId/runs` → 200 / 404
Returns a project's runs (newest first).

### `GET /runs/:runId` → 200 / 404
Returns the run plus a `taskSummary` (`total`, `completed`, `failed`, `running`).

### `POST /runs/:runId/cancel` → 200 / 404
Cancels a run. In-flight runs are aborted; queued runs are marked cancelled.

### `GET /runs/:runId/tasks` → 200 / 404
Returns the run's tasks.

### `GET /runs/:runId/events` → 200 / 404
Returns the run's events in chronological order.

### `GET /runs/:runId/artifacts` → 200 / 404
Returns the run's artifacts.

### `GET /runs/:runId/model-calls` → 200 / 404
Returns the run's recorded model calls.

## Error example

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [{ "path": ["name"], "message": "..." }]
  }
}
```

In production, `details` is omitted for unexpected server errors and stack traces are never
returned.
