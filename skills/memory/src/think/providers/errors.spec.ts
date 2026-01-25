/**
 * Co-located tests for errors.ts (T084)
 */
import { describe, it, expect } from 'vitest';
import { formatProviderError, getInstallInstructions } from './errors.js';

describe('provider errors', () => {
  it('formats missing CLI error with install instructions', () => {
    const msg = formatProviderError('codex', 'not_found');
    expect(msg).toContain('codex');
    expect(msg).toContain('not found');
    expect(msg).toContain('Install');
  });

  it('formats timeout error', () => {
    const msg = formatProviderError('gemini', 'timeout', 30);
    expect(msg).toContain('timed out');
    expect(msg).toContain('30');
  });

  it('formats generic error', () => {
    const msg = formatProviderError('claude', 'error', undefined, 'Connection refused');
    expect(msg).toContain('failed');
    expect(msg).toContain('Connection refused');
  });

  it('returns install instructions for each provider', () => {
    expect(getInstallInstructions('claude')).toContain('npm');
    expect(getInstallInstructions('codex')).toContain('npm');
    expect(getInstallInstructions('gemini')).toContain('npm');
  });
});
