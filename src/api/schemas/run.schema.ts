import { z } from 'zod';

export const CreateRunBodySchema = z
  .object({
    maxModelCalls: z.number().int().positive().nullable().optional(),
    maxCost: z.number().positive().nullable().optional(),
  })
  .default({});

export type CreateRunBody = z.infer<typeof CreateRunBodySchema>;
