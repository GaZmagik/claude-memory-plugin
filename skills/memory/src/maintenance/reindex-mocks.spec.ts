/**
 * Mock-based tests for reindex.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reindexMemory } from './reindex.js';
import * as fs from 'node:fs';
import * as frontmatterModule from '../core/frontmatter.js';

describe('reindexMemory mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when frontmatter is null', async () => {
    // Mock fs.existsSync to find file in permanent
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const pathStr = String(p);
      if (pathStr.includes('permanent') && pathStr.includes('test-null.md')) {
        return true;
      }
      return false;
    });

    // Mock fs.readFileSync to return content
    vi.spyOn(fs, 'readFileSync').mockReturnValue('---\n---\nsome content');

    // Mock parseMemoryFile to return null frontmatter
    vi.spyOn(frontmatterModule, 'parseMemoryFile').mockReturnValue({
      frontmatter: null as any,
      content: 'some content',
    });

    const result = await reindexMemory({
      id: 'test-null',
      basePath: '/test/path/.claude/memory',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to parse frontmatter');
  });
});
