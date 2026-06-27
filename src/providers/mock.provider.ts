import {
  AuthenticationError,
  ProviderError,
  RateLimitError,
  TimeoutError,
} from '../shared/errors.js';
import type { ModelProvider, ModelRequest, ModelResponse } from './provider.interface.js';

export type MockMode =
  | 'success'
  | 'invalid-output'
  | 'timeout'
  | 'rate-limit'
  | 'auth-failure'
  | 'provider-failure';

const CEO_RESPONSE = {
  summary: 'Architecture plan for SaaS landing page',
  tasks: [
    {
      id: 'task-frontend',
      title: 'Create Frontend Architecture',
      description: 'Design the technical architecture for the SaaS landing page',
      assignedRole: 'frontend-developer',
      dependsOn: [] as string[],
      expectedOutput: 'Technical architecture document',
    },
  ],
};

const FRONTEND_RESPONSE = {
  summary: 'Technical architecture for SaaS landing page',
  architecture: {
    pages: ['Landing Page', 'Pricing', 'About'],
    components: ['Hero', 'Features', 'CTA', 'Footer'],
    stateManagement: ['React Context for theme'],
    dataFlow: ['Static props for pricing data'],
    accessibility: ['WCAG 2.1 AA compliance', 'ARIA labels'],
    testing: ['Vitest for unit tests', 'Playwright for E2E'],
  },
  risks: ['SEO optimization needed'],
  assumptions: ['React framework chosen'],
};

const QA_RESPONSE = {
  passed: true,
  summary: 'Architecture plan meets requirements',
  issues: [] as unknown[],
  requiredCorrections: [] as string[],
};

function responseForRole(role: string | undefined): unknown {
  switch (role) {
    case 'ceo':
      return CEO_RESPONSE;
    case 'frontend-developer':
      return FRONTEND_RESPONSE;
    case 'qa-reviewer':
      return QA_RESPONSE;
    default:
      return { summary: 'Mock response', result: 'ok' };
  }
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export class MockProvider implements ModelProvider {
  readonly name = 'mock';

  constructor(private readonly mode: MockMode = 'success') {}

  async validateConfiguration(): Promise<void> {
    return;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    switch (this.mode) {
      case 'timeout':
        throw new TimeoutError('Mock provider timed out');
      case 'rate-limit':
        throw new RateLimitError('Mock provider rate limited', 50);
      case 'auth-failure':
        throw new AuthenticationError('Mock provider authentication failed');
      case 'provider-failure':
        throw new ProviderError('Mock provider failure');
      case 'invalid-output': {
        const content = 'This is not valid JSON output at all.';
        return this.buildResponse(request, content);
      }
      case 'success':
      default: {
        const role =
          typeof request.metadata?.role === 'string'
            ? (request.metadata.role as string)
            : undefined;
        const content = JSON.stringify(responseForRole(role));
        return this.buildResponse(request, content);
      }
    }
  }

  private buildResponse(request: ModelRequest, content: string): ModelResponse {
    const inputText = request.systemPrompt + request.messages.map((m) => m.content).join('\n');
    const inputTokens = estimateTokens(inputText);
    const outputTokens = estimateTokens(content);
    return {
      content,
      inputTokens,
      outputTokens,
      estimatedCost: (inputTokens + outputTokens) * 0.000001,
      finishReason: 'stop',
      providerMetadata: { provider: 'mock', mode: this.mode },
    };
  }
}
