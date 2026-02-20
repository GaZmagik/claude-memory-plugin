/**
 * T128: Unit test for quality assess excluding rule nodes
 *
 * Verifies that assessQuality returns perfect score for rule nodes without assessment.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { assessQuality } from './assess.js';
import { MemoryType, Scope } from '../types/enums.js';
import { unsafeAsMemoryId } from '../types/branded.js';

describe('T128: Quality Assess - Exclude Rule Nodes', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-test-'));

    // Create graph with rule node
    const graph = {
      version: 1,
      nodes: [
        {
          id: unsafeAsMemoryId('rule-project-claude-md-root'),
          type: MemoryType.Rule,
          title: 'CLAUDE.md',
          scope: Scope.Project,
        },
      ],
      edges: [],
    };

    fs.writeFileSync(path.join(tempDir, 'graph.json'), JSON.stringify(graph, null, 2));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return perfect score for rule nodes without assessment', async () => {
    const result = await assessQuality({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
      deep: false,
    });

    expect(result.status).toBe('success');
    expect(result.score).toBe(100);
    expect(result.rating).toBe('excellent');
    expect(result.issues).toHaveLength(0);
    expect(result.tiersCompleted).toContain(1);
  });

  it('should skip quality assessment for rule nodes', async () => {
    // Rule nodes should get perfect score immediately without file checks
    const result = await assessQuality({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
      deep: false,
    });

    expect(result.status).toBe('success');
    expect(result.score).toBe(100);
    // Should complete tier 1 only (the external node check)
    expect(result.tiersCompleted).toEqual([1]);
  });
});
