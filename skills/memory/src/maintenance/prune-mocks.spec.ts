/**
 * Mock-based tests for prune.ts edge cases
 *
 * Tests the fallback deletion path when deleteMemory fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { pruneMemories } from './prune.js';
import * as deleteModule from '../core/delete.js';
import * as structureModule from '../graph/structure.js';

describe('prune fallback deletion path', () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-mock-test-'));
    fs.mkdirSync(path.join(tempDir, 'temporary'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'permanent'), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('falls back to direct file deletion when deleteMemory fails', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    const content = `---
id: fallback-delete
title: "Fallback delete test"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content
`;
    const filePath = path.join(tempDir, 'temporary', 'fallback-delete.md');
    fs.writeFileSync(filePath, content);

    // Create graph.json for the graph removal path
    fs.writeFileSync(
      path.join(tempDir, 'graph.json'),
      JSON.stringify({ version: 1, nodes: [{ id: 'fallback-delete', type: 'breadcrumb' }], edges: [] })
    );

    // Mock deleteMemory to throw
    vi.spyOn(deleteModule, 'deleteMemory').mockRejectedValue(new Error('deleteMemory failed'));

    // Mock graph functions to track calls
    const mockGraph = { version: 1, nodes: [], edges: [] };
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue(mockGraph);
    vi.spyOn(structureModule, 'removeNode').mockReturnValue(mockGraph);
    vi.spyOn(structureModule, 'saveGraph').mockResolvedValue();

    // Verify file exists before prune
    expect(fs.existsSync(filePath)).toBe(true);

    const result = await pruneMemories({ basePath: tempDir, dryRun: false });

    // Should succeed via fallback path
    expect(result.status).toBe('success');
    expect(result.removed).toBe(1);
    expect(result.removedIds).toContain('fallback-delete');

    // File should be deleted via fallback fs.unlinkSync
    expect(fs.existsSync(filePath)).toBe(false);

    // Graph functions should have been called
    expect(structureModule.loadGraph).toHaveBeenCalled();
    expect(structureModule.removeNode).toHaveBeenCalled();
    expect(structureModule.saveGraph).toHaveBeenCalled();
  });

  it('handles graph removal failure gracefully', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    const content = `---
id: graph-fail-test
title: "Graph fail test"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content
`;
    const filePath = path.join(tempDir, 'temporary', 'graph-fail-test.md');
    fs.writeFileSync(filePath, content);

    // Mock deleteMemory to throw
    vi.spyOn(deleteModule, 'deleteMemory').mockRejectedValue(new Error('deleteMemory failed'));

    // Mock loadGraph to throw (graph removal should be best-effort)
    vi.spyOn(structureModule, 'loadGraph').mockRejectedValue(new Error('Graph load failed'));

    const result = await pruneMemories({ basePath: tempDir, dryRun: false });

    // Should still succeed - graph removal is best-effort
    expect(result.status).toBe('success');
    expect(result.removed).toBe(1);
    expect(result.removedIds).toContain('graph-fail-test');

    // File should still be deleted
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('records error when both deleteMemory and unlinkSync fail', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    const content = `---
id: double-fail-test
title: "Double fail test"
type: breadcrumb
scope: project
created: "${oldDate.toISOString()}"
updated: "${oldDate.toISOString()}"
tags: []
---

# Content
`;
    const filePath = path.join(tempDir, 'temporary', 'double-fail-test.md');
    fs.writeFileSync(filePath, content);

    // Mock deleteMemory to throw
    vi.spyOn(deleteModule, 'deleteMemory').mockRejectedValue(new Error('deleteMemory failed'));

    // Mock fs.unlinkSync to throw
    const originalUnlinkSync = fs.unlinkSync;
    vi.spyOn(fs, 'unlinkSync').mockImplementation((p) => {
      if (String(p).includes('double-fail-test')) {
        throw new Error('unlinkSync failed');
      }
      return originalUnlinkSync(p);
    });

    const result = await pruneMemories({ basePath: tempDir, dryRun: false });

    // Should have error status
    expect(result.status).toBe('error');
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.includes('double-fail-test'))).toBe(true);
  });
});
