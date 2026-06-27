import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/config.js';
import { ConfigurationError } from '../../src/shared/errors.js';

describe('config', () => {
  it('uses safe defaults for missing configuration', () => {
    const config = loadConfig({});
    expect(config.defaultProvider).toBe('mock');
    expect(config.port).toBe(3000);
  });

  it('rejects invalid ports with an understandable error', () => {
    expect(() => loadConfig({ VEXA_PORT: 'not-a-number' })).toThrow(ConfigurationError);
    expect(() => loadConfig({ VEXA_PORT: 'not-a-number' })).toThrow(/Invalid configuration: port/);
  });
});
