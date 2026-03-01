/**
 * CLI Commands: Query Operations
 *
 * Handlers for query, stats, impact commands.
 */

import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { loadGraph, loadMergedGraph } from '../../graph/structure.js';
import { findOrphanedNodes, getInboundEdges, getOutboundEdges } from '../../graph/edges.js';
import { calculateImpact } from '../../graph/traversal.js';
import { loadIndex } from '../../core/index.js';
import { getResolvedScopePath, parseScope, resolveAgentScopePath, validateIncludeShared, resolveSharedScopePaths } from '../helpers.js';
import type { IndexEntry } from '../../types/memory.js';
import { getScopeNameFromPath, formatScopedResult } from '../../core/scope-indicators.js';

/**
 * query - Query memories with complex filters
 *
 * Usage: memory query [--type <type>] [--tags <tag1,tag2>] [--has-edges] [--orphans] [--scope <scope>] [--limit <n>] [--agent <name>]
 *
 * Filters:
 * - --type: Filter by memory type (decision, learning, artifact, etc.)
 * - --tags: Filter by tags (comma-separated, matches any)
 * - --has-edges: Only return memories with edges (inbound or outbound)
 * - --orphans: Only return orphaned memories (no edges)
 * - --limit: Maximum results to return (default 50)
 */
export async function cmdQuery(args: ParsedArgs): Promise<CliResponse> {
  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Validate --include-shared flag
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  const typeFilter = getFlagString(args.flags, 'type');
  const tagsStr = getFlagString(args.flags, 'tags');
  const hasEdges = getFlagBool(args.flags, 'has-edges');
  const orphans = getFlagBool(args.flags, 'orphans');
  const limit = args.flags.limit ? Number(args.flags.limit) : 50;

  return wrapOperation(
    async () => {
      // Parse tag filter
      const tagFilter = tagsStr?.split(',').map(t => t.trim().toLowerCase()) ?? [];

      // Multi-scope query if --include-shared is used with --agent
      if (includeShared && agentName) {
        const scopePaths = await resolveSharedScopePaths(agentName, scopeStr);
        const allResults: Array<Omit<IndexEntry, 'id' | 'scope'> & { id: string; scope: string; edges: { inbound: number; outbound: number } }> = [];

        // Query across all scope paths
        for (const scopePath of scopePaths) {
          const scopeName = getScopeNameFromPath(scopePath);
          const index = await loadIndex({ basePath: scopePath, agent: agentName });
          const graph = await loadGraph(scopePath);

          // Build set of orphaned node IDs
          const orphanedIds = new Set(findOrphanedNodes(graph));

          // Build set of IDs with edges
          const idsWithEdges = new Set<string>();
          for (const edge of graph.edges) {
            idsWithEdges.add(edge.source);
            idsWithEdges.add(edge.target);
          }

          // Filter memories
          const filtered = index.memories.filter(memory => {
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

          // Add edge counts and scope to results
          filtered.forEach(memory => {
            const inbound = getInboundEdges(graph, memory.id).length;
            const outbound = getOutboundEdges(graph, memory.id).length;
            allResults.push({
              ...memory,
              id: formatScopedResult(memory.id, scopeName),
              scope: scopeName,
              edges: { inbound, outbound },
            });
          });
        }

        // Apply limit across all results
        const totalMatches = allResults.length;
        const limitedResults = allResults.slice(0, limit);

        return {
          filters: {
            type: typeFilter ?? null,
            tags: tagFilter.length > 0 ? tagFilter : null,
            hasEdges: hasEdges ?? false,
            orphans: orphans ?? false,
            limit,
          },
          totalMatches,
          returned: limitedResults.length,
          results: limitedResults,
          scopes: scopePaths.map(getScopeNameFromPath),
        };
      }

      // Single-scope query (existing behavior)
      const basePath = agentName
        ? await resolveAgentScopePath(agentName, scopeStr)
        : await getResolvedScopePath(parseScope(scopeStr));

      // Load index and graph
      const index = await loadIndex({ basePath, agent: agentName });
      const graph = await loadGraph(basePath);

      // Build set of orphaned node IDs
      const orphanedIds = new Set(findOrphanedNodes(graph));

      // Build set of IDs with edges
      const idsWithEdges = new Set<string>();
      for (const edge of graph.edges) {
        idsWithEdges.add(edge.source);
        idsWithEdges.add(edge.target);
      }

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
 * Usage: memory stats [scope] [--agent <name>]
 */
export async function cmdStats(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = scopeArg ?? getFlagString(args.flags, 'scope');

  // Validate --include-shared flag
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  return wrapOperation(
    async () => {
      // Multi-scope stats if --include-shared is used with --agent
      if (includeShared && agentName) {
        const scopePaths = await resolveSharedScopePaths(agentName, scopeStr);
        const scopeStats: Array<{ scope: string; nodes: number; edges: number; orphans: number }> = [];

        let totalNodes = 0;
        let totalEdges = 0;
        let totalOrphans = 0;
        const allEdgeCounts = new Map<string, { count: number; scope: string }>();

        // Collect stats from each scope
        for (const scopePath of scopePaths) {
          const scopeName = getScopeNameFromPath(scopePath);
          const graph = await loadGraph(scopePath);
          const orphans = findOrphanedNodes(graph);

          const nodeCount = graph.nodes.length;
          const edgeCount = graph.edges.length;
          const orphanCount = orphans.length;

          totalNodes += nodeCount;
          totalEdges += edgeCount;
          totalOrphans += orphanCount;

          // Track edge counts with scope indicators
          for (const edge of graph.edges) {
            const sourceKey = formatScopedResult(edge.source, scopeName);
            const targetKey = formatScopedResult(edge.target, scopeName);
            allEdgeCounts.set(sourceKey, {
              count: (allEdgeCounts.get(sourceKey)?.count ?? 0) + 1,
              scope: scopeName,
            });
            allEdgeCounts.set(targetKey, {
              count: (allEdgeCounts.get(targetKey)?.count ?? 0) + 1,
              scope: scopeName,
            });
          }

          scopeStats.push({
            scope: scopeName,
            nodes: nodeCount,
            edges: edgeCount,
            orphans: orphanCount,
          });
        }

        const connectedCount = totalNodes - totalOrphans;
        const connectivityRatio = totalNodes > 0 ? connectedCount / totalNodes : 1;
        const edgeToNodeRatio = totalNodes > 0 ? totalEdges / totalNodes : 0;

        // Find top hubs across all scopes
        const hubs = [...allEdgeCounts.entries()]
          .filter(([_, data]) => data.count >= 3)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([id, data]) => ({ id, connections: data.count }));

        return {
          scope: 'multi-scope',
          scopes: scopeStats,
          nodes: totalNodes,
          totalNodes: totalNodes,
          totalEdges: totalEdges,
          orphans: totalOrphans,
          connected: connectedCount,
          connectivityRatio: Math.round(connectivityRatio * 100) / 100,
          edgeToNodeRatio: Math.round(edgeToNodeRatio * 100) / 100,
          hubs,
        };
      }

      // Single-scope stats (existing behavior)
      const basePath = agentName
        ? await resolveAgentScopePath(agentName, scopeStr)
        : await getResolvedScopePath(parseScope(scopeStr));

      const graph = await loadGraph(basePath);
      const orphans = findOrphanedNodes(graph);

      // Calculate statistics
      const nodeCount = graph.nodes.length;
      const edgeCount = graph.edges.length;
      const orphanCount = orphans.length;
      const connectedCount = nodeCount - orphanCount;
      const connectivityRatio = nodeCount > 0 ? connectedCount / nodeCount : 1;
      const connectivity = Math.round(connectivityRatio * 100);
      const edgeToNodeRatio = nodeCount > 0 ? edgeCount / nodeCount : 0;
      const linkRatio = nodeCount > 0 ? edgeCount / nodeCount : 0;

      // Find hubs (nodes with high connectivity)
      const edgeCounts = new Map<string, number>();
      for (const edge of graph.edges) {
        edgeCounts.set(edge.source, (edgeCounts.get(edge.source) ?? 0) + 1);
        edgeCounts.set(edge.target, (edgeCounts.get(edge.target) ?? 0) + 1);
      }

      const hubs = [...edgeCounts.entries()]
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, _]) => id);

      // Find sinks (no outbound) and sources (no inbound)
      const outbound = new Set(graph.edges.map(e => e.source));
      const inbound = new Set(graph.edges.map(e => e.target));
      const allNodes = new Set(graph.nodes.map(n => n.id));

      const sinks = [...allNodes].filter(id => !outbound.has(id) && inbound.has(id));
      const sources = [...allNodes].filter(id => outbound.has(id) && !inbound.has(id));

      // Group by type
      const byType: Record<string, number> = {};
      for (const node of graph.nodes) {
        byType[node.type] = (byType[node.type] ?? 0) + 1;
      }

      // Calculate health score (0-100)
      // Based on connectivity and link ratio
      const healthScore = Math.round((connectivity * 0.6) + (Math.min(linkRatio * 100, 100) * 0.4));

      // Determine scope indicator
      const scopeIndicator = agentName ? `agent:${agentName}` : (scopeArg ?? 'project');

      // Placeholder for trends (historical data would be needed for real trends)
      const trends = {
        growth: 0,
        recentActivity: 0,
      };

      return {
        scope: scopeIndicator,
        nodes: nodeCount,
        totalNodes: nodeCount,
        totalEdges: edgeCount,
        orphans: orphanCount,
        connected: connectedCount,
        connectivity,
        connectivityRatio: Math.round(connectivityRatio * 100) / 100,
        linkRatio: Math.round(linkRatio * 100) / 100,
        edgeToNodeRatio: Math.round(edgeToNodeRatio * 100) / 100,
        hubs,
        sinks: sinks.slice(0, 10),
        sources: sources.slice(0, 10),
        byType,
        healthScore,
        trends,
      };
    },
    `Stats for ${scopeArg ?? 'project'} scope`
  );
}

/**
 * impact - Show what depends on a memory
 *
 * Usage: memory impact <id> [--depth <n>] [--json] [--scope <scope>] [--agent <name>]
 */
export async function cmdImpact(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Validate --include-shared flag
  const includeShared = getFlagBool(args.flags, 'include-shared');
  const validation = validateIncludeShared(includeShared, agentName);
  if (!validation.valid) {
    return error(validation.error!);
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? await resolveAgentScopePath(agentName, scopeStr)
    : await getResolvedScopePath(parseScope(scopeStr));

  return wrapOperation(
    async () => {
      const graph = (includeShared && agentName)
        ? await loadMergedGraph(await resolveSharedScopePaths(agentName, scopeStr))
        : await loadGraph(basePath);
      const impact = calculateImpact(graph, id);
      return {
        id,
        ...impact,
      };
    },
    `Impact analysis for ${id}`
  );
}
