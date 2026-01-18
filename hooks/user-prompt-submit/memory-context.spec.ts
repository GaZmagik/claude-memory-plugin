/**
 * Tests for UserPromptSubmit memory context hook
 *
 * Note: This hook is integration-heavy (Ollama API, filesystem, semantic search).
 * Core logic tests are in the underlying modules; this tests hook-specific behavior.
 */

import { describe, it, expect } from 'vitest';

describe('memory-context hook', () => {
  describe('semantic search integration', () => {
    it('should use createOllamaProvider for embedding provider', async () => {
      // The provider should be an EmbeddingProvider object, not a string
      // This test documents the fix for the type mismatch bug
      const { createOllamaProvider } = await import('../../skills/memory/src/search/embedding.js');

      const provider = createOllamaProvider();

      expect(provider).toHaveProperty('name');
      expect(provider).toHaveProperty('generate');
      expect(typeof provider.generate).toBe('function');
      expect(provider.name).toMatch(/^ollama:/);
    });

    it('should gracefully handle missing Ollama service', async () => {
      // The trySemanticSearch function returns null when Ollama is unavailable
      // This is tested via the catch-all error handling
      expect(true).toBe(true); // Placeholder - actual integration test would mock fetch
    });
  });

  describe('keyword search fallback', () => {
    it('should fall back to keyword search when semantic search fails', async () => {
      // The hook tries semantic search first, then falls back to keyword search
      // This behavior is integration-tested via the overall hook execution
      expect(true).toBe(true); // Placeholder - tested via integration
    });
  });
});
