import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../../src/providers/provider.registry.js';
import { MockProvider } from '../../src/providers/mock.provider.js';
import { ConfigurationError } from '../../src/shared/errors.js';
import type { ModelRequest } from '../../src/providers/provider.interface.js';

describe('provider registry', () => {
  it('registers and retrieves a provider by name', () => {
    const registry = new ProviderRegistry();
    const provider = new MockProvider('success');
    registry.register(provider);
    expect(registry.has('mock')).toBe(true);
    expect(registry.get('mock')).toBe(provider);
    expect(registry.list()).toContain('mock');
  });

  it('throws ConfigurationError for an unknown provider', () => {
    const registry = new ProviderRegistry();
    expect(() => registry.get('does-not-exist')).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError for a duplicate provider name', () => {
    const registry = new ProviderRegistry();
    registry.register(new MockProvider('success'));
    expect(() => registry.register(new MockProvider('success'))).toThrow(ConfigurationError);
  });

  it('keeps mock provider responses deterministic', async () => {
    const provider = new MockProvider('success');
    const request: ModelRequest = {
      model: 'mock-model',
      systemPrompt: 'plan',
      messages: [{ role: 'user', content: 'Build a page' }],
      metadata: { role: 'ceo' },
    };
    const first = await provider.generate(request);
    const second = await provider.generate(request);
    expect(second).toEqual(first);
  });
});
