/**
 * Unit tests for hint output functions
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatHint, shouldShowHintInMode, getRotatingHint, HINT_PREFIX } from './hint-output.js';

describe('formatHint', () => {
  it('includes hint prefix', () => {
    const result = formatHint({ text: 'Test hint' });
    expect(result).toContain(HINT_PREFIX);
    expect(result).toContain('Test hint');
  });

  it('includes example when provided', () => {
    const result = formatHint({ text: 'Test', example: 'memory think add "test"' });
    expect(result).toContain('Example:');
    expect(result).toContain('memory think add "test"');
  });

  it('ends with newline', () => {
    const result = formatHint({ text: 'Test' });
    expect(result.endsWith('\n')).toBe(true);
  });
});

describe('shouldShowHintInMode', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns false in non-interactive mode', () => {
    expect(shouldShowHintInMode({ nonInteractive: true })).toBe(false);
  });

  it('returns false when not TTY', () => {
    expect(shouldShowHintInMode({ nonInteractive: false, isTTY: false })).toBe(false);
  });

  it('returns true in interactive TTY mode', () => {
    expect(shouldShowHintInMode({ nonInteractive: false, isTTY: true })).toBe(true);
  });

  it('returns false when CI env var set', () => {
    process.env.CI = 'true';
    expect(shouldShowHintInMode({ nonInteractive: false, isTTY: true, detectCI: true })).toBe(false);
  });

  it('returns false when GITHUB_ACTIONS env var set', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(shouldShowHintInMode({ nonInteractive: false, isTTY: true, detectCI: true })).toBe(false);
  });
});

describe('getRotatingHint', () => {
  it('returns hint for count 0', () => {
    const hint = getRotatingHint(0);
    expect(hint).toBeDefined();
    expect(hint.text).toBeDefined();
  });

  it('returns hint for count 1', () => {
    const hint = getRotatingHint(1);
    expect(hint).toBeDefined();
  });

  it('returns hint for count 2', () => {
    const hint = getRotatingHint(2);
    expect(hint).toBeDefined();
  });

  it('cycles back after 3 hints', () => {
    const hint0 = getRotatingHint(0);
    const hint3 = getRotatingHint(3);
    expect(hint0.type).toBe(hint3.type);
  });

  it('includes type field', () => {
    const hint = getRotatingHint(0);
    expect(['call', 'style', 'agent', 'auto']).toContain(hint.type);
  });
});
