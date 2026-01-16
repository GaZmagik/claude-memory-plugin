/**
 * Mock-based tests for promote.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promoteMemory } from './promote.js';
import * as fs from 'node:fs';
import * as frontmatterModule from '../core/frontmatter.js';
import { MemoryType } from '../types/enums.js';

describe('promoteMemory mocked edge cases', () => {
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
    vi.spyOn(fs, 'readFileSync').mockReturnValue('some content');

    // Mock parseMemoryFile to return null frontmatter
    vi.spyOn(frontmatterModule, 'parseMemoryFile').mockReturnValue({
      frontmatter: null as any,
      content: 'some content',
    });

    const result = await promoteMemory({
      id: 'test-null',
      targetType: MemoryType.Learning,
      basePath: '/test/path/.claude/memory',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to parse frontmatter');
  });

  it('should return error when target already exists in permanent during move', async () => {
    // Track calls to permanent file path
    let permanentFileChecks = 0;

    // Mock existsSync with call-counting for race condition simulation
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const pathStr = String(p);

      // permanent directory check (line 162) - exists
      if (pathStr.endsWith('/permanent') || pathStr.endsWith('\\permanent')) {
        return true;
      }

      // permanent/temp-file.md - different result each call
      if (pathStr.includes('permanent') && pathStr.includes('temp-file.md')) {
        permanentFileChecks++;
        // First check (findMemoryFile line 66) - not found
        // Second check (move check line 167) - found (race condition)
        return permanentFileChecks > 1;
      }

      // findMemoryFile: temporary/temp-file.md - found
      if (pathStr.includes('temporary') && pathStr.includes('temp-file.md')) {
        return true;
      }

      return false;
    });

    // Mock mkdirSync to prevent actual directory creation
    vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

    vi.spyOn(fs, 'readFileSync').mockReturnValue(`---
type: breadcrumb
title: Test
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
---
Content`);

    vi.spyOn(frontmatterModule, 'parseMemoryFile').mockReturnValue({
      frontmatter: {
        type: MemoryType.Breadcrumb as any,
        title: 'Test',
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-01T00:00:00.000Z',
        tags: [],
      } as any,
      content: 'Content',
    });

    const result = await promoteMemory({
      id: 'temp-file',
      targetType: MemoryType.Learning,
      basePath: '/test/path/.claude/memory',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Target already exists');
  });
});
