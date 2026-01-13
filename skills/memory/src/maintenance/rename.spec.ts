/**
 * Tests for rename.ts - Rename memory ID and update all references
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renameMemory } from './rename.js';
import type { RenameRequest } from './rename.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('renameMemory', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rename-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(basePath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic rename', () => {
    it('should rename file on disk', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      const oldPath = path.join(permanentDir, 'learning-old.md');
      fs.writeFileSync(
        oldPath,
        `---
type: learning
title: Old Name
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [{ id: 'learning-old', type: 'learning' }], edges: [] })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-old',
              type: 'learning',
              title: 'Old Name',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-old.md',
            },
          ],
        })
      );

      const request: RenameRequest = {
        oldId: 'learning-old',
        newId: 'learning-new',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.fileRenamed).toBe(true);
      expect(result.newPath).toContain('learning-new.md');

      // Verify old file gone, new file exists
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(path.join(permanentDir, 'learning-new.md'))).toBe(true);
    });

    it('should update graph node ID', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-alpha.md'),
        `---
type: learning
title: Alpha
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-alpha', type: 'learning' },
            { id: 'learning-other', type: 'learning' },
          ],
          edges: [],
        })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-alpha',
              type: 'learning',
              title: 'Alpha',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-alpha.md',
            },
          ],
        })
      );

      const request: RenameRequest = {
        oldId: 'learning-alpha',
        newId: 'learning-beta',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.graphNodeUpdated).toBe(true);

      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.nodes.find((n: any) => n.id === 'learning-beta')).toBeDefined();
      expect(graph.nodes.find((n: any) => n.id === 'learning-alpha')).toBeUndefined();
    });

    it('should update index entry', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-foo.md'),
        `---
type: learning
title: Foo
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [{ id: 'learning-foo', type: 'learning' }], edges: [] })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-foo',
              type: 'learning',
              title: 'Foo',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-foo.md',
            },
          ],
        })
      );

      const request: RenameRequest = {
        oldId: 'learning-foo',
        newId: 'learning-bar',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.indexUpdated).toBe(true);

      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      expect(index.memories.find((m: any) => m.id === 'learning-bar')).toBeDefined();
      expect(index.memories.find((m: any) => m.id === 'learning-foo')).toBeUndefined();
    });
  });

  describe('edge updates', () => {
    it('should update edges where memory is source', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-source.md'),
        `---
type: learning
title: Source
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-source', type: 'learning' },
            { id: 'learning-target', type: 'learning' },
          ],
          edges: [{ source: 'learning-source', target: 'learning-target', type: 'relates_to' }],
        })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-source',
              type: 'learning',
              title: 'Source',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-source.md',
            },
          ],
        })
      );

      const request: RenameRequest = {
        oldId: 'learning-source',
        newId: 'learning-source-renamed',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.edgesUpdated).toBe(1);

      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.edges[0].source).toBe('learning-source-renamed');
      expect(graph.edges[0].target).toBe('learning-target');
    });

    it('should update edges where memory is target', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-target.md'),
        `---
type: learning
title: Target
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-source', type: 'learning' },
            { id: 'learning-target', type: 'learning' },
          ],
          edges: [{ source: 'learning-source', target: 'learning-target', type: 'relates_to' }],
        })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-target',
              type: 'learning',
              title: 'Target',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-target.md',
            },
          ],
        })
      );

      const request: RenameRequest = {
        oldId: 'learning-target',
        newId: 'learning-target-renamed',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.edgesUpdated).toBe(1);

      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.edges[0].source).toBe('learning-source');
      expect(graph.edges[0].target).toBe('learning-target-renamed');
    });

    it('should update multiple edges', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-hub.md'),
        `---
type: learning
title: Hub
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-hub', type: 'learning' },
            { id: 'learning-a', type: 'learning' },
            { id: 'learning-b', type: 'learning' },
          ],
          edges: [
            { source: 'learning-hub', target: 'learning-a', type: 'relates_to' },
            { source: 'learning-b', target: 'learning-hub', type: 'relates_to' },
          ],
        })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-hub',
              type: 'learning',
              title: 'Hub',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-hub.md',
            },
          ],
        })
      );

      const request: RenameRequest = {
        oldId: 'learning-hub',
        newId: 'learning-center',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.edgesUpdated).toBe(2);
    });
  });

  describe('error cases', () => {
    it('should return error when source memory not found', async () => {
      const request: RenameRequest = {
        oldId: 'learning-nonexistent',
        newId: 'learning-new',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Memory not found');
    });

    it('should return error when target already exists', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-old.md'),
        `---
type: learning
title: Old
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(permanentDir, 'learning-existing.md'),
        `---
type: learning
title: Existing
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [], edges: [] })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: RenameRequest = {
        oldId: 'learning-old',
        newId: 'learning-existing',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Target already exists');
    });

    it('should return error when frontmatter parse fails', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      // File exists but has no valid frontmatter delimiters
      fs.writeFileSync(path.join(permanentDir, 'learning-invalid.md'), 'Invalid content without frontmatter');

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [], edges: [] })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: RenameRequest = {
        oldId: 'learning-invalid',
        newId: 'learning-valid',
        basePath,
      };

      // parseMemoryFile throws when frontmatter is missing - the function doesn't catch this
      await expect(renameMemory(request)).rejects.toThrow('Invalid memory file format');
    });
  });

  describe('temporary files', () => {
    it('should rename temporary files correctly', async () => {
      const temporaryDir = path.join(basePath, 'temporary');
      fs.mkdirSync(temporaryDir, { recursive: true });

      const oldPath = path.join(temporaryDir, 'thought-123.md');
      fs.writeFileSync(
        oldPath,
        `---
type: breadcrumb
title: Thought
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [{ id: 'thought-123', type: 'breadcrumb' }], edges: [] })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'thought-123',
              type: 'breadcrumb',
              title: 'Thought',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'local',
              relativePath: 'temporary/thought-123.md',
            },
          ],
        })
      );

      const request: RenameRequest = {
        oldId: 'thought-123',
        newId: 'thought-456',
        basePath,
      };

      const result = await renameMemory(request);

      expect(result.status).toBe('success');
      expect(result.newPath).toContain('temporary/thought-456.md');

      // Verify index updated
      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      const entry = index.memories.find((m: any) => m.id === 'thought-456');
      expect(entry.relativePath).toBe('temporary/thought-456.md');
    });
  });
});
