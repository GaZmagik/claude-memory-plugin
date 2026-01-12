/**
 * T074: Health Check
 *
 * Quick health check with connectivity score.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadGraph, type MemoryGraph } from '../graph/structure.js';
import { findOrphanedNodes } from '../graph/edges.js';
import { loadIndex } from '../core/index.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('health');

/**
 * Health issue types
 */
export type HealthIssueType =
  | 'missing_index'
  | 'missing_graph'
  | 'orphaned_nodes'
  | 'sync_mismatch'
  | 'ghost_nodes'
  | 'orphan_files'
  | 'low_connectivity';

/**
 * Issue severity
 */
export type IssueSeverity = 'info' | 'warning' | 'error';

/**
 * Health issue
 */
export interface HealthIssue {
  type: HealthIssueType;
  count: number;
  severity: IssueSeverity;
  details?: string[];
}

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'warning' | 'critical';

/**
 * Health statistics
 */
export interface HealthStats {
  totalMemories: number;
  totalNodes: number;
  totalEdges: number;
  orphanedNodes: number;
  connectivityRatio: number;
}

/**
 * Health report
 */
export interface HealthReport {
  status: HealthStatus;
  score: number;
  stats: HealthStats;
  issues: HealthIssue[];
  timestamp: string;
}

/**
 * Penalty points for each issue type
 */
const ISSUE_PENALTIES: Record<HealthIssueType, number> = {
  missing_index: 30,
  missing_graph: 30,
  orphaned_nodes: 3, // Per orphaned node, max 30
  sync_mismatch: 10,
  ghost_nodes: 5,
  orphan_files: 5,
  low_connectivity: 10,
};

/**
 * Calculate health score from issues
 */
export function calculateHealthScore(issues: HealthIssue[]): number {
  let score = 100;

  for (const issue of issues) {
    const penalty = ISSUE_PENALTIES[issue.type] || 5;

    if (issue.type === 'orphaned_nodes') {
      // Cap orphaned nodes penalty at 30
      score -= Math.min(issue.count * penalty, 30);
    } else {
      score -= penalty * issue.count;
    }
  }

  return Math.max(0, score);
}

/**
 * Get status from score
 */
function getStatusFromScore(score: number): HealthStatus {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'warning';
  return 'critical';
}

/**
 * Check health request
 */
export interface CheckHealthRequest {
  basePath?: string;
}

/**
 * Check health of memory system
 */
export async function checkHealth(request: CheckHealthRequest): Promise<HealthReport> {
  const basePath = request.basePath ?? process.cwd();
  const issues: HealthIssue[] = [];
  const indexPath = path.join(basePath, 'index.json');
  const graphPath = path.join(basePath, 'graph.json');

  // Check for missing files
  const hasIndex = fs.existsSync(indexPath);
  const hasGraph = fs.existsSync(graphPath);

  if (!hasIndex) {
    issues.push({ type: 'missing_index', count: 1, severity: 'error' });
  }

  if (!hasGraph) {
    issues.push({ type: 'missing_graph', count: 1, severity: 'error' });
  }

  // Load data
  let graph: MemoryGraph = { version: 1, nodes: [], edges: [] };
  let indexEntries: Array<{ id: string }> = [];

  if (hasGraph) {
    graph = await loadGraph(basePath);
  }

  if (hasIndex) {
    const index = await loadIndex({ basePath });
    indexEntries = index.memories;
  }

  // Check for orphaned nodes
  const orphanedNodes = findOrphanedNodes(graph);
  if (orphanedNodes.length > 0) {
    issues.push({
      type: 'orphaned_nodes',
      count: orphanedNodes.length,
      severity: 'warning',
      details: orphanedNodes.slice(0, 10), // Limit to first 10
    });
  }

  // Check for sync mismatches (index entries without graph nodes)
  const graphNodeIds = new Set(graph.nodes.map(n => n.id));
  const indexIds = new Set(indexEntries.map(e => e.id));

  const missingInGraph = indexEntries.filter(e => !graphNodeIds.has(e.id));
  if (missingInGraph.length > 0) {
    issues.push({
      type: 'sync_mismatch',
      count: missingInGraph.length,
      severity: 'warning',
      details: missingInGraph.map(e => e.id).slice(0, 10),
    });
  }

  // Check for ghost nodes (graph nodes without index entries)
  const ghostNodes = graph.nodes.filter(n => !indexIds.has(n.id));
  if (ghostNodes.length > 0) {
    issues.push({
      type: 'ghost_nodes',
      count: ghostNodes.length,
      severity: 'warning',
      details: ghostNodes.map(n => n.id).slice(0, 10),
    });
  }

  // Calculate connectivity ratio
  const totalNodes = graph.nodes.length;
  const connectedNodes = totalNodes - orphanedNodes.length;
  const connectivityRatio = totalNodes > 0 ? connectedNodes / totalNodes : 1;

  if (connectivityRatio < 0.5 && totalNodes > 5) {
    issues.push({
      type: 'low_connectivity',
      count: 1,
      severity: 'warning',
    });
  }

  // Calculate score and status
  const score = calculateHealthScore(issues);
  const status = getStatusFromScore(score);

  const report: HealthReport = {
    status,
    score,
    stats: {
      totalMemories: indexEntries.length,
      totalNodes,
      totalEdges: graph.edges.length,
      orphanedNodes: orphanedNodes.length,
      connectivityRatio,
    },
    issues,
    timestamp: new Date().toISOString(),
  };

  log.debug('Health check complete', { score, status, issues: issues.length });

  return report;
}

/**
 * Format health report for display
 */
export function formatHealthReport(report: HealthReport): string {
  const lines: string[] = [];

  // Status line with emoji
  const statusEmoji = {
    healthy: '✓',
    warning: '⚠',
    critical: '✗',
  };

  lines.push(`${statusEmoji[report.status]} Health: ${report.status.toUpperCase()} (Score: ${report.score}/100)`);
  lines.push('');

  // Stats
  lines.push('Statistics:');
  lines.push(`  Memories: ${report.stats.totalMemories}`);
  lines.push(`  Nodes: ${report.stats.totalNodes}`);
  lines.push(`  Edges: ${report.stats.totalEdges}`);
  lines.push(`  Connectivity: ${(report.stats.connectivityRatio * 100).toFixed(1)}%`);

  // Issues
  if (report.issues.length > 0) {
    lines.push('');
    lines.push('Issues:');
    for (const issue of report.issues) {
      const severityEmoji = {
        info: 'ℹ',
        warning: '⚠',
        error: '✗',
      };
      lines.push(`  ${severityEmoji[issue.severity]} ${issue.type}: ${issue.count}`);
      if (issue.details && issue.details.length > 0) {
        for (const detail of issue.details.slice(0, 5)) {
          lines.push(`    - ${detail}`);
        }
        if (issue.details.length > 5) {
          lines.push(`    ... and ${issue.details.length - 5} more`);
        }
      }
    }
  }

  return lines.join('\n');
}
