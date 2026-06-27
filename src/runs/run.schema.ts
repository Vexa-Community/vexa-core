import { z } from 'zod';

export const RunStatusSchema = z.enum(['queued', 'running', 'completed', 'failed', 'cancelled']);

export const CreateRunSchema = z.object({
  maxModelCalls: z.number().int().positive().nullable().optional(),
  maxCost: z.number().positive().nullable().optional(),
});

export type CreateRunBody = z.infer<typeof CreateRunSchema>;
