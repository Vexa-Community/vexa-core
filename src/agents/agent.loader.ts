import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ConfigurationError } from '../shared/errors.js';
import { AgentYamlSchema, type AgentYaml } from './agent.schema.js';
import type { CreateAgentInput } from './agent.types.js';

export function parseAgentYaml(content: string): AgentYaml {
  let raw: unknown;
  try {
    raw = yaml.load(content);
  } catch (err) {
    throw new ConfigurationError(`Invalid agent config: ${(err as Error).message}`);
  }
  const result = AgentYamlSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigurationError(`Invalid agent config: ${result.error.message}`);
  }
  return result.data;
}

export function loadAgentFile(filePath: string): AgentYaml {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseAgentYaml(content);
}

export function loadAgentsFromDir(dir: string): AgentYaml[] {
  if (!fs.existsSync(dir)) {
    throw new ConfigurationError(`Agents directory not found: ${dir}`);
  }
  const resolvedDir = path.resolve(dir);
  const files = fs
    .readdirSync(resolvedDir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();
  return files.map((f) => {
    const filePath = path.resolve(resolvedDir, f);
    if (!filePath.startsWith(resolvedDir + path.sep)) {
      throw new ConfigurationError(`Agent file path escapes agents directory: ${f}`);
    }
    return loadAgentFile(filePath);
  });
}

export function toCreateAgentInput(yamlConfig: AgentYaml, projectId: string): CreateAgentInput {
  return {
    projectId,
    slug: yamlConfig.slug,
    name: yamlConfig.name,
    description: yamlConfig.description,
    role: yamlConfig.role,
    instructions: yamlConfig.instructions,
    model: yamlConfig.model,
    provider: yamlConfig.provider,
    tools: yamlConfig.tools ?? [],
    maxIterations: yamlConfig.maxIterations ?? 3,
    maxOutputTokens: yamlConfig.maxOutputTokens ?? 2000,
    enabled: yamlConfig.enabled ?? true,
  };
}
