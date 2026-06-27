import { z } from 'zod';

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1).max(200),
  goal: z.string().min(1).max(2000),
  description: z.string().max(2000).nullable().optional(),
});

export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;
