/**
 * T089: Performance test for auto-selection with Ollama
 * Requirement: Auto-selection with Ollama completes <1s
 * Note: This test requires Ollama to be running
 */
import { describe, it, expect, vi } from 'vitest';
import { AutoSelector } from '../../skills/memory/src/think/auto-selector.js';
import { CircuitBreaker } from '../../skills/memory/src/think/circuit-breaker.js';

describe('auto-selection-speed', () => {
  it('AutoSelector instantiation completes in <10ms', () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000 });

    const start = performance.now();
    new AutoSelector({
      styles: [{ name: 'Concise', path: '/test' }],
      agents: [{ name: 'helper', path: '/test' }],
      avoidList: [],
      circuitBreaker,
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10);
  });

  it('heuristic selection completes in <100ms (fallback path)', async () => {
    // When Ollama unavailable, heuristics should be fast
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000 });
    // Force circuit open to use heuristics
    circuitBreaker.recordFailure();
    circuitBreaker.recordFailure();
    circuitBreaker.recordFailure();

    const selector = new AutoSelector({
      styles: [
        { name: 'Concise', path: '/test' },
        { name: 'Devils-Advocate', path: '/test' },
      ],
      agents: [
        { name: 'security-reviewer', path: '/test' },
        { name: 'performance-expert', path: '/test' },
      ],
      avoidList: [],
      circuitBreaker,
    });

    const start = performance.now();
    await selector.select('Review this code for security issues');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  // Note: Ollama-dependent test - skip if Ollama not available
  it.skip('Ollama selection completes in <1s', async () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000 });
    const selector = new AutoSelector({
      styles: [{ name: 'Concise', path: '/test' }],
      agents: [{ name: 'helper', path: '/test' }],
      avoidList: [],
      circuitBreaker,
    });

    const start = performance.now();
    await selector.select('Test thought');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
