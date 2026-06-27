import { z } from 'zod';

export const ProjectStatusSchema = z.enum(['draft', 'active', 'archived']);

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  description: z.string().nullable().optional(),
});

export type CreateProjectBody = z.infer<typeof CreateProjectSchema>;
