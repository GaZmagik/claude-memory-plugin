/**
 * Tests for archive.ts - Archive memories
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { archiveMemory } from './archive.js';
import type { ArchiveRequest } from './archive.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('archiveMemory', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(basePath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic archival', () => {
    it('should move file to archive directory', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      const sourceFile = path.join(permanentDir, 'learning-old.md');
      fs.writeFileSync(sourceFile, `---
type: learning
title: Old Learning
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [{ id: 'learning-old', type: 'learning' }], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [{ id: 'learning-old', type: 'learning', title: 'Old', tags: [], created: '2026-01-13T00:00:00.000Z', updated: '2026-01-13T00:00:00.000Z', scope: 'project', relativePath: 'permanent/learning-old.md' }] }));

      const request: ArchiveRequest = { id: 'learning-old', basePath };
      const result = await archiveMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.fileMoved).toBe(true);
      expect(fs.existsSync(sourceFile)).toBe(false);
      expect(fs.existsSync(path.join(basePath, 'archive', 'learning-old.md'))).toBe(true);
    });

    it('should create archive directory if it does not exist', async () => {
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

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: ArchiveRequest = { id: 'learning-test', basePath };
      await archiveMemory(request);

      expect(fs.existsSync(path.join(basePath, 'archive'))).toBe(true);
    });

    it('should archive temporary files', async () => {
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
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: ArchiveRequest = { id: 'thought-123', basePath };
      const result = await archiveMemory(request);

      expect(result.status).toBe('success');
      expect(fs.existsSync(path.join(basePath, 'archive', 'thought-123.md'))).toBe(true);
    });
  });

  describe('graph and index updates', () => {
    it('should remove from graph', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-remove.md'), `---
type: learning
title: Remove
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [{ id: 'learning-remove', type: 'learning' }, { id: 'learning-keep', type: 'learning' }], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: ArchiveRequest = { id: 'learning-remove', basePath };
      const result = await archiveMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.removedFromGraph).toBe(true);

      const graph = JSON.parse(fs.readFileSync(path.join(basePath, 'graph.json'), 'utf8'));
      expect(graph.nodes.find((n: any) => n.id === 'learning-remove')).toBeUndefined();
      expect(graph.nodes.find((n: any) => n.id === 'learning-keep')).toBeDefined();
    });

    it('should remove from index', async () => {
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

      const request: ArchiveRequest = { id: 'learning-idx', basePath };
      const result = await archiveMemory(request);

      expect(result.status).toBe('success');
      expect(result.changes.removedFromIndex).toBe(true);
    });
  });

  describe('error cases', () => {
    it('should error when memory not found', async () => {
      const request: ArchiveRequest = { id: 'learning-missing', basePath };
      const result = await archiveMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Memory not found');
    });

    it('should error when already archived', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      const archiveDir = path.join(basePath, 'archive');
      fs.mkdirSync(permanentDir, { recursive: true });
      fs.mkdirSync(archiveDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-dup.md'), `---
type: learning
title: Duplicate
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(archiveDir, 'learning-dup.md'), 'Already archived');

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
      fs.writeFileSync(path.join(basePath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      const request: ArchiveRequest = { id: 'learning-dup', basePath };
      const result = await archiveMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Memory already archived');
    });
  });
});
