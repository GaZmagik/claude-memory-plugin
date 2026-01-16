/**
 * Mock-based tests for move.ts edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { moveMemory } from './move.js';
import { Scope } from '../types/enums.js';
import * as frontmatterModule from '../core/frontmatter.js';
import * as structureModule from '../graph/structure.js';

describe('moveMemory mocked edge cases', () => {
  let tempDir: string;
  let projectPath: string;
  let targetPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'move-mock-test-'));
    projectPath = path.join(tempDir, 'project');
    targetPath = path.join(tempDir, 'target');

    fs.mkdirSync(path.join(projectPath, 'permanent'), { recursive: true });
    fs.mkdirSync(path.join(targetPath, 'permanent'), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns error when frontmatter parse fails', async () => {
    // Create source file
    const sourceFile = path.join(projectPath, 'permanent', 'learning-badparse.md');
    fs.writeFileSync(
      sourceFile,
      `---
type: learning
title: Test
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: project
---
Content`
    );

    // Mock parseMemoryFile to return null frontmatter
    vi.spyOn(frontmatterModule, 'parseMemoryFile').mockReturnValue({
      frontmatter: null as any,
      content: 'Content',
    });

    const result = await moveMemory({
      id: 'learning-badparse',
      sourceBasePath: projectPath,
      targetBasePath: targetPath,
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('Failed to parse frontmatter');
  });

  it('creates new target graph when loadGraph fails', async () => {
    // Create source file
    const sourceFile = path.join(projectPath, 'permanent', 'learning-newgraph.md');
    fs.writeFileSync(
      sourceFile,
      `---
type: learning
title: Test
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: project
---
Content`
    );

    // Create source graph
    fs.writeFileSync(
      path.join(projectPath, 'graph.json'),
      JSON.stringify({ version: 1, nodes: [{ id: 'learning-newgraph', type: 'learning' }], edges: [] })
    );

    // Track saveGraph calls
    let savedGraph: any = null;

    // Mock loadGraph to succeed for source but throw for target
    let loadCount = 0;
    vi.spyOn(structureModule, 'loadGraph').mockImplementation(async (basePath) => {
      loadCount++;
      if (basePath === projectPath) {
        return { version: 1, nodes: [{ id: 'learning-newgraph', type: 'learning' }], edges: [] };
      }
      // Target - throw to trigger catch block
      throw new Error('Graph not found');
    });

    vi.spyOn(structureModule, 'saveGraph').mockImplementation(async (basePath, graph) => {
      if (basePath === targetPath) {
        savedGraph = graph;
      }
      return;
    });

    vi.spyOn(structureModule, 'removeNode').mockReturnValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    const result = await moveMemory({
      id: 'learning-newgraph',
      sourceBasePath: projectPath,
      targetBasePath: targetPath,
      targetScope: Scope.Local,
    });

    expect(result.status).toBe('success');
    expect(result.changes.targetGraphUpdated).toBe(true);

    // Should have created a new graph with the node
    expect(savedGraph).toBeDefined();
    expect(savedGraph.nodes).toContainEqual({ id: 'learning-newgraph', type: 'learning' });
  });
});
