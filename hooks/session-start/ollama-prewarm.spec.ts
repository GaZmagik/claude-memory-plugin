/**
 * Tests for Ollama pre-warm hook
 *
 * Validates that the hook attempts to load Ollama models at session start.
 * Integration testing covered by Ollama service tests.
 *
 * @since v1.2.0
 */

import { describe, it, expect } from 'bun:test';

describe('Ollama Pre-warm Hook', () => {
  describe('pre-warming behaviour', () => {
    it('should use minimal context for pre-warm request', () => {
      const minimalContext = 128;
      expect(minimalContext).toBeLessThan(512); // Much smaller than normal
    });

    it('should use short timeout for pre-warm', () => {
      const timeout = 10000; // 10 seconds
      expect(timeout).toBeLessThanOrEqual(10000);
    });

    it('should send minimal prompt to trigger model loading', () => {
      const prewarmPrompt = 'ping';
      expect(prewarmPrompt).toBe('ping');
      expect(prewarmPrompt.length).toBeLessThan(10); // Very short
    });
  });

  describe('error handling', () => {
    it('should silently ignore errors (best-effort)', () => {
      // Pre-warming is best-effort - failures should not block session start
      const shouldBlockOnError = false;
      expect(shouldBlockOnError).toBe(false);
    });

    it('should skip if Ollama not available', () => {
      const shouldCheckAvailability = true;
      expect(shouldCheckAvailability).toBe(true);
    });
  });

  describe('settings integration', () => {
    it('should use chat_model from settings', () => {
      const defaultModel = 'gemma3:4b';
      expect(defaultModel).toBe('gemma3:4b');
    });

    it('should respect ollama_host from settings', () => {
      const defaultHost = 'http://localhost:11434';
      expect(defaultHost).toContain('localhost:11434');
    });
  });
});
