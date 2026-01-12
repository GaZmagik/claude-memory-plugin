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
  });
});
