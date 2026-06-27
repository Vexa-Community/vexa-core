import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'pending',
  'ready',
  'running',
  'completed',
  'failed',
  'blocked',
  'cancelled',
]);

export type TaskStatusValue = z.infer<typeof TaskStatusSchema>;
