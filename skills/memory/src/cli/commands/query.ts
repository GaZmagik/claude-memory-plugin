/**
 * CLI Commands: Query Operations
 *
 * Handlers for query, stats, impact commands.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope } from '../../types/enums.js';
import { loadGraph } from '../../graph/structure.js';
import { findOrphanedNodes, getInboundEdges, getOutboundEdges } from '../../graph/edges.js';
import { calculateImpact } from '../../graph/traversal.js';
import { getScopePath } from '../../scope/resolver.js';
import { loadIndex } from '../../core/index.js';

/**
 * Get global memory path
 */
function getGlobalMemoryPath(): string {
  return path.join(os.homedir(), '.claude', 'memory');
}

/**
 * Get resolved scope path
 */
function getResolvedScopePath(scope: Scope): string {
  const cwd = process.cwd();
  const globalPath = getGlobalMemoryPath();
  return getScopePath(scope, cwd, globalPath);
}

/**
 * Parse scope string to Scope enum
 */
function parseScope(scopeStr: string | undefined): Scope {
  switch (scopeStr?.toLowerCase()) {
    case 'user':
    case 'global':
      return Scope.Global;
    case 'project':
      return Scope.Project;
    case 'local':
      return Scope.Local;
    case 'enterprise':
      return Scope.Enterprise;
    default:
      return Scope.Project;
  }
}

/**
 * query - Query memories with complex filters
 *
 * Usage: memory query [--type <type>] [--tags <tag1,tag2>] [--has-edges] [--orphans] [--scope <scope>] [--limit <n>]
 *
 * Filters:
 * - --type: Filter by memory type (decision, learning, artifact, etc.)
 * - --tags: Filter by tags (comma-separated, matches any)
 * - --has-edges: Only return memories with edges (inbound or outbound)
 * - --orphans: Only return orphaned memories (no edges)
 * - --limit: Maximum results to return (default 50)
 */
export async function cmdQuery(args: ParsedArgs): Promise<CliResponse> {
  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const typeFilter = getFlagString(args.flags, 'type');
  const tagsStr = getFlagString(args.flags, 'tags');
  const hasEdges = getFlagBool(args.flags, 'has-edges');
  const orphans = getFlagBool(args.flags, 'orphans');
  const limit = args.flags.limit ? Number(args.flags.limit) : 50;

  return wrapOperation(
    async () => {
      // Load index and graph
      const index = await loadIndex({ basePath });
      const graph = await loadGraph(basePath);

      // Build set of orphaned node IDs
      const orphanedIds = new Set(findOrphanedNodes(graph));

      // Build set of IDs with edges
      const idsWithEdges = new Set<string>();
      for (const edge of graph.edges) {
        idsWithEdges.add(edge.source);
        idsWithEdges.add(edge.target);
      }

      // Parse tag filter
      const tagFilter = tagsStr?.split(',').map(t => t.trim().toLowerCase()) ?? [];

      // Filter memories
      let results = index.memories.filter(memory => {
        // Type filter
        if (typeFilter && memory.type !== typeFilter) {
          return false;
        }

        // Tags filter (any match)
        if (tagFilter.length > 0) {
          const memoryTags = (memory.tags ?? []).map(t => t.toLowerCase());
          const hasMatchingTag = tagFilter.some(t => memoryTags.includes(t));
          if (!hasMatchingTag) {
            return false;
          }
        }

        // Has edges filter
        if (hasEdges && !idsWithEdges.has(memory.id)) {
          return false;
        }

        // Orphans filter
        if (orphans && !orphanedIds.has(memory.id)) {
          return false;
        }

        return true;
      });

      // Apply limit
      const totalMatches = results.length;
      results = results.slice(0, limit);

      // Add edge counts to results
      const resultsWithEdges = results.map(memory => {
        const inbound = getInboundEdges(graph, memory.id).length;
        const outbound = getOutboundEdges(graph, memory.id).length;
        return {
          ...memory,
          edges: { inbound, outbound },
        };
      });

      return {
        filters: {
          type: typeFilter ?? null,
          tags: tagFilter.length > 0 ? tagFilter : null,
          hasEdges: hasEdges ?? false,
          orphans: orphans ?? false,
          limit,
        },
        totalMatches,
        returned: resultsWithEdges.length,
        results: resultsWithEdges,
      };
    },
    'Query complete'
  );
}

/**
 * stats - Show graph statistics
 *
 * Usage: memory stats [scope]
 */
export async function cmdStats(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const graph = await loadGraph(basePath);
      const orphans = findOrphanedNodes(graph);

      // Calculate statistics
      const nodeCount = graph.nodes.length;
      const edgeCount = graph.edges.length;
      const orphanCount = orphans.length;
      const connectedCount = nodeCount - orphanCount;
      const connectivityRatio = nodeCount > 0 ? connectedCount / nodeCount : 1;
      const edgeToNodeRatio = nodeCount > 0 ? edgeCount / nodeCount : 0;

      // Find hubs (nodes with high connectivity)
      const edgeCounts = new Map<string, number>();
      for (const edge of graph.edges) {
        edgeCounts.set(edge.source, (edgeCounts.get(edge.source) ?? 0) + 1);
        edgeCounts.set(edge.target, (edgeCounts.get(edge.target) ?? 0) + 1);
      }

      const hubs = [...edgeCounts.entries()]
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, connections: count }));

      // Find sinks (no outbound) and sources (no inbound)
      const outbound = new Set(graph.edges.map(e => e.source));
      const inbound = new Set(graph.edges.map(e => e.target));
      const allNodes = new Set(graph.nodes.map(n => n.id));

      const sinks = [...allNodes].filter(id => !outbound.has(id) && inbound.has(id));
      const sources = [...allNodes].filter(id => outbound.has(id) && !inbound.has(id));

      return {
        scope: scopeArg ?? 'project',
        nodes: nodeCount,
        edges: edgeCount,
        orphans: orphanCount,
        connected: connectedCount,
        connectivityRatio: Math.round(connectivityRatio * 100) / 100,
        edgeToNodeRatio: Math.round(edgeToNodeRatio * 100) / 100,
        hubs,
        sinks: sinks.slice(0, 10),
        sources: sources.slice(0, 10),
      };
    },
    `Stats for ${scopeArg ?? 'project'} scope`
  );
}

/**
 * impact - Show what depends on a memory
 *
 * Usage: memory impact <id> [--depth <n>] [--json] [--scope <scope>]
 */
export async function cmdImpact(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const graph = await loadGraph(basePath);
      const impact = calculateImpact(graph, id);
      return {
        id,
        ...impact,
      };
    },
    `Impact analysis for ${id}`
  );
}
