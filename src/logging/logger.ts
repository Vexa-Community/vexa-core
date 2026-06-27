import pino from 'pino';
import { config } from '../config/config.js';

export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'apiKey',
  '*.apiKey',
  'config.apiKey',
  'err.message',
  'err.stack',
  'error.message',
  'error.stack',
];

export const logger = pino({
  level: config.logLevel,
  redact: LOG_REDACT_PATHS,
});

export type Logger = typeof logger;
