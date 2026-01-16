/**
 * Mock-based tests for sync-frontmatter.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncFrontmatter } from './sync-frontmatter.js';
import * as fs from 'node:fs';
import * as frontmatterModule from '../core/frontmatter.js';
import * as structureModule from '../graph/structure.js';
import * as edgesModule from '../graph/edges.js';
import * as fsUtilsModule from '../core/fs-utils.js';
import { MemoryType } from '../types/enums.js';

describe('syncFrontmatter mocked edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should record error when frontmatter fails to parse', async () => {
    // Mock graph with one node that has links
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [{ id: 'test-node', type: MemoryType.Learning }],
      edges: [{ source: 'test-node', target: 'other-node', label: 'relates-to' }],
    });

    // Mock findMemoryFile to return a path
    vi.spyOn(fsUtilsModule, 'findMemoryFile').mockReturnValue('/test/path/permanent/test-node.md');

    // Mock getOutboundEdges to return edges (so we have links to sync)
    vi.spyOn(edgesModule, 'getOutboundEdges').mockReturnValue([
      { source: 'test-node', target: 'other-node', label: 'relates-to' },
    ]);

    // Mock file content read
    vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid frontmatter content');

    // Mock parseMemoryFile to return null frontmatter
    vi.spyOn(frontmatterModule, 'parseMemoryFile').mockReturnValue({
      frontmatter: null as any,
      content: 'some content',
    });

    const result = await syncFrontmatter({
      basePath: '/test/path',
      ids: ['test-node'],  // Pass ids directly to bypass getAllMemoryIds
    });

    expect(result.status).toBe('error');  // 'error' when errors array has items
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0]).toContain('Failed to parse frontmatter');
  });
});
