/**
 * Unit tests for export operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportMemories } from './export.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from './index.js';
import * as readModule from './read.js';
import * as graphModule from '../graph/structure.js';

describe('exportMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty package when no memories exist', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await exportMemories({});

    expect(result.status).toBe('success');
    expect(result.count).toBe(0);
    expect(result.data?.memories).toEqual([]);
  });

  it('should export all memories when no filters provided', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'learning-bar',
          type: MemoryType.Learning,
          title: 'Bar',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/learning-bar.md',
        },
      ],
    });

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Mock',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: [],
        },
        content: 'Mock content',
        filePath: '/mock/path.md',
      },
    });

    const result = await exportMemories({});

    expect(result.status).toBe('success');
    expect(result.count).toBe(2);
    expect(result.data?.memories).toHaveLength(2);
  });

  it('should filter by type', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'learning-bar',
          type: MemoryType.Learning,
          title: 'Bar',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/learning-bar.md',
        },
      ],
    });

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Mock',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: [],
        },
        content: 'Mock content',
        filePath: '/mock/path.md',
      },
    });

    const result = await exportMemories({ type: MemoryType.Decision });

    expect(result.status).toBe('success');
    expect(result.count).toBe(1);
  });

  it('should filter by scope', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-global',
          type: MemoryType.Decision,
          title: 'Global',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-global.md',
        },
        {
          id: 'decision-project',
          type: MemoryType.Decision,
          title: 'Project',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-project.md',
        },
      ],
    });

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Mock',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: [],
        },
        content: 'Mock content',
        filePath: '/mock/path.md',
      },
    });

    const result = await exportMemories({ scope: Scope.Project });

    expect(result.status).toBe('success');
    expect(result.count).toBe(1);
    expect(result.data?.sourceScope).toBe(Scope.Project);
  });

  it('should export as JSON by default', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
      ],
    });

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Foo',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: [],
        },
        content: 'Test content',
        filePath: '/mock/path.md',
      },
    });

    const result = await exportMemories({});

    expect(result.status).toBe('success');
    expect(result.serialised).toContain('"version"');
    expect(result.serialised).toContain('"memories"');

    // Verify it's valid JSON
    const parsed = JSON.parse(result.serialised!);
    expect(parsed.memories).toHaveLength(1);
  });

  it('should export as YAML when requested', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo',
          tags: ['tag1'],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
      ],
    });

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Foo',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: ['tag1'],
        },
        content: 'Test content',
        filePath: '/mock/path.md',
      },
    });

    const result = await exportMemories({ format: 'yaml' });

    expect(result.status).toBe('success');
    expect(result.serialised).toContain('version:');
    expect(result.serialised).toContain('memories:');
    expect(result.serialised).toContain('- id:');
  });

  it('should include graph when requested', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-foo',
          type: MemoryType.Decision,
          title: 'Foo',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/decision-foo.md',
        },
        {
          id: 'learning-bar',
          type: MemoryType.Learning,
          title: 'Bar',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: Scope.Global,
          relativePath: 'permanent/learning-bar.md',
        },
      ],
    });

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Mock',
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          tags: [],
        },
        content: 'Mock content',
        filePath: '/mock/path.md',
      },
    });

    vi.spyOn(graphModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [
        { id: 'decision-foo', type: 'decision' },
        { id: 'learning-bar', type: 'learning' },
        { id: 'external-node', type: 'artifact' },
      ],
      edges: [
        { source: 'decision-foo', target: 'learning-bar', label: 'relates-to' },
        { source: 'decision-foo', target: 'external-node', label: 'relates-to' },
      ],
    });

    const result = await exportMemories({ includeGraph: true });

    expect(result.status).toBe('success');
    expect(result.data?.graph).toBeDefined();
    expect(result.data?.graph?.nodes).toHaveLength(2);
    expect(result.data?.graph?.edges).toHaveLength(1);
  });

  it('should include version and timestamp', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [],
    });

    const result = await exportMemories({});

    expect(result.status).toBe('success');
    expect(result.data?.version).toBe('1.0.0');
    expect(result.data?.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
