/**
 * Mock-based tests for index.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadIndex, rebuildIndex } from './index.js';
import * as fsUtilsModule from './fs-utils.js';

describe('index.ts mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadIndex', () => {
    it('should return empty index when memories array is missing', async () => {
      vi.spyOn(fsUtilsModule, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtilsModule, 'readJsonFile').mockResolvedValue({
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        // memories array intentionally missing - NOT an array
        memories: 'not-an-array',
      });

      const result = await loadIndex({ basePath: '/test/path' });

      expect(result.memories).toEqual([]);
    });
  });

  describe('rebuildIndex', () => {
    it('should return error when rebuild throws', async () => {
      vi.spyOn(fsUtilsModule, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtilsModule, 'listMarkdownFiles').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await rebuildIndex({ basePath: '/test/path' });

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to rebuild index');
      expect(result.error).toContain('Permission denied');
    });
  });
});
