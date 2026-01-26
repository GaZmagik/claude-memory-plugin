/**
 * Co-located tests - main tests in tests/unit/settings/
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_INJECTION_CONFIG, parseInjectionConfig } from './injection-settings.js';

describe('injection-settings exports', () => {
  it('exports DEFAULT_INJECTION_CONFIG', () => {
    expect(DEFAULT_INJECTION_CONFIG).toBeDefined();
  });

  it('exports parseInjectionConfig', () => {
    expect(typeof parseInjectionConfig).toBe('function');
  });
});
