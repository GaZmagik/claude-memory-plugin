/**
 * Tests for Refresh Frontmatter
 *
 * Validates backfilling of missing frontmatter fields and legacy data migration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { refreshFrontmatter } from './refresh-frontmatter.js';

describe('refreshFrontmatter', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-fm-test-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(path.join(memoryDir, 'permanent'), { recursive: true });
    fs.mkdirSync(path.join(memoryDir, 'temporary'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('id field backfill', () => {
    it('should add id field when missing', async () => {
      // Create memory file without id
      const filePath = path.join(memoryDir, 'permanent', 'decision-test.md');
      fs.writeFileSync(
        filePath,
        `---
title: Test Decision
type: permanent
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---

Test content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.status).toBe('success');
      expect(result.updated).toBe(1);
      expect(result.updatedIds).toContain('decision-test');

      // Verify file was updated
      const updatedContent = fs.readFileSync(filePath, 'utf8');
      expect(updatedContent).toContain('id: decision-test');
    });

    it('should skip files where id already matches', async () => {
      const filePath = path.join(memoryDir, 'permanent', 'decision-existing.md');
      fs.writeFileSync(
        filePath,
        `---
id: decision-existing
title: Existing Decision
type: permanent
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
project: test-project
---

Test content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.status).toBe('success');
      expect(result.skipped).toBe(1);
      expect(result.updated).toBe(0);
    });
  });

  describe('project field backfill', () => {
    it('should add project field when missing', async () => {
      const filePath = path.join(memoryDir, 'permanent', 'learning-test.md');
      fs.writeFileSync(
        filePath,
        `---
id: learning-test
title: Test Learning
type: permanent
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---

Test content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'my-project',
      });

      expect(result.status).toBe('success');
      expect(result.updated).toBe(1);

      const updatedContent = fs.readFileSync(filePath, 'utf8');
      expect(updatedContent).toContain('project: my-project');
    });
  });

  describe('legacy embedding migration', () => {
    it('should migrate legacy embedding hash to embeddings.json', async () => {
      const filePath = path.join(memoryDir, 'permanent', 'gotcha-legacy.md');
      fs.writeFileSync(
        filePath,
        `---
title: Legacy Gotcha
type: permanent
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
embedding: "66d40e1f4be2886cd9a7335c40937bbe"
---

Test content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.status).toBe('success');
      expect(result.embeddingsMigrated).toBe(1);

      // Verify embedding was removed from frontmatter
      const updatedContent = fs.readFileSync(filePath, 'utf8');
      expect(updatedContent).not.toContain('embedding:');

      // Verify embeddings.json was created
      const embeddingsPath = path.join(memoryDir, 'embeddings.json');
      expect(fs.existsSync(embeddingsPath)).toBe(true);

      const embeddingsCache = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
      expect(embeddingsCache.memories['gotcha-legacy']).toBeDefined();
      expect(embeddingsCache.memories['gotcha-legacy'].hash).toBe('66d40e1f4be2886cd9a7335c40937bbe');
    });
  });

  describe('dry run mode', () => {
    it('should report changes without applying them', async () => {
      const filePath = path.join(memoryDir, 'permanent', 'decision-dryrun.md');
      const originalContent = `---
title: Dry Run Test
type: permanent
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---

Test content
`;
      fs.writeFileSync(filePath, originalContent);

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
        dryRun: true,
      });

      expect(result.status).toBe('success');
      expect(result.updated).toBe(0);
      expect(result.wouldUpdate).toContain('decision-dryrun');

      // Verify file was NOT modified
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toBe(originalContent);
    });
  });

  describe('selective refresh', () => {
    it('should only refresh specified IDs', async () => {
      // Create two files
      fs.writeFileSync(
        path.join(memoryDir, 'permanent', 'file-a.md'),
        `---
title: File A
type: permanent
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---
Content A
`
      );

      fs.writeFileSync(
        path.join(memoryDir, 'permanent', 'file-b.md'),
        `---
title: File B
type: permanent
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---
Content B
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
        ids: ['file-a'],
      });

      expect(result.status).toBe('success');
      expect(result.updated).toBe(1);
      expect(result.updatedIds).toContain('file-a');
      expect(result.updatedIds).not.toContain('file-b');

      // Verify only file-a was modified
      const contentA = fs.readFileSync(path.join(memoryDir, 'permanent', 'file-a.md'), 'utf8');
      const contentB = fs.readFileSync(path.join(memoryDir, 'permanent', 'file-b.md'), 'utf8');
      expect(contentA).toContain('id: file-a');
      expect(contentB).not.toContain('id:');
    });
  });

  describe('error handling', () => {
    it('should report errors for malformed files', async () => {
      const filePath = path.join(memoryDir, 'permanent', 'malformed.md');
      fs.writeFileSync(filePath, 'Not valid YAML frontmatter');

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('think→thought migration', () => {
    it('should rename think- prefixed files to thought-', async () => {
      // Create think- prefixed file in temporary directory
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260101-120000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Test Think Document
type: think
scope: local
created: 2026-01-01T12:00:00Z
updated: 2026-01-01T12:00:00Z
tags: [deliberation]
---

# Test Think Document

Some deliberation content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.thinkToThoughtMigrated).toBe(1);

      // Verify old file no longer exists
      expect(fs.existsSync(thinkFilePath)).toBe(false);

      // Verify new file exists with thought- prefix
      const thoughtFilePath = path.join(memoryDir, 'temporary', 'thought-20260101-120000.md');
      expect(fs.existsSync(thoughtFilePath)).toBe(true);

      // Verify content was preserved
      const content = fs.readFileSync(thoughtFilePath, 'utf8');
      expect(content).toContain('Test Think Document');
    });

    it('should update thought.json with new ID', async () => {
      // Create state file with old ID
      const statePath = path.join(memoryDir, 'thought.json');
      fs.writeFileSync(
        statePath,
        JSON.stringify({ currentDocumentId: 'think-20260101-120000' })
      );

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260101-120000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Test
type: think
scope: local
created: 2026-01-01T12:00:00Z
updated: 2026-01-01T12:00:00Z
tags: []
---
Content
`
      );

      await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      // Verify state was updated
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(state.currentDocumentId).toBe('thought-20260101-120000');
    });

    it('should update graph.json with new ID', async () => {
      // Create graph with old ID
      const graphPath = path.join(memoryDir, 'graph.json');
      fs.writeFileSync(
        graphPath,
        JSON.stringify({
          nodes: [{ id: 'think-20260101-120000', type: 'think' }],
          edges: [],
        })
      );

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260101-120000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Test
type: think
scope: local
created: 2026-01-01T12:00:00Z
updated: 2026-01-01T12:00:00Z
tags: []
---
Content
`
      );

      await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      // Verify graph was updated
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      expect(graph.nodes[0].id).toBe('thought-20260101-120000');
    });

    it('should update index.json with new ID and path', async () => {
      // Create index with old ID
      const indexPath = path.join(memoryDir, 'index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify({
          memories: [{
            id: 'think-20260101-120000',
            relativePath: 'temporary/think-20260101-120000.md',
          }],
        })
      );

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260101-120000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Test
type: think
scope: local
created: 2026-01-01T12:00:00Z
updated: 2026-01-01T12:00:00Z
tags: []
---
Content
`
      );

      await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      // Verify index was updated
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      expect(index.memories[0].id).toBe('thought-20260101-120000');
      expect(index.memories[0].relativePath).toBe('temporary/thought-20260101-120000.md');
    });
  });

  describe('title extraction', () => {
    it('should extract title from first markdown heading', async () => {
      const filePath = path.join(memoryDir, 'permanent', 'decision-notitle.md');
      fs.writeFileSync(
        filePath,
        `---
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---

# My Decision Title

Some decision content here
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.status).toBe('success');
      expect(result.updated).toBe(1);

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('title: My Decision Title');
    });
  });

  describe('graph type sync', () => {
    it('should sync types from frontmatter to graph nodes', async () => {
      // Create graph with wrong type
      const graphPath = path.join(memoryDir, 'graph.json');
      fs.writeFileSync(
        graphPath,
        JSON.stringify({
          nodes: [{ id: 'decision-sync', type: 'learning' }], // Wrong type
          edges: [],
        })
      );

      // Create memory file with correct type
      const filePath = path.join(memoryDir, 'permanent', 'decision-sync.md');
      fs.writeFileSync(
        filePath,
        `---
id: decision-sync
title: Sync Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
project: test-project
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.graphTypesUpdated).toBe(1);

      // Verify graph type was corrected
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      expect(graph.nodes[0].type).toBe('decision');
    });
  });

  describe('embeddings cache', () => {
    it('should handle missing embeddings.json gracefully', async () => {
      const filePath = path.join(memoryDir, 'permanent', 'test-cache.md');
      fs.writeFileSync(
        filePath,
        `---
title: Cache Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
embedding: "abc123"
---
Content
`
      );

      // No embeddings.json exists
      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.status).toBe('success');
      expect(result.embeddingsMigrated).toBe(1);

      // Should create embeddings.json
      const embeddingsPath = path.join(memoryDir, 'embeddings.json');
      expect(fs.existsSync(embeddingsPath)).toBe(true);
    });

    it('should handle malformed embeddings.json', async () => {
      // Create malformed cache
      const embeddingsPath = path.join(memoryDir, 'embeddings.json');
      fs.writeFileSync(embeddingsPath, 'not json');

      const filePath = path.join(memoryDir, 'permanent', 'test-malformed.md');
      fs.writeFileSync(
        filePath,
        `---
title: Malformed Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
embedding: "xyz789"
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      // Should still succeed with fresh cache
      expect(result.status).toBe('success');
      expect(result.embeddingsMigrated).toBe(1);
    });
  });
});

describe('refreshFrontmatter mocked edge cases', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-fm-mock-test-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(path.join(memoryDir, 'permanent'), { recursive: true });
    fs.mkdirSync(path.join(memoryDir, 'temporary'), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('detectProjectName auto-detection', () => {
    it('should detect project name from git remote URL', async () => {
      // Mock execFileSync to return a git remote URL
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue(
        'https://github.com/user/my-awesome-repo.git\n'
      );

      // Create a memory file without id/project
      const filePath = path.join(memoryDir, 'permanent', 'decision-autodetect.md');
      fs.writeFileSync(
        filePath,
        `---
title: Auto Detect Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---
Content
`
      );

      // Don't pass project - let it auto-detect
      const result = await refreshFrontmatter({
        basePath: memoryDir,
      });

      expect(result.status).toBe('success');
      expect(result.project).toBe('my-awesome-repo');

      // Verify project was written to file
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('project: my-awesome-repo');
    });

    it('should extract repo name from SSH git URL', async () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue(
        'git@github.com:org/project-name.git\n'
      );

      const filePath = path.join(memoryDir, 'permanent', 'decision-ssh.md');
      fs.writeFileSync(
        filePath,
        `---
title: SSH URL Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---
Content
`
      );

      const result = await refreshFrontmatter({ basePath: memoryDir });

      expect(result.project).toBe('project-name');
    });

    it('should fall back to directory name when git fails', async () => {
      // Mock execFileSync to throw (not a git repo)
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      const filePath = path.join(memoryDir, 'permanent', 'decision-fallback.md');
      fs.writeFileSync(
        filePath,
        `---
title: Fallback Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---
Content
`
      );

      const result = await refreshFrontmatter({ basePath: memoryDir });

      // Should fall back to directory name (testDir basename)
      expect(result.project).toBeDefined();
      expect(result.status).toBe('success');
    });

    it('should handle git remote returning empty URL', async () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('');

      const filePath = path.join(memoryDir, 'permanent', 'decision-empty.md');
      fs.writeFileSync(
        filePath,
        `---
title: Empty Remote Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
---
Content
`
      );

      const result = await refreshFrontmatter({ basePath: memoryDir });

      // Should fall back to directory name
      expect(result.project).toBeDefined();
      expect(result.status).toBe('success');
    });
  });

  describe('migration helpers edge cases', () => {
    it('should handle graph.json not containing the old ID', async () => {
      // Create graph that doesn't contain the think ID
      const graphPath = path.join(memoryDir, 'graph.json');
      fs.writeFileSync(
        graphPath,
        JSON.stringify({
          nodes: [{ id: 'other-node', type: 'decision' }],
          edges: [],
        })
      );

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260115-100000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Graph Edge Case
type: think
scope: local
created: 2026-01-15T10:00:00Z
updated: 2026-01-15T10:00:00Z
tags: []
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.thinkToThoughtMigrated).toBe(1);

      // Graph should remain unchanged (ID wasn't in it)
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      expect(graph.nodes[0].id).toBe('other-node');
    });

    it('should handle index.json not containing the old ID', async () => {
      // Create index that doesn't contain the think ID
      const indexPath = path.join(memoryDir, 'index.json');
      fs.writeFileSync(
        indexPath,
        JSON.stringify({
          memories: [{ id: 'other-memory', relativePath: 'permanent/other.md' }],
        })
      );

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260115-110000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Index Edge Case
type: think
scope: local
created: 2026-01-15T11:00:00Z
updated: 2026-01-15T11:00:00Z
tags: []
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.thinkToThoughtMigrated).toBe(1);

      // Index should remain unchanged
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      expect(index.memories[0].id).toBe('other-memory');
    });

    it('should handle thought.json with non-matching currentDocumentId', async () => {
      // Create state file with different ID
      const statePath = path.join(memoryDir, 'thought.json');
      fs.writeFileSync(
        statePath,
        JSON.stringify({ currentDocumentId: 'other-thought-id' })
      );

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260115-120000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: State Edge Case
type: think
scope: local
created: 2026-01-15T12:00:00Z
updated: 2026-01-15T12:00:00Z
tags: []
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.thinkToThoughtMigrated).toBe(1);

      // State should remain unchanged
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      expect(state.currentDocumentId).toBe('other-thought-id');
    });

    it('should handle malformed thought.json gracefully', async () => {
      // Create malformed state file
      const statePath = path.join(memoryDir, 'thought.json');
      fs.writeFileSync(statePath, 'not valid json');

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260115-130000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Malformed State
type: think
scope: local
created: 2026-01-15T13:00:00Z
updated: 2026-01-15T13:00:00Z
tags: []
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      // Should still succeed - error is ignored
      expect(result.thinkToThoughtMigrated).toBe(1);
    });

    it('should handle malformed graph.json gracefully', async () => {
      // Create malformed graph file
      const graphPath = path.join(memoryDir, 'graph.json');
      fs.writeFileSync(graphPath, '{ invalid json }');

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260115-140000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Malformed Graph
type: think
scope: local
created: 2026-01-15T14:00:00Z
updated: 2026-01-15T14:00:00Z
tags: []
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      // Should still succeed - error is ignored
      expect(result.thinkToThoughtMigrated).toBe(1);
    });

    it('should handle malformed index.json gracefully', async () => {
      // Create malformed index file
      const indexPath = path.join(memoryDir, 'index.json');
      fs.writeFileSync(indexPath, '{ broken: }');

      // Create think- prefixed file
      const thinkFilePath = path.join(memoryDir, 'temporary', 'think-20260115-150000.md');
      fs.writeFileSync(
        thinkFilePath,
        `---
title: Malformed Index
type: think
scope: local
created: 2026-01-15T15:00:00Z
updated: 2026-01-15T15:00:00Z
tags: []
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      // Should still succeed - error is ignored
      expect(result.thinkToThoughtMigrated).toBe(1);
    });
  });

  describe('embeddings cache edge cases', () => {
    it('should handle embeddings.json with missing memories property', async () => {
      // Create cache without memories property
      const embeddingsPath = path.join(memoryDir, 'embeddings.json');
      fs.writeFileSync(
        embeddingsPath,
        JSON.stringify({ version: 1 }) // No memories property
      );

      const filePath = path.join(memoryDir, 'permanent', 'decision-nomem.md');
      fs.writeFileSync(
        filePath,
        `---
title: No Memories Test
type: decision
scope: project
created: 2026-01-01T00:00:00Z
updated: 2026-01-01T00:00:00Z
tags: [test]
embedding: "hash123"
---
Content
`
      );

      const result = await refreshFrontmatter({
        basePath: memoryDir,
        project: 'test-project',
      });

      expect(result.status).toBe('success');
      expect(result.embeddingsMigrated).toBe(1);

      // Should have added memories property
      const cache = JSON.parse(fs.readFileSync(embeddingsPath, 'utf8'));
      expect(cache.memories).toBeDefined();
      expect(cache.memories['decision-nomem']).toBeDefined();
    });
  });
});

// Note: Lines 283-284 ("Failed to parse frontmatter") are unreachable code.
// parseMemoryFile() always throws rather than returning null frontmatter.
// The error gets caught by the outer try-catch at line 362 instead.
