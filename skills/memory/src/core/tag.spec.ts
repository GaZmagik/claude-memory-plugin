/**
 * Unit tests for tag operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tagMemory, untagMemory } from './tag.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as readModule from './read.js';
import * as frontmatterModule from './frontmatter.js';
import * as indexModule from './index.js';
import * as fsUtils from './fs-utils.js';

describe('tagMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when id is missing', async () => {
    const result = await tagMemory({ id: '', tags: ['tag1'] });
    expect(result.status).toBe('error');
    expect(result.error).toContain('id is required');
  });

  it('should return error when tags are empty', async () => {
    const result = await tagMemory({ id: 'test-id', tags: [] });
    expect(result.status).toBe('error');
    expect(result.error).toContain('tags are required');
  });

  it('should return error when memory not found', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'error',
      error: 'Memory not found: test-id',
    });

    const result = await tagMemory({ id: 'test-id', tags: ['new-tag'] });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found');
  });

  it('should add tags to memory', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Test',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: ['existing'],
        },
        content: 'Test content',
        filePath: '/test/path.md',
      },
    });

    vi.spyOn(frontmatterModule, 'updateFrontmatter').mockReturnValue({
      type: MemoryType.Decision,
      title: 'Test',
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-12T00:00:00.000Z',
      tags: ['existing', 'new-tag', 'another'],
    });

    vi.spyOn(frontmatterModule, 'serialiseMemoryFile').mockReturnValue('---\nmocked\n---\n\nTest content\n');
    vi.spyOn(fsUtils, 'writeFileAtomic').mockReturnValue(undefined);

    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue({
      id: 'test-id',
      type: MemoryType.Decision,
      title: 'Test',
      tags: ['existing'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/test-id.md',
    });

    vi.spyOn(indexModule, 'addToIndex').mockResolvedValue(undefined);

    const result = await tagMemory({
      id: 'test-id',
      tags: ['new-tag', 'another'],
    });

    expect(result.status).toBe('success');
    expect(result.previousTags).toEqual(['existing']);
    expect(result.newTags).toEqual(['existing', 'new-tag', 'another']);
    expect(fsUtils.writeFileAtomic).toHaveBeenCalled();
    expect(indexModule.addToIndex).toHaveBeenCalled();
  });

  it('should not duplicate existing tags', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Test',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: ['existing', 'duplicate'],
        },
        content: 'Test content',
        filePath: '/test/path.md',
      },
    });

    vi.spyOn(frontmatterModule, 'updateFrontmatter').mockImplementation((existing, updates) => ({
      ...existing,
      ...updates,
      updated: '2026-01-12T00:00:00.000Z',
    }));

    vi.spyOn(frontmatterModule, 'serialiseMemoryFile').mockReturnValue('---\nmocked\n---\n\nTest content\n');
    vi.spyOn(fsUtils, 'writeFileAtomic').mockReturnValue(undefined);
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(indexModule, 'addToIndex').mockResolvedValue(undefined);

    const result = await tagMemory({
      id: 'test-id',
      tags: ['duplicate', 'new-tag'],
    });

    expect(result.status).toBe('success');
    expect(result.newTags).toEqual(['existing', 'duplicate', 'new-tag']);
  });
});

describe('untagMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when id is missing', async () => {
    const result = await untagMemory({ id: '', tags: ['tag1'] });
    expect(result.status).toBe('error');
    expect(result.error).toContain('id is required');
  });

  it('should return error when tags are empty', async () => {
    const result = await untagMemory({ id: 'test-id', tags: [] });
    expect(result.status).toBe('error');
    expect(result.error).toContain('tags are required');
  });

  it('should return error when memory not found', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'error',
      error: 'Memory not found: test-id',
    });

    const result = await untagMemory({ id: 'test-id', tags: ['tag-to-remove'] });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found');
  });

  it('should remove tags from memory', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Test',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: ['keep', 'remove-me', 'also-keep'],
        },
        content: 'Test content',
        filePath: '/test/path.md',
      },
    });

    vi.spyOn(frontmatterModule, 'updateFrontmatter').mockImplementation((existing, updates) => ({
      ...existing,
      ...updates,
      updated: '2026-01-12T00:00:00.000Z',
    }));

    vi.spyOn(frontmatterModule, 'serialiseMemoryFile').mockReturnValue('---\nmocked\n---\n\nTest content\n');
    vi.spyOn(fsUtils, 'writeFileAtomic').mockReturnValue(undefined);

    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue({
      id: 'test-id',
      type: MemoryType.Decision,
      title: 'Test',
      tags: ['keep', 'remove-me', 'also-keep'],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/test-id.md',
    });

    vi.spyOn(indexModule, 'addToIndex').mockResolvedValue(undefined);

    const result = await untagMemory({
      id: 'test-id',
      tags: ['remove-me'],
    });

    expect(result.status).toBe('success');
    expect(result.previousTags).toEqual(['keep', 'remove-me', 'also-keep']);
    expect(result.newTags).toEqual(['keep', 'also-keep']);
    expect(result.notFound).toBeUndefined();
    expect(fsUtils.writeFileAtomic).toHaveBeenCalled();
    expect(indexModule.addToIndex).toHaveBeenCalled();
  });

  it('should report tags not found', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Test',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: ['existing'],
        },
        content: 'Test content',
        filePath: '/test/path.md',
      },
    });

    vi.spyOn(frontmatterModule, 'updateFrontmatter').mockImplementation((existing, updates) => ({
      ...existing,
      ...updates,
      updated: '2026-01-12T00:00:00.000Z',
    }));

    vi.spyOn(frontmatterModule, 'serialiseMemoryFile').mockReturnValue('---\nmocked\n---\n\nTest content\n');
    vi.spyOn(fsUtils, 'writeFileAtomic').mockReturnValue(undefined);
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(indexModule, 'addToIndex').mockResolvedValue(undefined);

    const result = await untagMemory({
      id: 'test-id',
      tags: ['nonexistent', 'also-nonexistent'],
    });

    expect(result.status).toBe('success');
    expect(result.notFound).toEqual(['nonexistent', 'also-nonexistent']);
    expect(result.newTags).toEqual(['existing']);
  });

  it('should remove multiple tags at once', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Test',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: ['a', 'b', 'c', 'd'],
        },
        content: 'Test content',
        filePath: '/test/path.md',
      },
    });

    vi.spyOn(frontmatterModule, 'updateFrontmatter').mockImplementation((existing, updates) => ({
      ...existing,
      ...updates,
      updated: '2026-01-12T00:00:00.000Z',
    }));

    vi.spyOn(frontmatterModule, 'serialiseMemoryFile').mockReturnValue('---\nmocked\n---\n\nTest content\n');
    vi.spyOn(fsUtils, 'writeFileAtomic').mockReturnValue(undefined);
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(indexModule, 'addToIndex').mockResolvedValue(undefined);

    const result = await untagMemory({
      id: 'test-id',
      tags: ['b', 'd'],
    });

    expect(result.status).toBe('success');
    expect(result.newTags).toEqual(['a', 'c']);
  });

  it('should handle errors in tagMemory', async () => {
    vi.spyOn(readModule, 'readMemory').mockRejectedValue(new Error('Read failed'));

    const result = await tagMemory({
      id: 'test-id',
      tags: ['new-tag'],
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to tag memory');
    expect(result.error).toContain('Read failed');
  });

  it('should handle errors in untagMemory', async () => {
    vi.spyOn(readModule, 'readMemory').mockRejectedValue(new Error('Read failed'));

    const result = await untagMemory({
      id: 'test-id',
      tags: ['some-tag'],
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to untag memory');
    expect(result.error).toContain('Read failed');
  });
});
