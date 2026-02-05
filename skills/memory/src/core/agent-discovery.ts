/**
 * Agent Discovery Module (Phase E)
 *
 * Provides functionality to discover, list, and gather statistics about
 * agent-scoped memory storage across project and global scopes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Scope, MemoryType } from '../types/enums.js';
import type { AgentSummary, DiscoverAgentsRequest } from '../types/api.js';
import { loadIndex } from './index.js';

/**
 * Discovers all agents across project and global scopes
 *
 * @param request - Discovery options including paths and filters
 * @returns Array of agent summaries with metadata
 *
 * Priority order: project agents first, then global agents.
 * Duplicate agent names are deduplicated (project takes precedence).
 *
 * @example
 * ```typescript
 * const agents = await discoverAgents({
 *   projectRoot: '/home/user/project',
 *   globalRoot: '/home/user/.claude/memory',
 * });
 * // Returns: [{ name: 'typescript-expert', scope: 'agent-project', memoryCount: 45, ... }]
 * ```
 */
export async function discoverAgents(request: DiscoverAgentsRequest): Promise<AgentSummary[]> {
  const agents: AgentSummary[] = [];
  const seenNames = new Set<string>();

  // Define search paths with priority order: project first, then global
  const searchPaths: Array<{ scope: Scope.AgentProject | Scope.AgentGlobal; path: string }> = [
    { scope: Scope.AgentProject, path: path.join(request.projectRoot, '.claude', 'memory', 'agents') },
    { scope: Scope.AgentGlobal, path: path.join(request.globalRoot, 'agents') },
  ];

  // Filter by scope if requested
  const filteredPaths = request.scope
    ? searchPaths.filter((p) => p.scope === request.scope)
    : searchPaths;

  // Scan each path for agent directories
  for (const { scope, path: searchPath } of filteredPaths) {
    if (!fs.existsSync(searchPath)) continue;

    const entries = fs.readdirSync(searchPath, { withFileTypes: true });

    for (const entry of entries) {
      // Only process directories
      if (!entry.isDirectory()) continue;

      const agentName = entry.name;

      // Deduplication: first match wins (project takes precedence)
      if (seenNames.has(agentName)) continue;
      seenNames.add(agentName);

      const agentPath = path.join(searchPath, agentName);
      const summary = await getAgentSummary(agentPath, agentName, scope, request.includeStats);

      agents.push(summary);
    }
  }

  return agents;
}

/**
 * Gets detailed summary for a single agent
 *
 * @param agentPath - Absolute path to agent directory
 * @param agentName - Agent name
 * @param scope - Agent scope (AgentProject or AgentGlobal)
 * @param includeStats - Whether to include detailed statistics
 * @returns Agent summary with metadata
 *
 * @internal
 */
export async function getAgentSummary(
  agentPath: string,
  agentName: string,
  scope: Scope.AgentProject | Scope.AgentGlobal,
  includeStats?: boolean
): Promise<AgentSummary> {
  const summary: AgentSummary = {
    name: agentName,
    scope,
    memoryCount: 0,
  };

  // Load index.json for basic stats
  const indexPath = path.join(agentPath, 'index.json');
  if (!fs.existsSync(indexPath)) {
    return summary;
  }

  try {
    const index = await loadIndex({ basePath: agentPath });

    summary.memoryCount = index.memories.length;

    // Find most recent update timestamp
    const timestamps = index.memories
      .map((m) => new Date(m.updated).getTime())
      .filter((t) => !isNaN(t));

    if (timestamps.length > 0) {
      summary.lastUpdated = new Date(Math.max(...timestamps)).toISOString();
    }

    // Include detailed stats if requested
    if (includeStats && index.memories.length > 0) {
      // Memory type distribution
      const memoryTypes: Partial<Record<MemoryType, number>> = {};
      for (const memory of index.memories) {
        memoryTypes[memory.type] = (memoryTypes[memory.type] || 0) + 1;
      }
      summary.memoryTypes = memoryTypes as Record<MemoryType, number>;

      // Unique tags (sorted)
      const tagSet = new Set<string>();
      for (const memory of index.memories) {
        memory.tags.forEach((tag) => tagSet.add(tag));
      }
      summary.tags = Array.from(tagSet).sort();

      // TODO: Health stats from graph (future enhancement)
      // For now, we skip health metrics as they require graph.json parsing
      // which would be added in a future task if needed
    }
  } catch (error) {
    // If index loading fails, return basic summary with zero count
    // This handles corrupted index.json gracefully
  }

  return summary;
}
