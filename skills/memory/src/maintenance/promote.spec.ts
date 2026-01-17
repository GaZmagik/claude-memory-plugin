/**
 * Tests for promote.ts - Change memory type
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as frontmatterModule from '../core/frontmatter.js';
import { promoteMemory } from './promote.js';
import type { PromoteRequest } from './promote.js';
import { MemoryType } from '../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('promoteMemory', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promote-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(basePath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('type changes', () => {
    it('should change memory type in frontmatter', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-test.md'), `---
type: learning
title: Test
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [{ id: 'learning-test', type: 'learning' }], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [{ id: 'learning-test', type: 'learning', title: 'Test', tags: [], created: '2026-01-13T00:00:00.000Z', updated: '2026-01-13T00:00:00.000Z', scope: 'project', relativePath: 'permanent/learning-test.md' }] }));

      const request: PromoteRequest = { id: 'learning-test', targetType: MemoryType.Artifact, basePath };
      const result = await promoteMemory(request);

      expect(result.status).toBe('success');
      expect(result.fromType).toBe('learning');
      expect(result.toType).toBe(MemoryType.Artifact);
      expect(result.changes.frontmatterUpdated).toBe(true);
      expect(result.changes.fileRenamed).toBe(true);
      expect(result.newId).toBe('artifact-test');

      // File is renamed to artifact-test.md
      const content = fs.readFileSync(path.join(permanentDir, 'artifact-test.md'), 'utf8');
      expect(content).toContain('type: artifact');
    });

    it('should update graph node type', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-graph.md'), `---
type: learning
title: Graph
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [{ id: 'learning-graph', type: 'learning' }], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: PromoteRequest = { id: 'learning-graph', targetType: MemoryType.Gotcha, basePath };
      const result = await promoteMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.graphUpdated).toBe(true);

      const graph = JSON.parse(fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8'));
      expect(graph.nodes[0].type).toBe('gotcha');
    });

    it('should update index entry type', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-idx.md'), `---
type: learning
title: Index
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [{ id: 'learning-idx', type: 'learning', title: 'Index', tags: [], created: '2026-01-13T00:00:00.000Z', updated: '2026-01-13T00:00:00.000Z', scope: 'project', relativePath: 'permanent/learning-idx.md' }] }));

      const request: PromoteRequest = { id: 'learning-idx', targetType: MemoryType.Decision, basePath };
      const result = await promoteMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.indexUpdated).toBe(true);

      const index = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf8'));
      expect(index.memories[0].type).toBe('decision');
    });
  });

  describe('temporary to permanent promotion', () => {
    it('should move file from temporary to permanent when promoting', async () => {
      const temporaryDir = path.join(basePath, 'temporary');
      fs.mkdirSync(temporaryDir, { recursive: true });

      fs.writeFileSync(path.join(temporaryDir, 'thought-123.md'), `---
type: breadcrumb
title: Thought
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Thinking`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [{ id: 'thought-123', type: 'breadcrumb', title: 'Thought', tags: [], created: '2026-01-13T00:00:00.000Z', updated: '2026-01-13T00:00:00.000Z', scope: 'local', relativePath: 'temporary/thought-123.md' }] }));

      const request: PromoteRequest = { id: 'thought-123', targetType: MemoryType.Learning, basePath };
      const result = await promoteMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.fileMoved).toBe(true);
      expect(fs.existsSync(path.join(temporaryDir, 'thought-123.md'))).toBe(false);
      expect(fs.existsSync(path.join(basePath, 'permanent', 'thought-123.md'))).toBe(true);
    });

    it('should update index relativePath when moving to permanent', async () => {
      const temporaryDir = path.join(basePath, 'temporary');
      fs.mkdirSync(temporaryDir, { recursive: true });

      fs.writeFileSync(path.join(temporaryDir, 'thought-456.md'), `---
type: breadcrumb
title: Another Thought
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
More thinking`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [{ id: 'thought-456', type: 'breadcrumb', title: 'Another Thought', tags: [], created: '2026-01-13T00:00:00.000Z', updated: '2026-01-13T00:00:00.000Z', scope: 'local', relativePath: 'temporary/thought-456.md' }] }));

      const request: PromoteRequest = { id: 'thought-456', targetType: MemoryType.Gotcha, basePath };
      await promoteMemory(request);

      const index = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf8'));
      expect(index.memories[0].relativePath).toBe('permanent/thought-456.md');
    });
  });

  describe('no-op scenarios', () => {
    it('should return success when type is already correct', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-same.md'), `---
type: learning
title: Same
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: PromoteRequest = { id: 'learning-same', targetType: MemoryType.Learning, basePath };
      const result = await promoteMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.frontmatterUpdated).toBe(false);
      expect(result.changes.graphUpdated).toBe(false);
      expect(result.changes.indexUpdated).toBe(false);
    });
  });

  describe('error cases', () => {
    it('should error when memory not found', async () => {
      const request: PromoteRequest = { id: 'learning-missing', targetType: MemoryType.Gotcha, basePath };
      const result = await promoteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Memory not found');
    });

    it('should throw when frontmatter invalid', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-invalid.md'), 'Invalid content');

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: PromoteRequest = { id: 'learning-invalid', targetType: MemoryType.Gotcha, basePath };

      // parseMemoryFile throws when frontmatter delimiters are missing
      await expect(promoteMemory(request)).rejects.toThrow('Invalid memory file format');
    });

    it('should handle case when file exists in both locations (permanent takes precedence)', async () => {
      // Note: findMemoryFile checks permanent first, so if the same ID exists
      // in both locations, permanent is found first and no move is needed.
      // This test documents this behaviour rather than testing collision.
      const temporaryDir = path.join(basePath, 'temporary');
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(temporaryDir, { recursive: true });
      fs.mkdirSync(permanentDir, { recursive: true });

      // Source file in temporary (will be ignored since permanent exists)
      fs.writeFileSync(path.join(temporaryDir, 'thought-collision.md'), `---
type: breadcrumb
title: Collision Temp
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Temp`);

      // Same ID in permanent takes precedence
      fs.writeFileSync(path.join(permanentDir, 'thought-collision.md'), `---
type: breadcrumb
title: Already Exists
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Already exists`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: PromoteRequest = { id: 'thought-collision', targetType: MemoryType.Learning, basePath };
      const result = await promoteMemory(request);

      // Permanent file is found first, type is updated in place, no move needed
      expect(result.status).toBe('success');
      expect(result.changes.fileMoved).toBe(false);
      expect(result.changes.frontmatterUpdated).toBe(true);
    });
  });
});

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
