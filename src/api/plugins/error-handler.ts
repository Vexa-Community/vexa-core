import type { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { VexaError, NotFoundError, ValidationError } from '../../shared/errors.js';
import { config } from '../../config/config.js';
import { redact, redactText } from '../../security/redact.js';

function statusForCode(code: string): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
      return 400;
    case 'CANCELLED_ERROR':
      return 409;
    case 'RATE_LIMIT_ERROR':
      return 429;
    case 'TIMEOUT_ERROR':
      return 504;
    default:
      return 500;
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'Resource not found', details: null },
    });
  });

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    request.log.error({ err: error }, 'request error');

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: redact(error.issues) },
      });
      return;
    }

    if (error instanceof ValidationError) {
      reply.status(400).send({
        error: {
          code: error.code,
          message: redactText(error.message),
          details: redact(error.details ?? null),
        },
      });
      return;
    }

    if (error instanceof NotFoundError) {
      reply.status(404).send({
        error: { code: error.code, message: redactText(error.message), details: null },
      });
      return;
    }

    if (error instanceof VexaError) {
      reply.status(statusForCode(error.code)).send({
        error: { code: error.code, message: redactText(error.message), details: null },
      });
      return;
    }

    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      reply.status(error.statusCode).send({
        error: { code: error.code ?? 'BAD_REQUEST', message: redactText(error.message), details: null },
      });
      return;
    }

    const message = config.env === 'production' ? 'Internal server error' : redactText(error.message);
    reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message,
        details: config.env === 'production' ? null : redactText(error.stack ?? ''),
      },
    });
  });
}
