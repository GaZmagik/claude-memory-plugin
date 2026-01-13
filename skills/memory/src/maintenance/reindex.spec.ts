/**
 * Tests for reindex.ts - Re-add orphan files to index and graph
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { reindexMemory } from './reindex.js';
import type { ReindexRequest } from './reindex.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('reindexMemory', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reindex-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(basePath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('file not found', () => {
    it('should return error when file does not exist', async () => {
      const request: ReindexRequest = {
        id: 'learning-nonexistent',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('error');
      expect(result.id).toBe('learning-nonexistent');
      expect(result.error).toContain('File not found');
      expect(result.actions.addedToIndex).toBe(false);
      expect(result.actions.addedToGraph).toBe(false);
    });

    it('should check both permanent and temporary directories', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      const temporaryDir = path.join(basePath, 'temporary');
      fs.mkdirSync(permanentDir, { recursive: true });
      fs.mkdirSync(temporaryDir, { recursive: true });

      const request: ReindexRequest = {
        id: 'learning-test',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('checked permanent/ and temporary/');
    });
  });

  describe('reindex from permanent directory', () => {
    it('should add orphan file to index and graph', async () => {
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
tags: [test, reindex]
scope: project
---
Test content`
      );

      // Initialize empty graph and index
      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [], edges: [] })
      );
      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: ReindexRequest = {
        id: 'learning-test',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('success');
      expect(result.id).toBe('learning-test');
      expect(result.filePath).toBe(testFile);
      expect(result.actions.addedToIndex).toBe(true);
      expect(result.actions.addedToGraph).toBe(true);

      // Verify graph
      const graphContent = fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8');
      const graph = JSON.parse(graphContent);
      expect(graph.nodes).toContainEqual({ id: 'learning-test', type: 'learning' });

      // Verify index
      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      const entry = index.memories.find((m: any) => m.id === 'learning-test');
      expect(entry).toBeDefined();
      expect(entry.title).toBe('Test Learning');
      expect(entry.type).toBe('learning');
      expect(entry.relativePath).toBe('permanent/learning-test.md');
    });

    it('should preserve severity field when reindexing', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'gotcha-critical.md'),
        `---
type: gotcha
title: Critical Gotcha
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: [critical]
scope: project
severity: high
---
Critical issue`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [], edges: [] })
      );
      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: ReindexRequest = {
        id: 'gotcha-critical',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('success');

      // Verify severity in index
      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      const entry = index.memories.find((m: any) => m.id === 'gotcha-critical');
      expect(entry.severity).toBe('high');
    });
  });

  describe('reindex from temporary directory', () => {
    it('should add temporary file to index with correct path', async () => {
      const temporaryDir = path.join(basePath, 'temporary');
      fs.mkdirSync(temporaryDir, { recursive: true });

      const testFile = path.join(temporaryDir, 'thought-20260113-120000.md');
      fs.writeFileSync(
        testFile,
        `---
type: breadcrumb
title: Temporary Thought
created: 2026-01-13T12:00:00.000Z
updated: 2026-01-13T12:00:00.000Z
tags: []
scope: local
---
Thinking...`
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [], edges: [] })
      );
      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: ReindexRequest = {
        id: 'thought-20260113-120000',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('success');
      expect(result.filePath).toBe(testFile);

      // Verify index has temporary path
      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      const entry = index.memories.find((m: any) => m.id === 'thought-20260113-120000');
      expect(entry.relativePath).toBe('temporary/thought-20260113-120000.md');
    });
  });

  describe('already indexed', () => {
    it('should not duplicate when file already in index', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

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

      // Already in index
      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-existing',
              type: 'learning',
              title: 'Existing',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-existing.md',
            },
          ],
        })
      );

      // Already in graph
      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [{ id: 'learning-existing', type: 'learning' }],
          edges: [],
        })
      );

      const request: ReindexRequest = {
        id: 'learning-existing',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('success');
      expect(result.actions.addedToIndex).toBe(false);
      expect(result.actions.addedToGraph).toBe(false);

      // Verify no duplication
      const indexContent = fs.readFileSync(path.join(basePath, 'index.json'), 'utf8');
      const index = JSON.parse(indexContent);
      expect(index.memories).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should return error when file cannot be read', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      const testFile = path.join(permanentDir, 'learning-unreadable.md');
      fs.writeFileSync(testFile, 'content');
      fs.chmodSync(testFile, 0o000); // Make unreadable

      const request: ReindexRequest = {
        id: 'learning-unreadable',
        basePath,
      };

      const result = await reindexMemory(request);

      // Restore permissions for cleanup
      fs.chmodSync(testFile, 0o644);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to read file');
    });

    it('should throw when frontmatter is invalid', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-invalid.md'),
        'Invalid content without frontmatter'
      );

      const request: ReindexRequest = {
        id: 'learning-invalid',
        basePath,
      };

      // parseMemoryFile throws when frontmatter delimiters are missing
      await expect(reindexMemory(request)).rejects.toThrow('Invalid memory file format');
    });
  });

  describe('partial reindex scenarios', () => {
    it('should add to index when only missing from index', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-partial.md'),
        `---
type: learning
title: Partial
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      // In graph but not index
      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({
          version: 1,
          nodes: [{ id: 'learning-partial', type: 'learning' }],
          edges: [],
        })
      );

      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: ReindexRequest = {
        id: 'learning-partial',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('success');
      expect(result.actions.addedToIndex).toBe(true);
      expect(result.actions.addedToGraph).toBe(false);
    });

    it('should add to graph when only missing from graph', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(
        path.join(permanentDir, 'learning-partial2.md'),
        `---
type: learning
title: Partial 2
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`
      );

      // In index but not graph
      fs.writeFileSync(
        path.join(basePath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-partial2',
              type: 'learning',
              title: 'Partial 2',
              tags: [],
              created: '2026-01-13T00:00:00.000Z',
              updated: '2026-01-13T00:00:00.000Z',
              scope: 'project',
              relativePath: 'permanent/learning-partial2.md',
            },
          ],
        })
      );

      fs.writeFileSync(
        path.join(basePath, 'graph.json'),
        JSON.stringify({ version: 1, nodes: [], edges: [] })
      );

      const request: ReindexRequest = {
        id: 'learning-partial2',
        basePath,
      };

      const result = await reindexMemory(request);

      expect(result.status).toBe('success');
      expect(result.actions.addedToIndex).toBe(false);
      expect(result.actions.addedToGraph).toBe(true);
    });
  });
});
