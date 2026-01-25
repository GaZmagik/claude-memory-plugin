/**
 * Unit tests for interactive prompt functions
 */
import { describe, it, expect, afterEach } from 'vitest';
import { shouldPrompt, promptForAiAssistance } from './interactive-prompt.js';

describe('shouldPrompt', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns false in non-interactive mode', () => {
    expect(shouldPrompt({ nonInteractive: true })).toBe(false);
  });

  it('returns false when not TTY', () => {
    expect(shouldPrompt({ nonInteractive: false, isTTY: false })).toBe(false);
  });

  it('returns true in interactive TTY mode', () => {
    expect(shouldPrompt({ nonInteractive: false, isTTY: true })).toBe(true);
  });

  it('returns false when CI env var is set', () => {
    process.env.CI = 'true';
    expect(shouldPrompt({ nonInteractive: false, isTTY: true, detectCI: true })).toBe(false);
  });

  it('returns false when GITHUB_ACTIONS env var is set', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(shouldPrompt({ nonInteractive: false, isTTY: true, detectCI: true })).toBe(false);
  });
});

describe('promptForAiAssistance', () => {
  // Skip stdin mocking - test non-interactive paths only

  it('returns skipped result in non-interactive mode', async () => {
    const result = await promptForAiAssistance({
      thought: 'test thought',
      command: 'think add',
      nonInteractive: true,
    });
    expect(result.proceed).toBe(false);
    expect(result.skippedDueToNonInteractive).toBe(true);
  });

  it('returns skipped result when not TTY', async () => {
    const result = await promptForAiAssistance({
      thought: 'test thought',
      command: 'think add',
      isTTY: false,
    });
    expect(result.proceed).toBe(false);
    expect(result.skippedDueToNonInteractive).toBe(true);
  });
});
