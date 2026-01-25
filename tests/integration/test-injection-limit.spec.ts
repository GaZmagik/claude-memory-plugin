/**
 * T030: Integration test for total memory limit (10 max)
 */

import { describe, it, expect } from 'vitest';

import { EnhancedInjector } from '../../hooks/src/memory/enhanced-injector.js';
import { DEFAULT_INJECTION_CONFIG } from '../../hooks/src/settings/injection-settings.js';

describe('Total Memory Injection Limit', () => {
  it('should enforce hard limit of 10 total memories', () => {
    const config = {
      ...DEFAULT_INJECTION_CONFIG,
      types: {
        gotcha: { enabled: true, threshold: 0.1, limit: 10 },
        decision: { enabled: true, threshold: 0.1, limit: 10 },
        learning: { enabled: true, threshold: 0.1, limit: 10 },
      },
    };

    const injector = new EnhancedInjector(config);

    // Create 15 memories of each type
    const memories = [
      ...Array(15).fill(null).map((_, i) => ({ id: `g${i}`, type: 'gotcha', title: 'T', score: 0.9 - i * 0.01 })),
      ...Array(15).fill(null).map((_, i) => ({ id: `d${i}`, type: 'decision', title: 'T', score: 0.9 - i * 0.01 })),
      ...Array(15).fill(null).map((_, i) => ({ id: `l${i}`, type: 'learning', title: 'T', score: 0.9 - i * 0.01 })),
    ];

    const limited = injector.applyLimits(memories);

    expect(limited.length).toBeLessThanOrEqual(10);
  });

  it('should prioritise gotchas when applying total limit', () => {
    const config = {
      ...DEFAULT_INJECTION_CONFIG,
      types: {
        gotcha: { enabled: true, threshold: 0.1, limit: 8 },
        decision: { enabled: true, threshold: 0.1, limit: 8 },
        learning: { enabled: true, threshold: 0.1, limit: 8 },
      },
    };

    const injector = new EnhancedInjector(config);

    const memories = [
      ...Array(8).fill(null).map((_, i) => ({ id: `g${i}`, type: 'gotcha', title: 'T', score: 0.9 })),
      ...Array(8).fill(null).map((_, i) => ({ id: `d${i}`, type: 'decision', title: 'T', score: 0.9 })),
    ];

    const limited = injector.applyLimits(memories);

    // Should have more gotchas than decisions (gotcha priority)
    const gotchaCount = limited.filter(m => m.type === 'gotcha').length;
    const decisionCount = limited.filter(m => m.type === 'decision').length;

    expect(gotchaCount).toBeGreaterThanOrEqual(decisionCount);
    expect(limited.length).toBeLessThanOrEqual(10);
  });

  it('should respect per-type limits within total limit', () => {
    const config = {
      ...DEFAULT_INJECTION_CONFIG,
      types: {
        gotcha: { enabled: true, threshold: 0.1, limit: 3 },
        decision: { enabled: true, threshold: 0.1, limit: 3 },
        learning: { enabled: true, threshold: 0.1, limit: 3 },
      },
    };

    const injector = new EnhancedInjector(config);

    const memories = [
      ...Array(10).fill(null).map((_, i) => ({ id: `g${i}`, type: 'gotcha', title: 'T', score: 0.9 })),
    ];

    const limited = injector.applyLimits(memories);

    // Per-type limit of 3 should apply
    expect(limited.filter(m => m.type === 'gotcha').length).toBeLessThanOrEqual(3);
  });
});
