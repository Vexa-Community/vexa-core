# Providers

A provider adapts an LLM (or a deterministic stand-in) to VEXA Core's `ModelProvider` interface.
Agents reference a provider by name; the engine resolves the provider from the registry and falls
back to the configured default provider when the named one is not registered.

## Interface

```ts
interface ModelProvider {
  readonly name: string;
  validateConfiguration(): Promise<void>;
  generate(request: ModelRequest): Promise<ModelResponse>;
  stream?(request: ModelRequest): AsyncIterable<ModelStreamChunk>;
}
```

`ModelRequest` includes `model`, `systemPrompt`, `messages`, optional `temperature`, `maxTokens`,
`responseSchema` (Zod), `metadata`, and an `AbortSignal`. `ModelResponse` returns `content`,
optional `structuredOutput`, token counts, `estimatedCost`, `finishReason`, and
`providerMetadata`.

## Built-in providers

### Mock provider (`mock`)

Deterministic provider used for tests, the example workflow, and offline development. It selects a
canned structured response based on `request.metadata.role` (`ceo`, `frontend-developer`,
`qa-reviewer`). It also supports failure modes for exercising the engine and retry logic:

| Mode | Behavior |
|---|---|
| `success` | Returns valid structured JSON for the agent role |
| `invalid-output` | Returns non-JSON content (triggers a correction attempt) |
| `timeout` | Throws `TimeoutError` (retryable) |
| `rate-limit` | Throws `RateLimitError` (retryable, with `retryAfterMs`) |
| `auth-failure` | Throws `AuthenticationError` (not retryable) |
| `provider-failure` | Throws `ProviderError` (retryable) |

```ts
new MockProvider('success');
```

### OpenAI-compatible provider (`openai-compatible` / `openai`)

Calls a `/chat/completions` endpoint on any OpenAI-compatible API. Configure it via environment:

```
VEXA_API_KEY=sk-...
VEXA_PROVIDER_BASE_URL=https://api.openai.com/v1
```

It maps HTTP responses to normalized errors: `401/403 → AuthenticationError`,
`429 → RateLimitError` (honoring `Retry-After`), other non-2xx → `ProviderError`, and aborts →
`TimeoutError`.

## Registering a provider

Providers live in a `ProviderRegistry`. The default registry always includes the mock provider and
adds the OpenAI-compatible provider when `VEXA_PROVIDER_BASE_URL` and `VEXA_API_KEY` are set
(`createDefaultRegistry` in `src/providers/provider.registry.ts`).

```ts
const registry = new ProviderRegistry();
registry.register(new MockProvider('success'));
registry.register(new MyProvider());
```

## Writing a new provider

1. Implement `ModelProvider`.
2. Normalize failures into the error classes in `src/shared/errors.ts` so retry behavior is correct.
3. Populate token counts and `estimatedCost` so budget enforcement works.
4. Register it in `createDefaultRegistry` (or your own registry).

Unknown provider names throw `ConfigurationError` when resolved.
