/**
 * Mock-based tests for search.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { searchMemories } from './search.js';
import * as indexModule from './index.js';
import * as fsUtilsModule from './fs-utils.js';
import { MemoryType, Scope } from '../types/enums.js';

describe('searchMemories mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip file when readFile throws (content match only)', async () => {
    // Mock index with a memory entry - title and tags won't match query
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: memoryId('learning-unrelated'),
          title: 'Unrelated Title',
          type: MemoryType.Learning,
          tags: ['other'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/learning-unrelated.md',
        },
      ],
    });

    // Mock file read to throw - only content could match but we can't read it
    vi.spyOn(fsUtilsModule, 'readFile').mockImplementation(() => {
      throw new Error('File corrupted');
    });

    const result = await searchMemories({
      query: 'secretkeyword',
      basePath: '/test/path',
    });

    // Search should succeed, file skipped due to read error (no title/tag match)
    expect(result.status).toBe('success');
    expect(result.results).toHaveLength(0);
  });

  it('should return error when loadIndex fails', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockRejectedValue(new Error('Index corrupted'));

    const result = await searchMemories({
      query: 'test',
      basePath: '/test/path',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to search memories');
    expect(result.error).toContain('Index corrupted');
  });
});
