/**
 * Unit tests for hooks/src/services/ollama.ts
 *
 * Note: These tests focus on the public API behavior.
 * Timeout and retry logic are tested through integration tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Ollama } from 'ollama';

// Mock the ollama module before any imports
const mockGenerate = vi.fn();
const mockEmbed = vi.fn();
const mockList = vi.fn();

vi.mock('ollama', () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    generate: mockGenerate,
    embed: mockEmbed,
    list: mockList,
  })),
}));

// Import after mocking
import { generate, embed, isAvailable, MODELS, CONFIG } from '../../../hooks/src/services/ollama.js';

describe('ollama service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generate', () => {
    it('should generate text successfully', async () => {
      mockGenerate.mockResolvedValue({
        response: 'Generated text response',
      });

      const result = await generate('Test prompt');

      expect(result).toBe('Generated text response');
      expect(mockGenerate).toHaveBeenCalledWith({
        model: 'gemma3:4b',
        prompt: 'Test prompt',
        options: { num_ctx: 32768 },
        stream: false,
      });
    });

    it('should use custom model when provided', async () => {
      mockGenerate.mockResolvedValue({
        response: 'Response',
      });

      await generate('Test', 'custom-model');

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom-model',
        })
      );
    });

    it('should use custom num_ctx when provided', async () => {
      mockGenerate.mockResolvedValue({
        response: 'Response',
      });

      await generate('Test', 'gemma3:4b', { num_ctx: 8192 });

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { num_ctx: 8192 },
        })
      );
    });

    it('should return empty string on error', async () => {
      mockGenerate.mockRejectedValue(new Error('Ollama error'));

      const result = await generate('Test prompt');

      expect(result).toBe('');
    });

    it('should handle empty response', async () => {
      mockGenerate.mockResolvedValue({
        response: '',
      });

      const result = await generate('Test prompt');

      expect(result).toBe('');
    });

    it('should handle missing response field', async () => {
      mockGenerate.mockResolvedValue({});

      const result = await generate('Test prompt');

      expect(result).toBe('');
    });

    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      mockGenerate.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ response: 'Success on retry' });
      });

      const result = await generate('Test', undefined, { maxRetries: 2 });

      expect(result).toBe('Success on retry');
      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it('should return empty string after max retries', async () => {
      mockGenerate.mockRejectedValue(new Error('Persistent failure'));

      const result = await generate('Test', undefined, { maxRetries: 2 });

      expect(result).toBe('');
      expect(mockGenerate).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('embed', () => {
    it('should generate embeddings successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockEmbed.mockResolvedValue({
        embeddings: [mockEmbedding],
      });

      const result = await embed('Test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockEmbed).toHaveBeenCalledWith({
        model: 'embeddinggemma:latest',
        input: 'Test text',
      });
    });

    it('should use custom model when provided', async () => {
      mockEmbed.mockResolvedValue({
        embeddings: [[0.1, 0.2]],
      });

      await embed('Test', 'custom-embedding-model');

      expect(mockEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'custom-embedding-model',
        })
      );
    });

    it('should return empty array on error', async () => {
      mockEmbed.mockRejectedValue(new Error('Embedding error'));

      const result = await embed('Test text');

      expect(result).toEqual([]);
    });

    it('should handle empty embeddings response', async () => {
      mockEmbed.mockResolvedValue({
        embeddings: [],
      });

      const result = await embed('Test text');

      expect(result).toEqual([]);
    });

    it('should handle missing embeddings field', async () => {
      mockEmbed.mockResolvedValue({});

      const result = await embed('Test text');

      expect(result).toEqual([]);
    });

    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      mockEmbed.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ embeddings: [[0.1, 0.2]] });
      });

      const result = await embed('Test', undefined, { maxRetries: 2 });

      expect(result).toEqual([0.1, 0.2]);
      expect(attempts).toBe(3);
    });

    it('should return empty array after max retries', async () => {
      mockEmbed.mockRejectedValue(new Error('Persistent failure'));

      const result = await embed('Test', undefined, { maxRetries: 2 });

      expect(result).toEqual([]);
      expect(mockEmbed).toHaveBeenCalledTimes(3);
    });

    it('should handle large embedding vectors', async () => {
      const largeEmbedding = Array.from({ length: 1024 }, (_, i) => i / 1024);
      mockEmbed.mockResolvedValue({
        embeddings: [largeEmbedding],
      });

      const result = await embed('Test');

      expect(result).toEqual(largeEmbedding);
      expect(result.length).toBe(1024);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      mockList.mockResolvedValue({
        models: [
          { name: 'gemma3:4b' },
          { name: 'llama2:latest' },
        ],
      });

      const result = await isAvailable();

      expect(result).toBe(true);
    });

    it('should return false when Ollama is not available', async () => {
      mockList.mockRejectedValue(new Error('Connection refused'));

      const result = await isAvailable();

      expect(result).toBe(false);
    });

    it('should return true when specific model is available', async () => {
      mockList.mockResolvedValue({
        models: [
          { name: 'gemma3:4b' },
          { name: 'llama2:latest' },
        ],
      });

      const result = await isAvailable('gemma3');

      expect(result).toBe(true);
    });

    it('should return false when specific model is not available', async () => {
      mockList.mockResolvedValue({
        models: [
          { name: 'gemma3:4b' },
        ],
      });

      const result = await isAvailable('llama2');

      expect(result).toBe(false);
    });

    it('should return false when no models available', async () => {
      mockList.mockResolvedValue({
        models: [],
      });

      const result = await isAvailable();

      expect(result).toBe(false);
    });

    it('should handle partial model name matching', async () => {
      mockList.mockResolvedValue({
        models: [
          { name: 'gemma3:4b' },
        ],
      });

      expect(await isAvailable('gemma3')).toBe(true);
      expect(await isAvailable('gemma3:4b')).toBe(true);
      expect(await isAvailable('4b')).toBe(true);
    });

    it('should handle missing models field', async () => {
      mockList.mockResolvedValue({});

      const result = await isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('constants', () => {
    it('should export MODELS constant', () => {
      expect(MODELS.CHAT).toBe('gemma3:4b');
      expect(MODELS.EMBEDDING).toBe('embeddinggemma:latest');
    });

    it('should export CONFIG constant', () => {
      expect(CONFIG.HOST).toBe('http://localhost:11434');
      expect(CONFIG.TIMEOUT_MS).toBe(10000);
      expect(CONFIG.MAX_RETRIES).toBe(2);
      expect(CONFIG.NUM_CTX).toBe(32768);
    });
  });
});
