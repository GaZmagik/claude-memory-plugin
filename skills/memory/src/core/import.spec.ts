/**
 * Unit tests for import operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { importMemories } from './import.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { ExportPackage } from '../types/api.js';
import * as indexModule from './index.js';
import * as writeModule from './write.js';
import * as linkModule from '../graph/link.js';

describe('importMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return error when no data provided', async () => {
    const result = await importMemories({});
    expect(result.status).toBe('error');
    expect(result.error).toContain('Either data or raw import string is required');
  });

  it('should return error for invalid package', async () => {
    const result = await importMemories({
      data: {} as ExportPackage,
    });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Invalid import package');
  });

  it('should return empty result for empty memories', async () => {
    const result = await importMemories({
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [],
      },
    });

    expect(result.status).toBe('success');
    expect(result.importedCount).toBe(0);
  });

  it('should import new memories', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'success',
    });

    const result = await importMemories({
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [
          {
            id: 'decision-foo',
            frontmatter: {
              type: MemoryType.Decision,
              title: 'Foo',
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              tags: [],
            },
            content: 'Test content',
          },
        ],
      },
    });

    expect(result.status).toBe('success');
    expect(result.importedCount).toBe(1);
    expect(writeModule.writeMemory).toHaveBeenCalledTimes(1);
  });

  it('should skip existing memories with skip strategy', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue({
      id: 'decision-foo',
      type: MemoryType.Decision,
      title: 'Foo',
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-foo.md',
    });

    const writeSpy = vi.spyOn(writeModule, 'writeMemory');

    const result = await importMemories({
      strategy: 'skip',
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [
          {
            id: 'decision-foo',
            frontmatter: {
              type: MemoryType.Decision,
              title: 'Foo Updated',
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-02T00:00:00.000Z',
              tags: [],
            },
            content: 'Updated content',
          },
        ],
      },
    });

    expect(result.status).toBe('success');
    expect(result.skippedCount).toBe(1);
    expect(result.importedCount).toBe(0);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('should merge newer memories with merge strategy', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue({
      id: 'decision-foo',
      type: MemoryType.Decision,
      title: 'Foo',
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-foo.md',
    });

    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'success',
    });

    const result = await importMemories({
      strategy: 'merge',
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [
          {
            id: 'decision-foo',
            frontmatter: {
              type: MemoryType.Decision,
              title: 'Foo Updated',
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-02T00:00:00.000Z',
              tags: [],
            },
            content: 'Updated content',
          },
        ],
      },
    });

    expect(result.status).toBe('success');
    expect(result.mergedCount).toBe(1);
    expect(result.importedCount).toBe(1);
    expect(writeModule.writeMemory).toHaveBeenCalled();
  });

  it('should skip older memories with merge strategy', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue({
      id: 'decision-foo',
      type: MemoryType.Decision,
      title: 'Foo',
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-02T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-foo.md',
    });

    const writeSpy = vi.spyOn(writeModule, 'writeMemory');

    const result = await importMemories({
      strategy: 'merge',
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [
          {
            id: 'decision-foo',
            frontmatter: {
              type: MemoryType.Decision,
              title: 'Foo Old',
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              tags: [],
            },
            content: 'Old content',
          },
        ],
      },
    });

    expect(result.status).toBe('success');
    expect(result.skippedCount).toBe(1);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('should replace existing memories with replace strategy', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue({
      id: 'decision-foo',
      type: MemoryType.Decision,
      title: 'Foo',
      tags: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      scope: Scope.Global,
      relativePath: 'permanent/decision-foo.md',
    });

    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'success',
    });

    const result = await importMemories({
      strategy: 'replace',
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [
          {
            id: 'decision-foo',
            frontmatter: {
              type: MemoryType.Decision,
              title: 'Foo Replaced',
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              tags: [],
            },
            content: 'Replaced content',
          },
        ],
      },
    });

    expect(result.status).toBe('success');
    expect(result.replacedCount).toBe(1);
    expect(result.importedCount).toBe(1);
    expect(writeModule.writeMemory).toHaveBeenCalled();
  });

  it('should use dry run mode', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    const writeSpy = vi.spyOn(writeModule, 'writeMemory');

    const result = await importMemories({
      dryRun: true,
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [
          {
            id: 'decision-foo',
            frontmatter: {
              type: MemoryType.Decision,
              title: 'Foo',
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              tags: [],
            },
            content: 'Test content',
          },
        ],
      },
    });

    expect(result.status).toBe('success');
    expect(result.dryRun).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('should parse JSON string', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'success',
    });

    const jsonData = JSON.stringify({
      version: '1.0.0',
      exportedAt: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          frontmatter: {
            type: 'decision',
            title: 'Foo',
            created: '2026-01-01T00:00:00.000Z',
            updated: '2026-01-01T00:00:00.000Z',
            tags: [],
          },
          content: 'Test content',
        },
      ],
    });

    const result = await importMemories({ raw: jsonData });

    expect(result.status).toBe('success');
    expect(result.importedCount).toBe(1);
  });

  it('should import graph relationships', async () => {
    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'success',
    });
    const linkSpy = vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      edge: { source: 'a', target: 'b', label: 'relates-to' },
      alreadyExists: false,
    });

    const result = await importMemories({
      data: {
        version: '1.0.0',
        exportedAt: '2026-01-01T00:00:00.000Z',
        memories: [
          {
            id: 'decision-foo',
            frontmatter: {
              type: MemoryType.Decision,
              title: 'Foo',
              created: '2026-01-01T00:00:00.000Z',
              updated: '2026-01-01T00:00:00.000Z',
              tags: [],
            },
            content: 'Content',
          },
        ],
        graph: {
          nodes: [{ id: 'decision-foo', type: 'decision' }],
          edges: [{ source: 'decision-foo', target: 'hub-decisions', label: 'contributes-to' }],
        },
      },
    });

    expect(result.status).toBe('success');
    expect(linkSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'decision-foo',
        target: 'hub-decisions',
        relation: 'contributes-to',
      })
    );
  });
});
