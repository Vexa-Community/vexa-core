# Agents

Agents are declarative roles defined in YAML under `agents/`. Each agent has instructions, a target
model/provider, and (optionally) a structured output schema validated with Zod.

## YAML format

```yaml
slug: ceo                # unique identifier
name: CEO Agent          # display name
description: ...         # what the agent does
role: ceo                # role used for routing and schema lookup
instructions: |          # system prompt
  You are the CEO Agent. ...
model: gpt-4o            # model name
provider: openai         # provider name (falls back to default if unregistered)
maxIterations: 3
maxOutputTokens: 2000
enabled: true
outputSchema: ceo        # optional schema key
```

Validation is performed by `AgentYamlSchema` (`src/agents/agent.schema.ts`). Missing required
fields (`slug`, `name`, `description`, `role`, `instructions`, `model`, `provider`) or empty values
cause a `ConfigurationError` at load time.

## Reference agents

| Slug | Role | Output |
|---|---|---|
| `ceo` | `ceo` | A summary and a list of planned tasks with dependencies |
| `frontend-developer` | `frontend-developer` | A frontend architecture (pages, components, state, data flow, a11y, testing) |
| `qa-reviewer` | `qa-reviewer` | A pass/fail verdict with issues and required corrections |

## Output schemas

Structured outputs are validated against Zod schemas, resolved by the agent's `role`:

```ts
CeoOutputSchema          // { summary, tasks: [{ id, title, description, assignedRole, dependsOn, expectedOutput }] }
FrontendDevOutputSchema  // { summary, architecture: {...}, risks, assumptions }
QaOutputSchema           // { passed, summary, issues: [{ severity, description, recommendation }], requiredCorrections }
```

If validation fails, the engine performs one correction attempt (feeding the validation error back
to the model) before throwing `InvalidOutputError`.

## Loading and registering agents

- `loadAgentsFromDir(dir)` reads and validates all `*.yaml`/`*.yml` files in a directory.
- `toCreateAgentInput(yaml, projectId)` converts a parsed config into a repository input.
- The CLI's `run` command loads agents from `agents/` and registers the ones referenced by the
  project file. The REST API registers agents via `POST /projects/:projectId/agents`.

## Adding a new agent

1. Create `agents/<slug>.yaml`.
2. If the agent produces structured output, add a Zod schema and map it by role in
   `getOutputSchema` (`src/agents/agent.schema.ts`).
3. Reference the agent's slug from a project file or register it through the API.

## Roles and orchestration

The orchestrator special-cases two roles: `ceo` (its output becomes the task plan) and
`frontend-developer` (its output becomes a markdown artifact). A `qa-reviewer` task is appended
automatically when that role is present. Other roles execute and persist their output without
special handling.
