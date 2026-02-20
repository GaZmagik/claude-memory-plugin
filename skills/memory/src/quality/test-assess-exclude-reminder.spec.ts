/**
 * T129: Unit test for quality assess excluding reminder nodes
 *
 * Verifies that assessQuality returns perfect score for reminder nodes without assessment.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { assessQuality } from './assess.js';
import { MemoryType, Scope } from '../types/enums.js';
import { unsafeAsMemoryId } from '../types/branded.js';

describe('T129: Quality Assess - Exclude Reminder Nodes', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-test-'));

    // Create graph with reminder node
    const graph = {
      version: 1,
      nodes: [
        {
          id: unsafeAsMemoryId('reminder-project-typescript-expert-memory'),
          type: MemoryType.Reminder,
          title: 'TypeScript Expert Memory',
          scope: Scope.AgentProject,
          agent: 'typescript-expert',
        },
      ],
      edges: [],
    };

    fs.writeFileSync(path.join(tempDir, 'graph.json'), JSON.stringify(graph, null, 2));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return perfect score for reminder nodes without assessment', async () => {
    const result = await assessQuality({
      id: 'reminder-project-typescript-expert-memory',
      basePath: tempDir,
      deep: false,
    });

    expect(result.status).toBe('success');
    expect(result.score).toBe(100);
    expect(result.rating).toBe('excellent');
    expect(result.issues).toHaveLength(0);
    expect(result.tiersCompleted).toContain(1);
  });

  it('should skip quality assessment for reminder nodes', async () => {
    // Reminder nodes should get perfect score immediately without file checks
    const result = await assessQuality({
      id: 'reminder-project-typescript-expert-memory',
      basePath: tempDir,
      deep: false,
    });

    expect(result.status).toBe('success');
    expect(result.score).toBe(100);
    // Should complete tier 1 only (the external node check)
    expect(result.tiersCompleted).toEqual([1]);
  });
});
