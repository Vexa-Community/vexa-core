import { z } from 'zod';

export const RegisterAgentBodySchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  role: z.string().min(1).max(100),
  instructions: z.string().min(1).max(50000),
  model: z.string().min(1).max(200),
  provider: z.string().min(1).max(100),
  tools: z.array(z.string()).optional(),
  maxIterations: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export type RegisterAgentBody = z.infer<typeof RegisterAgentBodySchema>;
