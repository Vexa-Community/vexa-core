import { ConfigurationError } from '../shared/errors.js';
import type { ModelProvider } from './provider.interface.js';
import { MockProvider } from './mock.provider.js';
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';
import { config } from '../config/config.js';

export class ProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): void {
    if (this.providers.has(provider.name)) {
      throw new ConfigurationError(`Provider already registered: ${provider.name}`);
    }
    this.providers.set(provider.name, provider);
  }

  get(name: string): ModelProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ConfigurationError(`Unknown provider: ${name}`);
    }
    return provider;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return [...this.providers.keys()];
  }
}

export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new MockProvider('success'));

  if (config.providerBaseUrl && config.apiKey) {
    const openai = new OpenAICompatibleProvider({
      baseUrl: config.providerBaseUrl,
      apiKey: config.apiKey,
    });
    registry.register(openai);
    registry.register({
      name: 'openai',
      validateConfiguration: () => openai.validateConfiguration(),
      generate: (req) => openai.generate(req),
    });
  }

  return registry;
}
