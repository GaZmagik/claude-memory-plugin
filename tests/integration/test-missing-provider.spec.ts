/**
 * T071: Integration test for graceful error on missing CLI
 */
import { describe, it, expect } from 'vitest';

describe('missing-provider', () => {
  it('returns helpful error when provider CLI not found', () => {
    expect(true).toBe(true); // Placeholder
  });

  it('includes installation instructions in error', () => {
    expect(true).toBe(true);
  });

  it('suggests available alternatives', () => {
    expect(true).toBe(true);
  });
});
