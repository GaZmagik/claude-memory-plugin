/**
 * Tests for sync-frontmatter.ts - Bulk sync frontmatter from graph
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { syncFrontmatter } from './sync-frontmatter.js';
import type { SyncFrontmatterRequest } from './sync-frontmatter.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('syncFrontmatter', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-fm-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(basePath, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('sync links from graph', () => {
    it('should update frontmatter links from graph edges', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-a.md'), `---
type: learning
title: A
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [
          { id: 'learning-a', type: 'learning' },
          { id: 'learning-b', type: 'learning' },
          { id: 'learning-c', type: 'learning' },
        ],
        edges: [
          { source: 'learning-a', target: 'learning-b', type: 'relates_to' },
          { source: 'learning-a', target: 'learning-c', type: 'relates_to' },
        ],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('success');
      expect(result.updated).toBe(1);
      expect(result.updatedIds).toContain('learning-a');

      const content = fs.readFileSync(path.join(permanentDir, 'learning-a.md'), 'utf8');
      expect(content).toContain('links:');
      expect(content).toContain('learning-b');
      expect(content).toContain('learning-c');
    });

    it('should remove outdated links', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-x.md'), `---
type: learning
title: X
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
links:
  - learning-y
  - learning-z
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [
          { id: 'learning-x', type: 'learning' },
          { id: 'learning-y', type: 'learning' },
        ],
        edges: [
          { source: 'learning-x', target: 'learning-y', type: 'relates_to' },
        ],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('success');
      expect(result.updated).toBe(1);

      const content = fs.readFileSync(path.join(permanentDir, 'learning-x.md'), 'utf8');
      expect(content).toContain('learning-y');
      expect(content).not.toContain('learning-z');
    });

    it('should skip files where links already match', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-m.md'), `---
type: learning
title: M
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
links:
  - learning-n
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [
          { id: 'learning-m', type: 'learning' },
          { id: 'learning-n', type: 'learning' },
        ],
        edges: [
          { source: 'learning-m', target: 'learning-n', type: 'relates_to' },
        ],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('success');
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should remove links field when no edges exist', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-isolated.md'), `---
type: learning
title: Isolated
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
links:
  - learning-removed
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [{ id: 'learning-isolated', type: 'learning' }],
        edges: [],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false };
      await syncFrontmatter(request);

      const content = fs.readFileSync(path.join(permanentDir, 'learning-isolated.md'), 'utf8');
      expect(content).not.toContain('links:');
    });
  });

  describe('selective sync', () => {
    it('should sync only specified IDs', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-1.md'), `---
type: learning
title: One
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(permanentDir, 'learning-2.md'), `---
type: learning
title: Two
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [
          { id: 'learning-1', type: 'learning' },
          { id: 'learning-2', type: 'learning' },
        ],
        edges: [
          { source: 'learning-1', target: 'learning-2', type: 'relates_to' },
          { source: 'learning-2', target: 'learning-1', type: 'relates_to' },
        ],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false, ids: ['learning-1'] };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('success');
      expect(result.updated).toBe(1);
      expect(result.updatedIds).toEqual(['learning-1']);
      expect(result.updatedIds).not.toContain('learning-2');
    });
  });

  describe('dry run mode', () => {
    it('should report changes without applying them', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-dry.md'), `---
type: learning
title: Dry
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content`);

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [
          { id: 'learning-dry', type: 'learning' },
          { id: 'learning-target', type: 'learning' },
        ],
        edges: [
          { source: 'learning-dry', target: 'learning-target', type: 'relates_to' },
        ],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: true };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('success');
      expect(result.wouldUpdate).toContain('learning-dry');
      expect(result.updated).toBe(0);

      const content = fs.readFileSync(path.join(permanentDir, 'learning-dry.md'), 'utf8');
      expect(content).not.toContain('links:');
    });
  });

  describe('error handling', () => {
    it('should handle missing files gracefully', async () => {
      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [{ id: 'learning-missing', type: 'learning' }],
        edges: [],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('success');
      expect(result.updated).toBe(0);
    });

    it('should report errors for invalid frontmatter', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      fs.writeFileSync(path.join(permanentDir, 'learning-bad.md'), 'Invalid content');

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: [{ id: 'learning-bad', type: 'learning' }],
        edges: [],
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('error');
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('batch operations', () => {
    it('should sync multiple files in one operation', async () => {
      const permanentDir = path.join(basePath, 'permanent');
      fs.mkdirSync(permanentDir, { recursive: true });

      for (let i = 1; i <= 5; i++) {
        fs.writeFileSync(path.join(permanentDir, `learning-${i}.md`), `---
type: learning
title: Learning ${i}
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
Content ${i}`);
      }

      const edges = [];
      for (let i = 1; i < 5; i++) {
        edges.push({ source: `learning-${i}`, target: `learning-${i + 1}`, type: 'relates_to' });
      }

      fs.writeFileSync(path.join(basePath, 'graph.json'), JSON.stringify({
        version: 1,
        nodes: Array.from({ length: 5 }, (_, i) => ({ id: `learning-${i + 1}`, type: 'learning' })),
        edges,
      }));

      const request: SyncFrontmatterRequest = { basePath, dryRun: false };
      const result = await syncFrontmatter(request);

      expect(result.status).toBe('success');
      expect(result.updated).toBe(4); // learning-1 through learning-4 have outbound edges
      expect(result.skipped).toBe(1); // learning-5 has no outbound edges and no existing links
    });
  });
});
