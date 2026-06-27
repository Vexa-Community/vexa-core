import type { FastifyInstance } from 'fastify';
import { RegisterAgentBodySchema } from '../schemas/agent.schema.js';
import { getProject } from '../../projects/project.repository.js';
import { createAgent, listAgentsForProject } from '../../agents/agent.repository.js';
import { NotFoundError } from '../../shared/errors.js';

export async function agentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/projects/:projectId/agents', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const project = getProject(projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);
    const body = RegisterAgentBodySchema.parse(request.body);
    const agent = createAgent({ ...body, projectId });
    reply.status(201).send({ data: agent, meta: {} });
  });

  app.get('/projects/:projectId/agents', async (request) => {
    const { projectId } = request.params as { projectId: string };
    const project = getProject(projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);
    return { data: listAgentsForProject(projectId), meta: {} };
  });
}
