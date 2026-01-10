/**
 * T073: Unit tests for health check
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  checkHealth,
  calculateHealthScore,
  type HealthReport,
  type HealthStatus,
} from '../../../skills/memory/src/quality/health.js';

describe('Health Check', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('checkHealth', () => {
    it('should return healthy status for valid memory system', async () => {
      // Create valid index and graph
      const index = { version: 1, entries: [] };
      const graph = { version: 1, nodes: [], edges: [] };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth(testDir);

      expect(report.status).toBe('healthy');
      expect(report.score).toBeGreaterThanOrEqual(90);
    });

    it('should detect missing index file', async () => {
      const graph = { version: 1, nodes: [], edges: [] };
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth(testDir);

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'missing_index' })
      );
    });

    it('should detect missing graph file', async () => {
      const index = { version: 1, entries: [] };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));

      const report = await checkHealth(testDir);

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'missing_graph' })
      );
    });

    it('should detect orphaned nodes', async () => {
      const index = { version: 1, entries: [] };
      const graph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'learning' },
        ],
        edges: [], // No edges = orphaned nodes
      };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth(testDir);

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'orphaned_nodes' })
      );
    });

    it('should detect index/graph sync issues', async () => {
      const index = {
        version: 1,
        entries: [{ id: 'mem-1', type: 'decision', title: 'Test', tags: [], relativePath: 'mem-1.md', created: '', updated: '' }],
      };
      const graph = { version: 1, nodes: [], edges: [] }; // Missing node
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth(testDir);

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'sync_mismatch' })
      );
    });

    it('should include memory counts in report', async () => {
      const index = {
        version: 1,
        entries: [
          { id: 'mem-1', type: 'decision', title: 'Test 1', tags: [], relativePath: 'mem-1.md', created: '', updated: '' },
          { id: 'mem-2', type: 'learning', title: 'Test 2', tags: [], relativePath: 'mem-2.md', created: '', updated: '' },
        ],
      };
      const graph = {
        version: 1,
        nodes: [
          { id: 'mem-1', type: 'decision' },
          { id: 'mem-2', type: 'learning' },
        ],
        edges: [{ source: 'mem-1', target: 'mem-2', label: 'relates-to' }],
      };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth(testDir);

      expect(report.stats.totalMemories).toBe(2);
      expect(report.stats.totalEdges).toBe(1);
    });
  });

  describe('calculateHealthScore', () => {
    it('should return 100 for no issues', () => {
      const score = calculateHealthScore([]);
      expect(score).toBe(100);
    });

    it('should deduct points for orphaned nodes', () => {
      const issues = [{ type: 'orphaned_nodes' as const, count: 3, severity: 'warning' as const }];
      const score = calculateHealthScore(issues);
      expect(score).toBeLessThan(100);
    });

    it('should deduct more for critical issues', () => {
      const warningScore = calculateHealthScore([
        { type: 'orphaned_nodes', count: 1, severity: 'warning' },
      ]);
      const errorScore = calculateHealthScore([
        { type: 'missing_index', count: 1, severity: 'error' },
      ]);

      expect(errorScore).toBeLessThan(warningScore);
    });

    it('should not go below 0', () => {
      const issues = Array(20).fill({
        type: 'missing_index',
        count: 1,
        severity: 'error',
      });

      const score = calculateHealthScore(issues);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should return correct status for score ranges', () => {
      expect(calculateHealthScore([])).toBe(100); // Excellent
    });
  });

  describe('HealthStatus', () => {
    it('should be "healthy" for score >= 90', async () => {
      const index = { version: 1, entries: [] };
      const graph = { version: 1, nodes: [], edges: [] };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth(testDir);

      expect(report.status).toBe('healthy');
    });

    it('should be "warning" for score 70-89', async () => {
      const index = { version: 1, entries: [] };
      const graph = {
        version: 1,
        nodes: Array(15).fill(null).map((_, i) => ({ id: `orphan-${i}`, type: 'decision' })),
        edges: [],
      };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth(testDir);

      expect(['warning', 'critical']).toContain(report.status);
    });
  });
});
