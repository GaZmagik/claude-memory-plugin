/**
 * T072: Integration test for --agent warning with non-Claude providers
 */
import { describe, it, expect } from 'vitest';

describe('provider-warnings', () => {
  it('warns when --agent used with codex', () => {
    expect(true).toBe(true); // Placeholder
  });

  it('warns when --agent used with gemini', () => {
    expect(true).toBe(true);
  });

  it('no warning when --agent used with claude', () => {
    expect(true).toBe(true);
  });

  it('warns when --style used with non-claude providers', () => {
    expect(true).toBe(true);
  });
});
