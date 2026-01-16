/**
 * Mock-based tests for refresh-frontmatter.ts edge cases
 *
 * Covers:
 * - detectProjectName() auto-detection (git remote, directory fallback)
 * - Migration helpers when JSON doesn't contain old ID
 * - Migration helpers catch blocks
 * - Embeddings cache with missing memories property
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as childProcess from 'node:child_process';
import { refreshFrontmatter } from './refresh-frontmatter.js';

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
