# Security Policy

## Reporting a vulnerability

Please report security issues privately to the maintainers rather than opening a public issue.
Include a description, reproduction steps, and the potential impact. We will acknowledge receipt
and work with you on a fix and coordinated disclosure.

## Security model and protections

VEXA Core handles model-provider credentials and writes agent-generated artifacts to disk, so the
engine includes the following protections:

### Secret handling
- API keys and authorization headers are **redacted** from logs via Pino's `redact` configuration
  (`req.headers.authorization`, `apiKey`, `*.apiKey`, `config.apiKey`).
- The `apiKey` config value is **never returned** by any API response.
- A general-purpose `redact()` helper masks sensitive keys (api key, authorization, secret,
  password, token) in arbitrary structures before they are logged.

### Input validation
- All API request bodies and params are validated with **Zod** before use.
- Agent YAML and project YAML are validated with Zod before being persisted or executed.
- The HTTP body size limit is **1 MB**.

### Filesystem safety
- Artifact filenames are rejected if they contain `..`, path separators, or are absolute.
- Resolved artifact paths must stay within the configured artifacts directory; any path that would
  escape it is rejected with a validation error.

### Error handling
- In production, error responses **do not include stack traces** or internal messages; a generic
  message is returned instead. Stack details are only included in non-production environments.

### Process lifecycle
- The server installs **SIGTERM/SIGINT** handlers for graceful shutdown (closing HTTP connections
  and the database).

### HTTP hardening
- Security headers are applied via `@fastify/helmet`, and CORS is configured via `@fastify/cors`.

## Supported versions

This is a 0.x project under active development; security fixes target the latest `main`.
