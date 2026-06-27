import type { FastifyInstance } from 'fastify';
import { CreateProjectBodySchema } from '../schemas/project.schema.js';
import { createProject, getProject, listProjects } from '../../projects/project.repository.js';
import { NotFoundError } from '../../shared/errors.js';

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.post('/projects', async (request, reply) => {
    const body = CreateProjectBodySchema.parse(request.body);
    const project = createProject({
      name: body.name,
      goal: body.goal,
      description: body.description ?? null,
    });
    reply.status(201).send({ data: project, meta: {} });
  });

  app.get('/projects', async () => {
    return { data: listProjects(), meta: {} };
  });

  app.get('/projects/:projectId', async (request) => {
    const { projectId } = request.params as { projectId: string };
    const project = getProject(projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);
    return { data: project, meta: {} };
  });
}
