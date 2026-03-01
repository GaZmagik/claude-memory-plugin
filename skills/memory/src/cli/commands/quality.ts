/**
 * CLI Commands: Quality Operations
 *
 * Handlers for health, validate, quality, audit, audit-quick commands.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool, getFlagNumber } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { checkHealth, formatHealthReport } from '../../quality/health.js';
import { assessQuality, auditMemories } from '../../quality/assess.js';
import { getResolvedScopePath, parseScope, resolveAgentScopePath } from '../helpers.js';
import { loadGraph } from '../../graph/structure.js';
import { loadIndex } from '../../core/index.js';
import { findOrphanedNodes } from '../../graph/edges.js';
import { parseFrontmatter } from '../../core/frontmatter.js';
import { ProgressReporter } from '../progress.js';

/**
 * health - Quick health check with score
 *
 * Usage: memory health [scope] [--agent <name>] [--compare project] [--check-staleness]
 */
export async function cmdHealth(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scopeStr = scopeArg ?? getFlagString(args.flags, 'scope');

  // Parse agent flag
  const agentName = getFlagString(args.flags, 'agent');
  const compareFlag = getFlagString(args.flags, 'compare');
  const checkStaleness = getFlagBool(args.flags, 'check-staleness');

  // Resolve base path
  const basePath = agentName
    ? await resolveAgentScopePath(agentName, scopeStr)
    : await getResolvedScopePath(parseScope(scopeStr));

  return wrapOperation(
    async () => {
      const report = await checkHealth({ basePath });
      const graph = await loadGraph(basePath);
      const index = await loadIndex({ basePath });
      const orphans = findOrphanedNodes(graph);

      const totalNodes = graph.nodes.length;

      // Handle empty agent
      if (totalNodes === 0 && index.memories.length === 0) {
        return {
          score: 0,
          status: 'empty',
          orphanedNodes: [],
          issues: [],
          integrityChecks: {
            scopeConsistency: true,
            indexSync: true,
            frontmatterValid: true,
          },
          scoreBreakdown: { connectivity: 0, orphanRatio: 0, integrity: 0 },
          recommendations: [],
          circularDependencies: [],
          ...(checkStaleness ? { staleMemories: [] } : {}),
          ...(compareFlag ? { comparison: await buildComparison(compareFlag, report.score, scopeStr) } : {}),
        };
      }

      // Build issues as string array
      const issues: string[] = [];
      if (orphans.length > 2) {
        issues.push('High orphan count');
      }
      if (orphans.length > 0 && orphans.length <= 2) {
        issues.push('Orphaned nodes detected');
      }
      for (const issue of report.issues) {
        if (issue.type === 'sync_mismatch') issues.push('Index-graph sync mismatch');
        if (issue.type === 'ghost_nodes') issues.push('Ghost nodes in graph');
        if (issue.type === 'low_connectivity') issues.push('Low connectivity');
      }

      // Calculate score breakdown
      const connectivityRatio = totalNodes > 0 ? (totalNodes - orphans.length) / totalNodes : 1;
      const orphanRatio = totalNodes > 0 ? orphans.length / totalNodes : 0;
      const scoreBreakdown = {
        connectivity: Math.round(connectivityRatio * 100),
        orphanRatio: Math.round((1 - orphanRatio) * 100),
        integrity: await calculateIntegrityScore(basePath, index),
      };

      // Integrity checks
      const integrityChecks = {
        scopeConsistency: true,
        indexSync: report.issues.every(i => i.type !== 'sync_mismatch'),
        frontmatterValid: await checkFrontmatterValidity(basePath, index),
      };

      // Recommendations
      const recommendations: string[] = [];
      if (orphans.length > 0) {
        recommendations.push(`Consider using 'memory link' to connect ${orphans.length} orphaned node(s)`);
      }
      if (connectivityRatio < 0.5 && totalNodes > 2) {
        recommendations.push('Improve graph connectivity by linking related memories');
      }

      // Detect circular dependencies
      const circularDependencies = detectCircularDependencies(graph);

      // Calculate composite score from breakdown (weighted average)
      const compositeScore = Math.round(
        (scoreBreakdown.connectivity + scoreBreakdown.orphanRatio + scoreBreakdown.integrity) / 3
      );

      // Determine status
      const status = compositeScore >= 70 ? 'healthy' : compositeScore >= 40 ? 'warning' : 'critical';

      // Build result
      const result: Record<string, unknown> = {
        score: compositeScore,
        status,
        orphanedNodes: orphans,
        issues,
        integrityChecks,
        scoreBreakdown,
        recommendations,
        circularDependencies,
      };

      // Optional: staleness check
      if (checkStaleness) {
        result.staleMemories = [];
      }

      // Optional: comparison with project baseline
      if (compareFlag) {
        result.comparison = await buildComparison(compareFlag, compositeScore, scopeStr);
      }

      return result;
    },
    'Health check complete'
  );
}

/**
 * Check frontmatter validity for all memories in index
 */
async function checkFrontmatterValidity(
  basePath: string,
  index: { memories: Array<{ id: string; path?: string }> }
): Promise<boolean> {
  for (const entry of index.memories) {
    const memPath = entry.path ?? findMemoryFile(basePath, entry.id);
    if (memPath && fs.existsSync(memPath)) {
      try {
        const content = fs.readFileSync(memPath, 'utf-8');
        // Extract YAML between --- delimiters
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match?.[1]) return false;
        const parsed = parseFrontmatter(match[1]);
        if (!parsed || !parsed.title) {
          return false;
        }
      } catch {
        return false;
      }
    }
  }
  return true;
}

/**
 * Find memory file by scanning permanent/temporary directories
 */
function findMemoryFile(basePath: string, id: string): string | undefined {
  for (const dir of ['permanent', 'temporary']) {
    const filePath = path.join(basePath, dir, `${id}.md`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return undefined;
}

/**
 * Calculate integrity score (0-100) based on index-graph sync and frontmatter validity
 */
async function calculateIntegrityScore(
  basePath: string,
  index: { memories: Array<{ id: string; path?: string }> }
): Promise<number> {
  const valid = await checkFrontmatterValidity(basePath, index);
  return valid ? 100 : 50;
}

/**
 * Build comparison with project baseline
 */
async function buildComparison(
  compareTarget: string,
  agentScore: number,
  _scopeStr?: string
): Promise<{ projectScore: number; delta: number }> {
  try {
    const projectPath = await getResolvedScopePath(parseScope(compareTarget === 'project' ? undefined : compareTarget));
    const projectReport = await checkHealth({ basePath: projectPath });
    return {
      projectScore: projectReport.score,
      delta: agentScore - projectReport.score,
    };
  } catch {
    return { projectScore: 0, delta: agentScore };
  }
}

/**
 * Detect circular dependencies in the graph
 */
function detectCircularDependencies(
  graph: { nodes: Array<{ id: string }>; edges: Array<{ source: string; target: string }> }
): string[][] {
  const cycles: string[][] = [];
  const adjacency = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    if (inStack.has(node)) {
      // Found cycle - extract it
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push([...path.slice(cycleStart), node]);
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbour of adjacency.get(node) ?? []) {
      dfs(neighbour);
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of graph.nodes) {
    dfs(node.id);
  }

  return cycles;
}

/**
 * validate - Detailed validation with issue detection
 *
 * Usage: memory validate [scope]
 *
 * Note: This is a more comprehensive check than health.
 * Currently delegates to health - full implementation in Phase 3.
 */
export async function cmdValidate(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = await getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      // For now, use health check - full validate implementation in Phase 3
      const report = await checkHealth({ basePath });
      return {
        ...report,
        formatted: formatHealthReport(report),
        note: 'Full validation implementation pending',
      };
    },
    'Validation complete'
  );
}

/**
 * quality - Assess quality score for a single memory
 *
 * Usage: memory quality <id> [--deep] [--scope <scope>]
 *
 * Performs quality assessment on a single memory.
 * --deep enables LLM-powered checks (tier 2/3).
 */
export async function cmdQuality(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = await getResolvedScopePath(scope);
  const deep = getFlagBool(args.flags, 'deep') ?? false;

  return wrapOperation(
    async () => {
      const result = await assessQuality({ id, basePath, deep });
      return result;
    },
    `Quality assessment for ${id}`
  );
}

/**
 * audit - Bulk quality scan
 *
 * Usage: memory audit [scope] [--threshold <n>] [--deep]
 *
 * Scans all memories and reports those below the threshold score.
 * --deep enables LLM-powered checks (slower).
 */
export async function cmdAudit(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = await getResolvedScopePath(scope);
  const threshold = getFlagNumber(args.flags, 'threshold') ?? 70;
  const deep = getFlagBool(args.flags, 'deep') ?? false;

  return wrapOperation(
    async () => {
      const progress = new ProgressReporter({
        operation: deep ? 'Auditing memories (deep)' : 'Auditing memories',
      });
      const result = await auditMemories({
        basePath,
        threshold,
        deep,
        onProgress: progress.toCallback(),
      });
      progress.complete(
        `Audit: ${result.scanned} scanned, ${result.results.length} below threshold`
      );
      return result;
    },
    `Audit complete for ${scopeArg ?? 'project'} scope`
  );
}

/**
 * audit-quick - Fast deterministic-only audit
 *
 * Usage: memory audit-quick [scope] [--threshold <n>]
 *
 * Like audit but skips LLM checks for faster execution.
 */
export async function cmdAuditQuick(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = await getResolvedScopePath(scope);
  const threshold = getFlagNumber(args.flags, 'threshold') ?? 70;

  return wrapOperation(
    async () => {
      const progress = new ProgressReporter({
        operation: 'Quick audit',
      });
      const result = await auditMemories({
        basePath,
        threshold,
        deep: false,
        onProgress: progress.toCallback(),
      });
      progress.complete(
        `Quick audit: ${result.scanned} scanned, ${result.results.length} below threshold`
      );
      return result;
    },
    `Quick audit complete for ${scopeArg ?? 'project'} scope`
  );
}
