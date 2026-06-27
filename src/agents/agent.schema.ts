import { z } from 'zod';

export const AgentYamlSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  role: z.string().min(1),
  instructions: z.string().min(1),
  model: z.string().min(1),
  provider: z.string().min(1),
  tools: z.array(z.string()).optional(),
  maxIterations: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
  outputSchema: z.string().optional(),
});

export type AgentYaml = z.infer<typeof AgentYamlSchema>;

export const CeoOutputSchema = z.object({
  summary: z.string(),
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      assignedRole: z.string(),
      dependsOn: z.array(z.string()),
      expectedOutput: z.string(),
    })
  ),
});

export const FrontendDevOutputSchema = z.object({
  summary: z.string(),
  architecture: z.object({
    pages: z.array(z.string()),
    components: z.array(z.string()),
    stateManagement: z.array(z.string()),
    dataFlow: z.array(z.string()),
    accessibility: z.array(z.string()),
    testing: z.array(z.string()),
  }),
  risks: z.array(z.string()),
  assumptions: z.array(z.string()),
});

export const QaOutputSchema = z.object({
  passed: z.boolean(),
  summary: z.string(),
  issues: z.array(
    z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      recommendation: z.string(),
    })
  ),
  requiredCorrections: z.array(z.string()),
});

export type CeoOutput = z.infer<typeof CeoOutputSchema>;
export type FrontendDevOutput = z.infer<typeof FrontendDevOutputSchema>;
export type QaOutput = z.infer<typeof QaOutputSchema>;

const OUTPUT_SCHEMAS: Record<string, z.ZodType> = {
  ceo: CeoOutputSchema,
  'frontend-developer': FrontendDevOutputSchema,
  'qa-reviewer': QaOutputSchema,
};

export function getOutputSchema(name: string | undefined): z.ZodType | undefined {
  if (!name) return undefined;
  return OUTPUT_SCHEMAS[name];
}
