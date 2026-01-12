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
  formatHealthReport,
  type HealthReport,
  type HealthStatus,
} from './health.js';

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
      const index = { version: 1, memories: [] };
      const graph = { version: 1, nodes: [], edges: [] };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      expect(report.status).toBe('healthy');
      expect(report.score).toBeGreaterThanOrEqual(90);
      expect(report.score).toBe(100);
      expect(report.issues).toHaveLength(0);
      expect(report.stats.totalMemories).toBe(0);
      expect(report.stats.totalNodes).toBe(0);
      expect(report.stats.totalEdges).toBe(0);
      expect(report.stats.orphanedNodes).toBe(0);
      expect(report.stats.connectivityRatio).toBe(1);
      expect(report.timestamp).toBeDefined();
    });

    it('should detect missing index file', async () => {
      const graph = { version: 1, nodes: [], edges: [] };
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'missing_index', count: 1, severity: 'error' })
      );
      expect(report.status).toBe('warning');
      expect(report.score).toBeLessThan(100);
    });

    it('should detect missing graph file', async () => {
      const index = { version: 1, memories: [] };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));

      const report = await checkHealth({ basePath: testDir });

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'missing_graph', count: 1, severity: 'error' })
      );
      expect(report.status).toBe('warning');
      expect(report.score).toBeLessThan(100);
    });

    it('should detect orphaned nodes', async () => {
      const index = { version: 1, memories: [] };
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

      const report = await checkHealth({ basePath: testDir });

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'orphaned_nodes', count: 2, severity: 'warning' })
      );
      expect(report.stats.orphanedNodes).toBe(2);
      expect(report.stats.totalNodes).toBe(2);
      expect(report.stats.connectivityRatio).toBe(0);
    });

    it('should detect index/graph sync issues', async () => {
      const index = {
        version: 1,
        memories: [{ id: 'mem-1', type: 'decision', title: 'Test', tags: [], relativePath: 'mem-1.md', created: '', updated: '' }],
      };
      const graph = { version: 1, nodes: [], edges: [] }; // Missing node
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'sync_mismatch', count: 1, severity: 'warning' })
      );
      const syncIssue = report.issues.find(i => i.type === 'sync_mismatch');
      expect(syncIssue?.details).toContain('mem-1');
    });

    it('should include memory counts in report', async () => {
      const index = {
        version: 1,
        memories: [
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

      const report = await checkHealth({ basePath: testDir });

      expect(report.stats.totalMemories).toBe(2);
      expect(report.stats.totalNodes).toBe(2);
      expect(report.stats.totalEdges).toBe(1);
      expect(report.stats.orphanedNodes).toBe(0);
      expect(report.stats.connectivityRatio).toBe(1);
    });

    it('should detect ghost nodes in graph without index entries', async () => {
      const index = { version: 1, memories: [] };
      const graph = {
        version: 1,
        nodes: [
          { id: 'ghost-1', type: 'decision' },
          { id: 'ghost-2', type: 'learning' },
        ],
        edges: [],
      };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'ghost_nodes', count: 2, severity: 'warning' })
      );
      const ghostIssue = report.issues.find(i => i.type === 'ghost_nodes');
      expect(ghostIssue?.details).toEqual(expect.arrayContaining(['ghost-1', 'ghost-2']));
    });

    it('should detect low connectivity when ratio < 0.5 with > 5 nodes', async () => {
      const index = { version: 1, memories: [] };
      const graph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'decision' },
          { id: 'node-3', type: 'decision' },
          { id: 'node-4', type: 'decision' },
          { id: 'node-5', type: 'decision' },
          { id: 'node-6', type: 'decision' },
          { id: 'node-7', type: 'decision' },
        ],
        edges: [
          { source: 'node-1', target: 'node-2', label: 'relates-to' },
        ], // Only 2 connected out of 7 = 0.28 ratio
      };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      expect(report.issues).toContainEqual(
        expect.objectContaining({ type: 'low_connectivity', count: 1, severity: 'warning' })
      );
      expect(report.stats.connectivityRatio).toBeLessThan(0.5);
    });

    it('should not flag low connectivity for small graphs', async () => {
      const index = { version: 1, memories: [] };
      const graph = {
        version: 1,
        nodes: [
          { id: 'node-1', type: 'decision' },
          { id: 'node-2', type: 'decision' },
          { id: 'node-3', type: 'decision' },
        ],
        edges: [], // All orphaned but only 3 nodes
      };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      const lowConnIssue = report.issues.find(i => i.type === 'low_connectivity');
      expect(lowConnIssue).toBeUndefined();
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
      const index = { version: 1, memories: [] };
      const graph = { version: 1, nodes: [], edges: [] };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      expect(report.status).toBe('healthy');
    });

    it('should be "warning" for score 70-89', async () => {
      const index = { version: 1, memories: [] };
      const graph = {
        version: 1,
        nodes: Array(15).fill(null).map((_, i) => ({ id: `orphan-${i}`, type: 'decision' })),
        edges: [],
      };
      fs.writeFileSync(path.join(testDir, 'index.json'), JSON.stringify(index));
      fs.writeFileSync(path.join(testDir, 'graph.json'), JSON.stringify(graph));

      const report = await checkHealth({ basePath: testDir });

      expect(['warning', 'critical']).toContain(report.status);
    });
  });

  describe('formatHealthReport', () => {
    it('should format healthy report with checkmark', () => {
      const report: HealthReport = {
        status: 'healthy',
        score: 100,
        stats: {
          totalMemories: 10,
          totalNodes: 10,
          totalEdges: 5,
          orphanedNodes: 0,
          connectivityRatio: 1.0,
        },
        issues: [],
        timestamp: '2026-01-11T00:00:00Z',
      };

      const formatted = formatHealthReport(report);

      expect(formatted).toContain('✓');
      expect(formatted).toContain('HEALTHY');
      expect(formatted).toContain('Score: 100/100');
      expect(formatted).toContain('Memories: 10');
      expect(formatted).toContain('Nodes: 10');
      expect(formatted).toContain('Edges: 5');
      expect(formatted).toContain('Connectivity: 100.0%');
    });

    it('should format warning report with warning emoji', () => {
      const report: HealthReport = {
        status: 'warning',
        score: 75,
        stats: {
          totalMemories: 8,
          totalNodes: 10,
          totalEdges: 3,
          orphanedNodes: 2,
          connectivityRatio: 0.8,
        },
        issues: [
          { type: 'orphaned_nodes', count: 2, severity: 'warning', details: ['node-1', 'node-2'] },
        ],
        timestamp: '2026-01-11T00:00:00Z',
      };

      const formatted = formatHealthReport(report);

      expect(formatted).toContain('⚠');
      expect(formatted).toContain('WARNING');
      expect(formatted).toContain('Issues:');
      expect(formatted).toContain('orphaned_nodes: 2');
      expect(formatted).toContain('- node-1');
      expect(formatted).toContain('- node-2');
    });

    it('should format critical report with X emoji', () => {
      const report: HealthReport = {
        status: 'critical',
        score: 40,
        stats: {
          totalMemories: 0,
          totalNodes: 0,
          totalEdges: 0,
          orphanedNodes: 0,
          connectivityRatio: 1,
        },
        issues: [
          { type: 'missing_index', count: 1, severity: 'error' },
          { type: 'missing_graph', count: 1, severity: 'error' },
        ],
        timestamp: '2026-01-11T00:00:00Z',
      };

      const formatted = formatHealthReport(report);

      expect(formatted).toContain('✗');
      expect(formatted).toContain('CRITICAL');
      expect(formatted).toContain('missing_index: 1');
      expect(formatted).toContain('missing_graph: 1');
    });

    it('should truncate long details list', () => {
      const report: HealthReport = {
        status: 'warning',
        score: 70,
        stats: {
          totalMemories: 20,
          totalNodes: 20,
          totalEdges: 0,
          orphanedNodes: 10,
          connectivityRatio: 0.5,
        },
        issues: [
          {
            type: 'orphaned_nodes',
            count: 10,
            severity: 'warning',
            details: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10'],
          },
        ],
        timestamp: '2026-01-11T00:00:00Z',
      };

      const formatted = formatHealthReport(report);

      expect(formatted).toContain('- n1');
      expect(formatted).toContain('- n5');
      expect(formatted).toContain('... and 5 more');
      expect(formatted).not.toContain('- n6');
    });

    it('should handle info severity issues', () => {
      const report: HealthReport = {
        status: 'healthy',
        score: 95,
        stats: {
          totalMemories: 5,
          totalNodes: 5,
          totalEdges: 2,
          orphanedNodes: 0,
          connectivityRatio: 1,
        },
        issues: [
          { type: 'low_connectivity', count: 1, severity: 'info' },
        ],
        timestamp: '2026-01-11T00:00:00Z',
      };

      const formatted = formatHealthReport(report);

      expect(formatted).toContain('ℹ');
      expect(formatted).toContain('low_connectivity');
    });
  });
});
