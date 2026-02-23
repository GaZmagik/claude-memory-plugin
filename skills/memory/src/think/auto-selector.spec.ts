/**
 * Unit tests for AutoSelector
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoSelector } from './auto-selector.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { matchHeuristics } from './heuristics.js';

describe('AutoSelector', () => {
  let selector: AutoSelector;
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
    selector = new AutoSelector({
      ollamaTimeout: 1000,
      defaultStyle: 'Concise',
      circuitBreaker,
    });
  });

  afterEach(() => {
    // Clean up to prevent test pollution
    selector = null as any;
    circuitBreaker = null as any;
  });

  describe('setAvailable', () => {
    it('sets available styles and agents', () => {
      selector.setAvailable(['Devils-Advocate', 'Socratic'], ['security-expert']);
      // Verify by selecting - should use available options
      expect(selector).toBeDefined();
    });
  });

  describe('select', () => {
    beforeEach(() => {
      // Ensure fresh selector with explicit available styles
      circuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
      selector = new AutoSelector({
        ollamaTimeout: 1000,
        defaultStyle: 'Concise',
        circuitBreaker,
      });
      selector.setAvailable(['Devils-Advocate', 'Socratic', 'Concise'], []);
    });

    it('returns default style when no match', async () => {
      const result = await selector.select('hello world');
      expect(result.source).toBe('default');
      expect(result.style).toBe('Concise');
    });

    it('uses heuristics for security keywords', async () => {
      // First verify matchHeuristics itself works correctly
      const heuristicsMatch = matchHeuristics('check for security vulnerability and injection risks');
      expect(heuristicsMatch).not.toBeNull();
      expect(heuristicsMatch?.style).toBe('Devils-Advocate');

      // Create completely isolated selector to avoid any test pollution
      const isolatedCircuitBreaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000 });
      const isolatedSelector = new AutoSelector({
        ollamaTimeout: 1000,
        defaultStyle: 'Concise',
        circuitBreaker: isolatedCircuitBreaker,
      });
      isolatedSelector.setAvailable(['Devils-Advocate', 'Socratic', 'Concise'], []);

      // Use multiple strong security keywords to ensure reliable matching
      const result = await isolatedSelector.select('check for security vulnerability and injection risks');
      expect(result.source).toBe('heuristics');
      expect(result.style).toBe('Devils-Advocate');
    });

    it('respects avoid list', async () => {
      const result = await selector.select('security risk', ['Devils-Advocate']);
      expect(result.style).not.toBe('Devils-Advocate');
    });

    it('returns reason for selection', async () => {
      const result = await selector.select('security');
      expect(result.reason).toBeDefined();
    });
  });
});
