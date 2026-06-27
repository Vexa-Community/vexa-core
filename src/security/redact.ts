const SENSITIVE_KEY_PATTERN = /(api[-_]?key|authorization|secret|password|token)/i;
const REDACTED = '[REDACTED]';
const SECRET_TEXT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /sk-[A-Za-z0-9_-]{8,}/g,
];

export function redactValue(): string {
  return REDACTED;
}

export function redactText(value: string, secrets: Array<string | undefined> = [process.env.VEXA_API_KEY]): string {
  let out = value;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) out = out.split(secret).join(REDACTED);
  }
  for (const pattern of SECRET_TEXT_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }
  if (typeof value === 'string') {
    return redactText(value);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(val);
    }
    return out;
  }
  return value;
}

export function safeErrorResponse(
  error: unknown,
  options: { includeStack: boolean }
): { code: string; message: string; details: unknown } {
  if (error instanceof Error) {
    return {
      code: (error as { code?: string }).code ?? 'INTERNAL_ERROR',
      message: redactText(error.message),
      details: options.includeStack ? redactText(error.stack ?? '') : null,
    };
  }
  return { code: 'INTERNAL_ERROR', message: 'Unknown error', details: null };
}
