import { z } from 'zod';
import { CancelledError, InvalidOutputError } from '../shared/errors.js';
import { config } from '../config/config.js';
import type { ProviderRegistry } from '../providers/provider.registry.js';
import type { ModelMessage, ModelRequest } from '../providers/provider.interface.js';
import type { Agent } from './agent.types.js';
import type { Task } from '../tasks/task.types.js';
import type { CreateModelCallInput } from '../runs/model-call.types.js';
import { getOutputSchema } from './agent.schema.js';

export interface DependencyOutput {
  taskTitle: string;
  role: string;
  output: unknown;
}

export interface TaskContext {
  goal: string;
  dependencyOutputs: DependencyOutput[];
}

export interface AgentResult {
  output: unknown;
  content: string;
}

export type ModelCallSink = (call: CreateModelCallInput) => void;

const EXECUTION_TIMEOUT_MS = 30_000;

export class AgentEngine {
  constructor(private readonly registry: ProviderRegistry) {}

  private resolveProviderName(agent: Agent): string {
    return this.registry.has(agent.provider) ? agent.provider : config.defaultProvider;
  }

  private resolveModel(agent: Agent, providerName: string): string {
    if (providerName === 'mock') return config.defaultModel;
    return agent.model;
  }

  private buildUserContent(task: Task, context: TaskContext): string {
    const parts: string[] = [];
    parts.push(`Project goal: ${context.goal}`);
    parts.push(`Task: ${task.title}`);
    parts.push(`Description: ${task.description}`);
    if (context.dependencyOutputs.length > 0) {
      parts.push('Context from completed upstream tasks:');
      for (const dep of context.dependencyOutputs) {
        parts.push(`- ${dep.taskTitle} (${dep.role}): ${JSON.stringify(dep.output)}`);
      }
    }
    return parts.join('\n');
  }

  async executeTask(
    agent: Agent,
    task: Task,
    context: TaskContext,
    signal: AbortSignal,
    sink: ModelCallSink
  ): Promise<AgentResult> {
    const providerName = this.resolveProviderName(agent);
    const provider = this.registry.get(providerName);
    const model = this.resolveModel(agent, providerName);
    const schema = getOutputSchema(agent.role);

    const messages: ModelMessage[] = [{ role: 'user', content: this.buildUserContent(task, context) }];

    const firstAttempt = await this.callAndValidate(
      agent,
      task,
      provider,
      providerName,
      model,
      schema,
      messages,
      signal,
      sink
    );

    if (firstAttempt.ok) {
      return { output: firstAttempt.output, content: firstAttempt.content };
    }

    const correctionMessages: ModelMessage[] = [
      ...messages,
      { role: 'assistant', content: firstAttempt.content },
      {
        role: 'user',
        content: `Your previous response was not valid. Error: ${firstAttempt.error}. Return ONLY valid JSON matching the required schema.`,
      },
    ];

    const secondAttempt = await this.callAndValidate(
      agent,
      task,
      provider,
      providerName,
      model,
      schema,
      correctionMessages,
      signal,
      sink
    );

    if (secondAttempt.ok) {
      return { output: secondAttempt.output, content: secondAttempt.content };
    }

    throw new InvalidOutputError(
      `Agent ${agent.slug} produced invalid output after correction: ${secondAttempt.error}`
    );
  }

  private async callAndValidate(
    agent: Agent,
    task: Task,
    provider: ReturnType<ProviderRegistry['get']>,
    providerName: string,
    model: string,
    schema: z.ZodType | undefined,
    messages: ModelMessage[],
    signal: AbortSignal,
    sink: ModelCallSink
  ): Promise<{ ok: true; output: unknown; content: string } | { ok: false; error: string; content: string }> {
    const effectiveSignal = AbortSignal.any([signal, AbortSignal.timeout(EXECUTION_TIMEOUT_MS)]);
    const request: ModelRequest = {
      model,
      systemPrompt: agent.instructions,
      messages,
      maxTokens: agent.maxOutputTokens,
      metadata: { role: agent.role, agentSlug: agent.slug },
      signal: effectiveSignal,
    };
    if (schema) request.responseSchema = schema;

    if (signal.aborted) throw new CancelledError('Operation cancelled');
    const start = Date.now();
    let response;
    try {
      response = await provider.generate(request);
    } catch (err) {
      if (signal.aborted) throw new CancelledError('Operation cancelled');
      throw err;
    }
    if (signal.aborted) throw new CancelledError('Operation cancelled');
    const durationMs = Date.now() - start;

    sink({
      runId: task.runId,
      taskId: task.id,
      agentId: agent.id,
      provider: providerName,
      model,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      estimatedCost: response.estimatedCost,
      finishReason: response.finishReason,
      durationMs,
      requestMetadata: { role: agent.role },
      responseMetadata: response.providerMetadata,
    });

    if (!schema) {
      return { ok: true, output: { content: response.content }, content: response.content };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      return { ok: false, error: 'Response is not valid JSON', content: response.content };
    }

    const validation = schema.safeParse(parsed);
    if (!validation.success) {
      return { ok: false, error: validation.error.message, content: response.content };
    }

    return { ok: true, output: validation.data, content: response.content };
  }
}
