export class VexaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = 'VexaError';
  }
}

export class ConfigurationError extends VexaError {
  constructor(msg: string) {
    super(msg, 'CONFIGURATION_ERROR', false);
    this.name = 'ConfigurationError';
  }
}

export class ProviderError extends VexaError {
  constructor(msg: string) {
    super(msg, 'PROVIDER_ERROR', true);
    this.name = 'ProviderError';
  }
}

export class AuthenticationError extends VexaError {
  constructor(msg: string) {
    super(msg, 'AUTHENTICATION_ERROR', false);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends VexaError {
  constructor(
    msg: string,
    public readonly retryAfterMs?: number
  ) {
    super(msg, 'RATE_LIMIT_ERROR', true);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends VexaError {
  constructor(msg: string) {
    super(msg, 'TIMEOUT_ERROR', true);
    this.name = 'TimeoutError';
  }
}

export class InvalidOutputError extends VexaError {
  constructor(msg: string) {
    super(msg, 'INVALID_OUTPUT_ERROR', false);
    this.name = 'InvalidOutputError';
  }
}

export class TaskExecutionError extends VexaError {
  constructor(msg: string) {
    super(msg, 'TASK_EXECUTION_ERROR', false);
    this.name = 'TaskExecutionError';
  }
}

export class DependencyError extends VexaError {
  constructor(msg: string) {
    super(msg, 'DEPENDENCY_ERROR', false);
    this.name = 'DependencyError';
  }
}

export class BudgetExceededError extends VexaError {
  constructor(msg: string) {
    super(msg, 'BUDGET_EXCEEDED_ERROR', false);
    this.name = 'BudgetExceededError';
  }
}

export class CancelledError extends VexaError {
  constructor(msg: string) {
    super(msg, 'CANCELLED_ERROR', false);
    this.name = 'CancelledError';
  }
}

export class NotFoundError extends VexaError {
  constructor(msg: string) {
    super(msg, 'NOT_FOUND', false);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends VexaError {
  constructor(
    msg: string,
    public readonly details?: unknown
  ) {
    super(msg, 'VALIDATION_ERROR', false);
    this.name = 'ValidationError';
  }
}
