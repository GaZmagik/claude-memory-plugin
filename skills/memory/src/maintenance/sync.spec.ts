/**
 * Tests for sync.ts - Reconcile graph, index, and disk
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncMemories } from './sync.js';
import type { SyncRequest } from './sync.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('syncMemories', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    // Create a real temporary directory for integration testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(basePath, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('empty state', () => {
    it('should return empty summary when no files exist', async () => {
      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.summary.filesOnDisk).toBe(0);
      expect(result.changes.addedToGraph).toEqual([]);
      expect(result.changes.addedToIndex).toEqual([]);
      expect(result.changes.removedGhostNodes).toEqual([]);
      expect(result.changes.removedOrphanEdges).toBe(0);
      expect(result.changes.removedFromIndex).toEqual([]);
    });

    it('should create graph and index if they dont exist', async () => {
      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      await syncMemories(request);

      // Should create empty structures
      expect(fs.existsSync(path.join(basePath, 'graph.json'))).toBe(true);
      expect(fs.existsSync(path.join(basePath, 'index.json'))).toBe(true);
    });
  });

  describe('adding missing files to graph and index', () => {
    it('should add orphan file to graph', async () => {
      // Create a memory file without adding to graph
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      const testFile = path.join(permanentDir, 'learning-test.md');
      fs.writeFileSync(
        testFile,
        `---
type: learning
title: Test Learning
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: [test]
---
Content here`
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.summary.filesOnDisk).toBe(1);
      expect(result.changes.addedToGraph).toContain('learning-test');
      expect(result.changes.addedToIndex).toContain('learning-test');

      // Verify graph was updated
      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.nodes).toContainEqual({ id: 'learning-test', type: 'learning' });
    });

    it('should add multiple orphan files', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      // Create multiple files
      for (let i = 1; i <= 3; i++) {
        fs.writeFileSync(
          path.join(permanentDir, `learning-test-${i}.md`),
          `---
type: learning
title: Test ${i}
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content ${i}`
        );
      }

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.summary.filesOnDisk).toBe(3);
      expect(result.changes.addedToGraph).toHaveLength(3);
      expect(result.changes.addedToIndex).toHaveLength(3);
    });

    it('should handle files in temporary directory', async () => {
      const temporaryDir = path.join(basePath, 'temporary');
      fs.mkdirSync(temporaryDir, { recursive: true });

      fs.writeFileSync(
        path.join(temporaryDir, 'thought-20260113-120000.md'),
        `---
type: breadcrumb
title: Temporary Thought
created: 2026-01-13T12:00:00.000Z
updated: 2026-01-13T12:00:00.000Z
tags: []
---
Thinking...`
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.summary.filesOnDisk).toBe(1);
      expect(result.changes.addedToGraph).toContain('thought-20260113-120000');

      // Check index has correct relativePath
      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      const entry = index.memories.find((m: any) => m.id === 'thought-20260113-120000');
      expect(entry?.relativePath).toBe('temporary/thought-20260113-120000.md');
    });
  });

  describe('removing ghost nodes', () => {
    it('should remove graph nodes without corresponding files', async () => {
      // Create graph with ghost node
      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-exists', type: 'learning' },
            { id: 'learning-ghost', type: 'learning' },
          ],
          edges: [],
        })
      );

      // Only create file for 'learning-exists'
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });
      fs.writeFileSync(
        path.join(permanentDir, 'learning-exists.md'),
        `---
type: learning
title: Exists
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.changes.removedGhostNodes).toContain('learning-ghost');
      expect(result.changes.removedGhostNodes).not.toContain('learning-exists');

      // Verify graph was updated
      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].id).toBe('learning-exists');
    });
  });

  describe('removing orphan edges', () => {
    it('should remove edges pointing to non-existent nodes', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      // Create one file
      fs.writeFileSync(
        path.join(permanentDir, 'learning-a.md'),
        `---
type: learning
title: A
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      // Create graph with orphan edge
      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-a', type: 'learning' },
            { id: 'learning-b', type: 'learning' }, // No file exists
          ],
          edges: [
            { source: 'learning-a', target: 'learning-b', type: 'relates_to' }, // Orphan
          ],
        })
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      // Note: removeNode() already removes associated edges, so orphan edge count is 0
      // The edge is still removed, just as part of ghost node removal
      expect(result.changes.removedOrphanEdges).toBe(0);
      expect(result.changes.removedGhostNodes).toContain('learning-b');

      // Verify edge was removed (by removeNode, not orphan edge removal)
      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.edges).toHaveLength(0);
    });

    it('should preserve valid edges', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      // Create both files
      fs.writeFileSync(
        path.join(permanentDir, 'learning-a.md'),
        `---
type: learning
title: A
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(permanentDir, 'learning-b.md'),
        `---
type: learning
title: B
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      // Create graph with valid edge
      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-a', type: 'learning' },
            { id: 'learning-b', type: 'learning' },
          ],
          edges: [
            { source: 'learning-a', target: 'learning-b', type: 'relates_to' },
          ],
        })
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.changes.removedOrphanEdges).toBe(0);

      // Verify edge was preserved
      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.edges).toHaveLength(1);
    });
  });

  describe('removing orphan index entries', () => {
    it('should remove index entries without corresponding files', async () => {
      // Create index with orphan entry
      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: '2026-01-13T00:00:00.000Z',
          memories: [
            {
              id: 'learning-exists',
              type: 'learning',
              title: 'Exists',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-exists.md',
            },
            {
              id: 'learning-ghost',
              type: 'learning',
              title: 'Ghost',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-ghost.md',
            },
          ],
        })
      );

      // Only create file for 'learning-exists'
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });
      fs.writeFileSync(
        path.join(permanentDir, 'learning-exists.md'),
        `---
type: learning
title: Exists
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.changes.removedFromIndex).toContain('learning-ghost');

      // Verify index was updated
      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      expect(index.memories).toHaveLength(1);
      expect(index.memories[0].id).toBe('learning-exists');
    });
  });

  describe('dry run mode', () => {
    it('should report changes without applying them', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      // Create orphan file
      fs.writeFileSync(
        path.join(permanentDir, 'learning-test.md'),
        `---
type: learning
title: Test
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      const request: SyncRequest = {
        basePath,
        dryRun: true,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');
      expect(result.changes.addedToGraph).toContain('learning-test');

      // Verify no changes were applied
      expect(fs.existsSync(path.join(basePath, 'graph.json'))).toBe(false);
      expect(fs.existsSync(path.join(basePath, 'index.json'))).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle files with invalid frontmatter', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      // Create file with invalid frontmatter
      fs.writeFileSync(
        path.join(permanentDir, 'learning-invalid.md'),
        'Invalid frontmatter content'
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      // Should still complete but skip invalid file
      expect(result.status).toBe('success');
      expect(result.changes.addedToGraph).not.toContain('learning-invalid');
    });

    it('should handle corrupted graph gracefully', async () => {
      // Create corrupted graph
      fs.writeFileSync(path.join(basePath, 'graph.json'), 'invalid json');

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      // Should create new graph
      expect(result.status).toBe('success');
    });
  });

  describe('comprehensive sync scenario', () => {
    it('should handle all sync operations in one pass', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      // Create some files
      fs.writeFileSync(
        path.join(permanentDir, 'learning-new.md'),
        `---
type: learning
title: New
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      fs.writeFileSync(
        path.join(permanentDir, 'learning-exists.md'),
        `---
type: learning
title: Exists
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      // Create graph and index with issues
      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [
            { id: 'learning-exists', type: 'learning' },
            { id: 'learning-ghost', type: 'learning' },
          ],
          edges: [
            { source: 'learning-exists', target: 'learning-ghost', type: 'relates_to' },
          ],
        })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: '2026-01-13T00:00:00.000Z',
          memories: [
            {
              id: 'learning-exists',
              type: 'learning',
              title: 'Exists',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-exists.md',
            },
            {
              id: 'learning-orphan',
              type: 'learning',
              title: 'Orphan',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-orphan.md',
            },
          ],
        })
      );

      const request: SyncRequest = {
        basePath,
        dryRun: false,
      };

      const result = await syncMemories(request);

      expect(result.status).toBe('success');

      // New file added
      expect(result.changes.addedToGraph).toContain('learning-new');
      expect(result.changes.addedToIndex).toContain('learning-new');

      // Ghost node removed
      expect(result.changes.removedGhostNodes).toContain('learning-ghost');

      // Note: removeNode() already removes associated edges, so orphan edge count is 0
      // The edge is still removed, just as part of ghost node removal
      expect(result.changes.removedOrphanEdges).toBe(0);

      // Orphan index entry removed
      expect(result.changes.removedFromIndex).toContain('learning-orphan');

      // Verify final state
      expect(result.summary.filesOnDisk).toBe(2);
      expect(result.summary.nodesInGraph).toBe(2);
      expect(result.summary.entriesInIndex).toBe(2);
    });
  });
});
