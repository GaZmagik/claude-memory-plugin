/**
 * Tests for Refresh Frontmatter
 *
 * Validates backfilling of missing frontmatter fields and legacy data migration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});
