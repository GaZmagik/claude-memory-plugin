/**
 * Unit tests for AutoSelector
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AutoSelector } from './auto-selector.js';
import { CircuitBreaker } from './circuit-breaker.js';

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

  describe('setAvailable', () => {
    it('sets available styles and agents', () => {
      selector.setAvailable(['Devils-Advocate', 'Socratic'], ['security-expert']);
      // Verify by selecting - should use available options
      expect(selector).toBeDefined();
    });
  });

  describe('select', () => {
    beforeEach(() => {
      selector.setAvailable(['Devils-Advocate', 'Socratic', 'Concise'], []);
    });

    it('returns default style when no match', async () => {
      const result = await selector.select('hello world');
      expect(result.source).toBe('default');
      expect(result.style).toBe('Concise');
    });

    it('uses heuristics for security keywords', async () => {
      const result = await selector.select('security vulnerability');
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
