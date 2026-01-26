/**
 * Co-located tests for invoke.ts (T084b)
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_TIMEOUT_MS, invokeProviderCli } from './invoke.js';

describe('provider invoke', () => {
  it('exports DEFAULT_TIMEOUT_MS as 30000', () => {
    expect(DEFAULT_TIMEOUT_MS).toBe(30000);
  });

  it('exports invokeProviderCli function', () => {
    expect(typeof invokeProviderCli).toBe('function');
  });
});
