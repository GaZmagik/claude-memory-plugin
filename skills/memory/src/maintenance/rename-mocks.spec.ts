/**
 * Mock-based tests for rename.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renameMemory } from './rename.js';
import * as fs from 'node:fs';
import * as frontmatterModule from '../core/frontmatter.js';

describe('renameMemory mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when frontmatter is null', async () => {
    // Mock fs.existsSync: old file exists, new file does not
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const pathStr = String(p);
      // Old path exists
      if (pathStr.includes('permanent') && pathStr.includes('old-id.md')) {
        return true;
      }
      // New path does not exist
      if (pathStr.includes('permanent') && pathStr.includes('new-id.md')) {
        return false;
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

    const result = await renameMemory({
      oldId: 'old-id',
      newId: 'new-id',
      basePath: '/test/path/.claude/memory',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to parse frontmatter');
  });
});
