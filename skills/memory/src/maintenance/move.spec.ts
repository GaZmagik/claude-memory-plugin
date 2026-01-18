/**
 * Tests for move.ts - Move memory between scopes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { moveMemory } from './move.js';
import type { MoveRequest } from './move.js';
import { Scope } from '../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as structureModule from '../graph/structure.js';

describe('moveMemory', () => {
  let tempDir: string;
  let projectPath: string;
  let localPath: string;
  let globalPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'move-test-'));
    projectPath = path.join(tempDir, 'project', '.claude', 'memory');
    localPath = path.join(tempDir, 'project', '.claude', 'memory', 'local');
    globalPath = path.join(tempDir, 'global', '.claude', 'memory');

    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(localPath, { recursive: true });
    fs.mkdirSync(globalPath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic move operations', () => {
    it('should move file between scopes', async () => {
      const sourcePermanent = path.join(projectPath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      const sourceFile = path.join(sourcePermanent, 'learning-test.md');
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

      fs.writeFileSync(
        path.join(projectPath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [{ id: 'learning-test', type: 'learning' }], edges: [] })
      );

      fs.writeFileSync(
        path.join(projectPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{
            id: 'learning-test',
            type: 'learning',
            title: 'Test',
            tags: [],
            created: '2026-01-13T00:00:00.000Z',
            updated: '2026-01-13T00:00:00.000Z',
            scope: 'project',
            relativePath: 'permanent/learning-test.md',
          }],
        })
      );

      const request: MoveRequest = {
        id: 'learning-test',
        sourceBasePath: projectPath,
        targetBasePath: localPath,
        targetScope: Scope.Local,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.fileMoved).toBe(true);
      expect(fs.existsSync(sourceFile)).toBe(false);
      expect(fs.existsSync(path.join(localPath, 'permanent', 'learning-test.md'))).toBe(true);
    });

    it('should update frontmatter scope', async () => {
      const sourcePermanent = path.join(projectPath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-scope.md'),
        `---
type: learning
title: Scope Test
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: project
---
Content`
      );

      fs.writeFileSync(path.join(projectPath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(projectPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: MoveRequest = {
        id: 'learning-scope',
        sourceBasePath: projectPath,
        targetBasePath: globalPath,
        targetScope: Scope.Global,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('success');

      const content = fs.readFileSync(path.join(globalPath, 'permanent', 'learning-scope.md'), 'utf8');
      expect(content).toContain('scope: global');
    });

    it('should preserve permanent/temporary structure', async () => {
      const sourceTemporary = path.join(projectPath, 'temporary');
      fs.mkdirSync(sourceTemporary, { recursive: true });

      fs.writeFileSync(
        path.join(sourceTemporary, 'thought-123.md'),
        `---
type: breadcrumb
title: Thought
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: local
---
Thinking`
      );

      fs.writeFileSync(path.join(projectPath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(projectPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: MoveRequest = {
        id: 'thought-123',
        sourceBasePath: projectPath,
        targetBasePath: globalPath,
        targetScope: Scope.Global,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('success');
      expect(fs.existsSync(path.join(globalPath, 'temporary', 'thought-123.md'))).toBe(true);
    });
  });

  describe('graph updates', () => {
    it('should remove from source graph and add to target graph', async () => {
      const sourcePermanent = path.join(projectPath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-move.md'),
        `---
type: learning
title: Move
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: project
---
Content`
      );

      fs.writeFileSync(
        path.join(projectPath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [{ id: 'learning-move', type: 'learning' }], edges: [] })
      );

      fs.writeFileSync(
        path.join(localPath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [], edges: [] })
      );

      fs.writeFileSync(path.join(projectPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: MoveRequest = {
        id: 'learning-move',
        sourceBasePath: projectPath,
        targetBasePath: localPath,
        targetScope: Scope.Local,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.sourceGraphUpdated).toBe(true);
      expect(result.changes.targetGraphUpdated).toBe(true);

      const sourceGraph = JSON.parse(fs.readFileSync(path.join(projectPath, 'graph.json'), 'utf8'));
      expect(sourceGraph.nodes).not.toContainEqual({ id: 'learning-move', type: 'learning' });

      const targetGraph = JSON.parse(fs.readFileSync(path.join(localPath, 'graph.json'), 'utf8'));
      expect(targetGraph.nodes).toContainEqual({ id: 'learning-move', type: 'learning' });
    });
  });

  describe('index updates', () => {
    it('should remove from source index and add to target index', async () => {
      const sourcePermanent = path.join(projectPath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-idx.md'),
        `---
type: learning
title: Index Test
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: project
---
Content`
      );

      fs.writeFileSync(
        path.join(projectPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{
            id: 'learning-idx',
            type: 'learning',
            title: 'Index Test',
            tags: [],
            created: '2026-01-13T00:00:00.000Z',
            updated: '2026-01-13T00:00:00.000Z',
            scope: 'project',
            relativePath: 'permanent/learning-idx.md',
          }],
        })
      );

      fs.writeFileSync(
        path.join(localPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      fs.writeFileSync(path.join(projectPath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));

      const request: MoveRequest = {
        id: 'learning-idx',
        sourceBasePath: projectPath,
        targetBasePath: localPath,
        targetScope: Scope.Local,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.sourceIndexUpdated).toBe(true);
      expect(result.changes.targetIndexUpdated).toBe(true);
    });
  });

  describe('error cases', () => {
    it('should error when source and target are same', async () => {
      const request: MoveRequest = {
        id: 'learning-test',
        sourceBasePath: projectPath,
        targetBasePath: projectPath,
        targetScope: Scope.Project,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Source and target scopes are the same');
    });

    it('should error when memory not found', async () => {
      const request: MoveRequest = {
        id: 'learning-missing',
        sourceBasePath: projectPath,
        targetBasePath: localPath,
        targetScope: Scope.Local,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Memory not found');
    });

    it('should error when target already exists', async () => {
      const sourcePermanent = path.join(projectPath, 'permanent');
      const targetPermanent = path.join(localPath, 'permanent');
      fs.mkdirSync(sourcePermanent, { recursive: true });
      fs.mkdirSync(targetPermanent, { recursive: true });

      fs.writeFileSync(
        path.join(sourcePermanent, 'learning-dup.md'),
        `---
type: learning
title: Duplicate
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: project
---
Content`
      );

      fs.writeFileSync(
        path.join(targetPermanent, 'learning-dup.md'),
        `---
type: learning
title: Existing
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
scope: local
---
Already exists`
      );

      fs.writeFileSync(path.join(projectPath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(projectPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: MoveRequest = {
        id: 'learning-dup',
        sourceBasePath: projectPath,
        targetBasePath: localPath,
        targetScope: Scope.Local,
      };

      const result = await moveMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Target already exists');
    });
  });
});

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

  // Note: Removed phantom test 'returns error when frontmatter parse fails'
  // parseMemoryFile throws on invalid input, never returns null frontmatter

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
