/**
 * Tests for Prune - Remove expired temporary memories
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pruneMemories } from './prune.js';

describe('maintenance/prune', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-test-'));
    fs.mkdirSync(path.join(tempDir, 'temporary'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'permanent'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('pruneMemories', () => {
    it('returns empty result when no temporary memories exist', async () => {
      const result = await pruneMemories({ basePath: tempDir });
      expect(result.status).toBe('success');
      expect(result.removed).toBe(0);
      expect(result.removedIds).toEqual([]);
    });

    it('identifies thought- prefixed documents as think documents', async () => {
      // Create an old concluded thought document
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const content = `---
id: thought-20260101-120000
title: "Test thought document"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
status: concluded
tags: []
---

# Test thought
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'thought-20260101-120000.md'), content);

      const result = await pruneMemories({ basePath: tempDir, dryRun: true });
      expect(result.wouldRemove).toContain('thought-20260101-120000');
    });

    it('identifies legacy think- prefixed documents as think documents', async () => {
      // Create an old concluded think document (legacy)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      const content = `---
id: think-20260101-120000
title: "Test think document"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
status: concluded
tags: []
---

# Test think
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'think-20260101-120000.md'), content);

      const result = await pruneMemories({ basePath: tempDir, dryRun: true });
      expect(result.wouldRemove).toContain('think-20260101-120000');
    });

    it('applies shorter TTL to concluded thought documents', async () => {
      // Create a 2-day old concluded thought document
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2);

      const content = `---
id: thought-20260110-120000
title: "Concluded thought"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
status: concluded
tags: []
---

# Concluded
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'thought-20260110-120000.md'), content);

      // With default concludedTtlDays=1, this should be pruned
      const result = await pruneMemories({ basePath: tempDir, dryRun: true, concludedTtlDays: 1 });
      expect(result.wouldRemove).toContain('thought-20260110-120000');
    });

    it('returns success when temporary directory does not exist', async () => {
      // Remove temporary directory
      fs.rmSync(path.join(tempDir, 'temporary'), { recursive: true });

      const result = await pruneMemories({ basePath: tempDir });
      expect(result.status).toBe('success');
      expect(result.removed).toBe(0);
      expect(result.removedIds).toEqual([]);
    });

    it('skips files without frontmatter', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      // Create file without frontmatter
      fs.writeFileSync(
        path.join(tempDir, 'temporary', 'no-frontmatter.md'),
        '# Just content\n\nNo YAML frontmatter here.'
      );

      // Create valid expired file to ensure prune works
      const content = `---
id: valid-expired
title: "Valid expired"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'valid-expired.md'), content);

      const result = await pruneMemories({ basePath: tempDir, dryRun: true });
      // Should skip no-frontmatter, but find valid-expired
      expect(result.wouldRemove).toContain('valid-expired');
      expect(result.wouldRemove).not.toContain('no-frontmatter');
    });

    it('skips files without created or updated date', async () => {
      // Create file with frontmatter but no dates
      const content = `---
id: no-dates
title: "No dates"
type: breadcrumb
scope: project
tags: []
---

# Content
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'no-dates.md'), content);

      const result = await pruneMemories({ basePath: tempDir, dryRun: true });
      // Should skip file without dates
      expect(result.wouldRemove ?? []).not.toContain('no-dates');
    });

    it('actually deletes expired memories in non-dry-run mode', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const content = `---
id: to-delete
title: "To delete"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content
`;
      const filePath = path.join(tempDir, 'temporary', 'to-delete.md');
      fs.writeFileSync(filePath, content);

      // Create index.json so deleteMemory can find the file
      const indexPath = path.join(tempDir, 'index.json');
      fs.writeFileSync(indexPath, JSON.stringify({
        version: '1.0',
        memories: [{
          id: 'to-delete',
          relativePath: 'temporary/to-delete.md',
          type: 'breadcrumb',
          title: 'To delete',
          created: oldDate.toISOString(),
          updated: oldDate.toISOString(),
        }],
      }));

      // Verify file exists
      expect(fs.existsSync(filePath)).toBe(true);

      const result = await pruneMemories({ basePath: tempDir, dryRun: false });
      expect(result.status).toBe('success');
      expect(result.removed).toBe(1);
      expect(result.removedIds).toContain('to-delete');

      // Verify file is deleted
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('handles multiple expired memories', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const memories: Array<{ id: string; relativePath: string; type: string; title: string; created: string; updated: string }> = [];

      // Create multiple expired files
      for (let i = 1; i <= 3; i++) {
        const content = `---
id: expired-${i}
title: "Expired ${i}"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content ${i}
`;
        fs.writeFileSync(path.join(tempDir, 'temporary', `expired-${i}.md`), content);
        memories.push({
          id: `expired-${i}`,
          relativePath: `temporary/expired-${i}.md`,
          type: 'breadcrumb',
          title: `Expired ${i}`,
          created: oldDate.toISOString(),
          updated: oldDate.toISOString(),
        });
      }

      // Create index.json
      fs.writeFileSync(path.join(tempDir, 'index.json'), JSON.stringify({ version: '1.0', memories }));

      const result = await pruneMemories({ basePath: tempDir, dryRun: false });
      expect(result.status).toBe('success');
      expect(result.removed).toBe(3);
      expect(result.removedIds).toHaveLength(3);
    });

    it('does not prune non-expired memories', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2); // 2 days ago (within 7 day TTL)

      const content = `---
id: recent-memory
title: "Recent memory"
type: breadcrumb
scope: project
created: "${recentDate.toISOString()}"
updated: "${recentDate.toISOString()}"
tags: []
---

# Content
`;
      const filePath = path.join(tempDir, 'temporary', 'recent-memory.md');
      fs.writeFileSync(filePath, content);

      const result = await pruneMemories({ basePath: tempDir, dryRun: false });
      expect(result.status).toBe('success');
      expect(result.removed).toBe(0);

      // File should still exist
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('uses updated date over created date when both exist', async () => {
      const oldCreated = new Date();
      oldCreated.setDate(oldCreated.getDate() - 10); // 10 days ago

      const recentUpdated = new Date();
      recentUpdated.setDate(recentUpdated.getDate() - 2); // 2 days ago

      const content = `---
id: updated-recently
title: "Updated recently"
type: breadcrumb
scope: project
created: "${oldCreated.toISOString()}"
updated: "${recentUpdated.toISOString()}"
tags: []
---

# Content
`;
      const filePath = path.join(tempDir, 'temporary', 'updated-recently.md');
      fs.writeFileSync(filePath, content);

      const result = await pruneMemories({ basePath: tempDir, dryRun: true, ttlDays: 7 });
      // Should NOT be pruned because updated date is recent
      expect(result.wouldRemove ?? []).not.toContain('updated-recently');
    });

    it('respects custom ttlDays parameter', async () => {
      const date = new Date();
      date.setDate(date.getDate() - 3); // 3 days ago

      const content = `---
id: custom-ttl-test
title: "Custom TTL test"
type: breadcrumb
scope: project
created: "${date.toISOString()}"
updated: "${date.toISOString()}"
tags: []
---

# Content
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'custom-ttl-test.md'), content);

      // With ttlDays=7 (default), should NOT be pruned
      let result = await pruneMemories({ basePath: tempDir, dryRun: true, ttlDays: 7 });
      expect(result.wouldRemove ?? []).not.toContain('custom-ttl-test');

      // With ttlDays=2, SHOULD be pruned
      result = await pruneMemories({ basePath: tempDir, dryRun: true, ttlDays: 2 });
      expect(result.wouldRemove).toContain('custom-ttl-test');
    });

    it('handles file read errors gracefully', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      // Create a directory with .md extension (will cause read error)
      const badPath = path.join(tempDir, 'temporary', 'actually-a-dir.md');
      fs.mkdirSync(badPath);

      // Also create a valid file to ensure processing continues
      const content = `---
id: valid-file
title: "Valid file"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'valid-file.md'), content);

      const result = await pruneMemories({ basePath: tempDir, dryRun: true });
      // Should have an error for the directory, but still process valid file
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.wouldRemove).toContain('valid-file');
    });

    it('returns error status when errors occur', async () => {
      // Create a directory with .md extension to cause error
      const badPath = path.join(tempDir, 'temporary', 'bad-file.md');
      fs.mkdirSync(badPath);

      const result = await pruneMemories({ basePath: tempDir, dryRun: true });
      expect(result.status).toBe('error');
      expect(result.errors).toBeDefined();
    });

    it('excludes wouldRemove from non-dry-run results', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const content = `---
id: test-no-would-remove
title: "Test"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'test-no-would-remove.md'), content);

      // Create index.json
      fs.writeFileSync(path.join(tempDir, 'index.json'), JSON.stringify({
        version: '1.0',
        memories: [{
          id: 'test-no-would-remove',
          relativePath: 'temporary/test-no-would-remove.md',
          type: 'breadcrumb',
          title: 'Test',
          created: oldDate.toISOString(),
          updated: oldDate.toISOString(),
        }],
      }));

      const result = await pruneMemories({ basePath: tempDir, dryRun: false });
      expect(result.wouldRemove).toBeUndefined();
      expect(result.removedIds).toContain('test-no-would-remove');
    });

    it('does not apply concluded TTL to non-concluded think documents', async () => {
      const date = new Date();
      date.setDate(date.getDate() - 2); // 2 days ago

      // Active (not concluded) thought document
      const content = `---
id: thought-20260110-active
title: "Active thought"
type: breadcrumb
scope: project
created: "${date.toISOString()}"
updated: "${date.toISOString()}"
status: active
tags: []
---

# Active
`;
      fs.writeFileSync(path.join(tempDir, 'temporary', 'thought-20260110-active.md'), content);

      // With concludedTtlDays=1, this should NOT be pruned because it's not concluded
      // It should use the default ttlDays=7
      const result = await pruneMemories({ basePath: tempDir, dryRun: true, concludedTtlDays: 1 });
      expect(result.wouldRemove ?? []).not.toContain('thought-20260110-active');
    });
  });
});
