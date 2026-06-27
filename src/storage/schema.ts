import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  goal: text('goal').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  status: text('status').notNull().default('queued'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
  failureReason: text('failure_reason'),
  maxModelCalls: integer('max_model_calls'),
  maxCost: real('max_cost'),
  currentModelCalls: integer('current_model_calls').notNull().default(0),
  estimatedCost: real('estimated_cost').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  role: text('role').notNull(),
  instructions: text('instructions').notNull(),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  tools: text('tools').notNull().default('[]'),
  maxIterations: integer('max_iterations').notNull().default(3),
  maxOutputTokens: integer('max_output_tokens').notNull().default(2000),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  assignedAgentId: text('assigned_agent_id').references(() => agents.id),
  status: text('status').notNull().default('pending'),
  input: text('input'),
  output: text('output'),
  error: text('error'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const taskDependencies = sqliteTable(
  'task_dependencies',
  {
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id),
    dependsOnTaskId: text('depends_on_task_id')
      .notNull()
      .references(() => tasks.id),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.dependsOnTaskId] })],
);

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  taskId: text('task_id').references(() => tasks.id),
  fromAgentId: text('from_agent_id').references(() => agents.id),
  toAgentId: text('to_agent_id').references(() => agents.id),
  type: text('type').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const modelCalls = sqliteTable('model_calls', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  taskId: text('task_id').references(() => tasks.id),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  estimatedCost: real('estimated_cost').notNull().default(0),
  finishReason: text('finish_reason').notNull(),
  durationMs: integer('duration_ms').notNull().default(0),
  requestMetadata: text('request_metadata').notNull().default('{}'),
  responseMetadata: text('response_metadata').notNull().default('{}'),
  error: text('error'),
  createdAt: text('created_at').notNull(),
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id),
  runId: text('run_id').references(() => runs.id),
  taskId: text('task_id').references(() => tasks.id),
  agentId: text('agent_id').references(() => agents.id),
  type: text('type').notNull(),
  payload: text('payload').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
});

export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey(),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  taskId: text('task_id').references(() => tasks.id),
  createdByAgentId: text('created_by_agent_id').references(() => agents.id),
  name: text('name').notNull(),
  type: text('type').notNull(),
  path: text('path').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: text('created_at').notNull(),
});
