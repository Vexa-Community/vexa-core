import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveArtifactPath } from '../../src/artifacts/artifact.repository.js';
import { config } from '../../src/config/config.js';
import { ValidationError } from '../../src/shared/errors.js';

describe('artifact path resolution', () => {
  it('rejects path traversal in the artifact name', () => {
    expect(() => resolveArtifactPath('run_1', '../../etc/passwd', 'text')).toThrow(ValidationError);
  });

  it('rejects path traversal in the run id', () => {
    expect(() => resolveArtifactPath('../outside', 'report', 'text')).toThrow(ValidationError);
  });

  it('rejects names containing path separators', () => {
    expect(() => resolveArtifactPath('run_1', 'a/b', 'text')).toThrow(ValidationError);
    expect(() => resolveArtifactPath('run_1', 'a\\b', 'text')).toThrow(ValidationError);
  });

  it('accepts a valid name within the artifacts directory', () => {
    const resolved = resolveArtifactPath('run_1', 'report', 'markdown');
    const base = path.resolve(config.artifactsDir);
    expect(resolved.startsWith(base + path.sep)).toBe(true);
    expect(resolved.endsWith(`report.md`)).toBe(true);
  });
});
