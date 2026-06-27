import { describe, it, expect } from 'vitest';
import { parseAgentYaml } from '../../src/agents/agent.loader.js';
import { ConfigurationError } from '../../src/shared/errors.js';

const VALID = `slug: ceo
name: CEO Agent
description: Plans work
role: ceo
instructions: Do the planning
model: gpt-4o
provider: openai
maxIterations: 3
maxOutputTokens: 2000
enabled: true
outputSchema: ceo
`;

describe('agent schema', () => {
  it('parses a valid agent config', () => {
    const agent = parseAgentYaml(VALID);
    expect(agent.slug).toBe('ceo');
    expect(agent.role).toBe('ceo');
    expect(agent.model).toBe('gpt-4o');
  });

  it('rejects config missing a required field (slug)', () => {
    const yaml = VALID.replace('slug: ceo\n', '');
    expect(() => parseAgentYaml(yaml)).toThrow(ConfigurationError);
  });

  it('rejects config missing the role field', () => {
    const yaml = VALID.replace('role: ceo\n', '');
    expect(() => parseAgentYaml(yaml)).toThrow(ConfigurationError);
  });

  it('rejects config with an empty model field', () => {
    const yaml = VALID.replace('model: gpt-4o', 'model: ""');
    expect(() => parseAgentYaml(yaml)).toThrow(ConfigurationError);
  });

  it('wraps malformed YAML in a configuration error', () => {
    expect(() => parseAgentYaml('slug: [broken')).toThrow(ConfigurationError);
    expect(() => parseAgentYaml('slug: [broken')).toThrow(/Invalid agent config/);
  });
});
