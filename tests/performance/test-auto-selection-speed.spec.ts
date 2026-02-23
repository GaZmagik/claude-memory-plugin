/**
 * T089: Performance test for auto-selection with Ollama
 * Requirement: Auto-selection with Ollama completes <1s
 * Note: This test requires Ollama to be running
 */
import { describe, it, expect } from 'vitest';
import { AutoSelector } from '../../skills/memory/src/think/auto-selector.js';
import { CircuitBreaker } from '../../skills/memory/src/think/circuit-breaker.js';

describe('auto-selection-speed', () => {
  it('AutoSelector instantiation completes in <10ms', () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000 });

    const start = performance.now();
    new AutoSelector({
      ollamaTimeout: 5000,
      defaultStyle: 'Concise',
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
      ollamaTimeout: 5000,
      defaultStyle: 'Concise',
      circuitBreaker,
    });
    selector.setAvailable(['Concise', 'Devils-Advocate'], ['security-reviewer', 'performance-expert']);

    const start = performance.now();
    await selector.select('Review this code for security issues');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('Ollama path with fast mock completes in <1s', async () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 30000 });
    const selector = new AutoSelector({
      ollamaTimeout: 5000,
      defaultStyle: 'Concise',
      circuitBreaker,
      // Inject fast mock to test Ollama path overhead without requiring a real Ollama instance
      generateFn: async (_prompt: string) => 'style: Concise\nreason: Test',
    });
    selector.setAvailable(['Concise'], []);

    const start = performance.now();
    await selector.select('Test thought');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
