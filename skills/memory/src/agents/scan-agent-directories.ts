/**
 * Agent Directory Scanning (Phase E - T116)
 *
 * Scans agent directories and gathers information about agents.
 */

import fsp from 'node:fs/promises';
import path from 'node:path';
import type { AgentInfo } from '../types/agent-info.js';
import { Scope } from '../types/enums.js';

/**
 * Options for scanning agent directories
 */
export interface ScanAgentOptions {
  /** Project root directory */
  projectRoot?: string;

  /** Global memory root directory */
  globalRoot?: string;

  /** Filter to specific scope */
  scope?: Scope.AgentProject | Scope.AgentGlobal;

  /** Include statistics (memory count, links, etc.) */
  includeStats?: boolean;

  /** Filter by agent name pattern (glob-style, e.g., "typescript-*") */
  namePattern?: string;
}

/**
 * Checks if a directory exists and is accessible
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await fsp.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Matches a name against a glob-style pattern
 */
function matchesPattern(name: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(name);
}

/**
 * Gathers statistics for an agent from its index and graph files
 */
async function gatherAgentStats(agentPath: string): Promise<Partial<AgentInfo>> {
  const stats: Partial<AgentInfo> = {};

  try {
    // Try to read index.json for memory information
    const indexPath = path.join(agentPath, 'index.json');
    const indexContent = await fsp.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexContent);

    // Count memories
    stats.memoryCount = Object.keys(index.memories || {}).length;

    // Gather unique tags
    const tagsSet = new Set<string>();
    const typesSet = new Set<string>();
    let oldestDate: Date | undefined;
    let newestDate: Date | undefined;

    for (const memory of Object.values(index.memories || {})) {
      const mem = memory as any;

      // Collect tags
      if (mem.tags) {
        for (const tag of mem.tags) {
          tagsSet.add(tag);
        }
      }

      // Collect types
      if (mem.type) {
        typesSet.add(mem.type);
      }

      // Track dates
      if (mem.created) {
        const createdDate = new Date(mem.created);
        if (!oldestDate || createdDate < oldestDate) {
          oldestDate = createdDate;
        }
      }

      if (mem.updated) {
        const updatedDate = new Date(mem.updated);
        if (!newestDate || updatedDate > newestDate) {
          newestDate = updatedDate;
        }
      }
    }

    stats.tags = Array.from(tagsSet);
    stats.types = Array.from(typesSet) as any[];
    stats.created = oldestDate;
    stats.updated = newestDate;

    // Try to read graph.json for link count
    const graphPath = path.join(agentPath, 'graph.json');
    const graphContent = await fsp.readFile(graphPath, 'utf-8');
    const graph = JSON.parse(graphContent);
    stats.linkCount = (graph.edges || []).length;
  } catch {
    // If we can't read stats, just return what we have
    // This allows the scan to continue even if some agents are incomplete
  }

  // Get directory timestamps as fallback
  try {
    const dirStats = await fsp.stat(agentPath);
    if (!stats.created) {
      stats.created = dirStats.birthtime;
    }
    if (!stats.updated) {
      stats.updated = dirStats.mtime;
    }
  } catch {
    // Ignore stat errors
  }

  return stats;
}

/**
 * Scans a single agent directory location
 */
async function scanLocation(
  agentsDir: string,
  scope: Scope.AgentProject | Scope.AgentGlobal,
  options: ScanAgentOptions
): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = [];

  try {
    // Check if directory exists
    if (!(await directoryExists(agentsDir))) {
      return agents;
    }

    // Read directory contents
    const entries = await fsp.readdir(agentsDir, { withFileTypes: true });

    // Process each entry
    for (const entry of entries) {
      // Skip non-directories
      if (!entry.isDirectory()) {
        continue;
      }

      // Apply name pattern filter
      if (options.namePattern && !matchesPattern(entry.name, options.namePattern)) {
        continue;
      }

      // Build agent info
      const agentPath = path.join(agentsDir, entry.name);

      try {
        // Check if agent directory is accessible
        await fsp.access(agentPath);

        const agentInfo: AgentInfo = {
          name: entry.name,
          scope,
          path: agentPath,
        };

        // Gather statistics if requested
        if (options.includeStats) {
          const stats = await gatherAgentStats(agentPath);
          Object.assign(agentInfo, stats);
        }

        agents.push(agentInfo);
      } catch {
        // Skip agents that can't be accessed
        continue;
      }
    }
  } catch {
    // Return empty array if we can't scan this location
    return agents;
  }

  return agents;
}

/**
 * Scans agent directories and gathers agent information
 *
 * @param options - Scan options
 * @returns Array of agent information objects, sorted alphabetically by name
 *
 * @example
 * // Scan project agents only
 * const projectAgents = await scanAgentDirectories({
 *   projectRoot: '/path/to/project',
 *   scope: Scope.AgentProject
 * });
 *
 * @example
 * // Scan all agents with statistics
 * const allAgents = await scanAgentDirectories({
 *   projectRoot: '/path/to/project',
 *   globalRoot: '/home/user/.claude/memory',
 *   includeStats: true
 * });
 */
export async function scanAgentDirectories(
  options: ScanAgentOptions
): Promise<AgentInfo[]> {
  const agents: AgentInfo[] = [];

  // Scan project agents
  if (options.projectRoot && (!options.scope || options.scope === Scope.AgentProject)) {
    const projectAgentsDir = path.join(options.projectRoot, '.claude', 'memory', 'agents');
    const projectAgents = await scanLocation(projectAgentsDir, Scope.AgentProject, options);
    agents.push(...projectAgents);
  }

  // Scan global agents
  if (options.globalRoot && (!options.scope || options.scope === Scope.AgentGlobal)) {
    const globalAgentsDir = path.join(options.globalRoot, 'agents');
    const globalAgents = await scanLocation(globalAgentsDir, Scope.AgentGlobal, options);
    agents.push(...globalAgents);
  }

  // Sort alphabetically by name
  agents.sort((a, b) => a.name.localeCompare(b.name));

  return agents;
}

/**
 * Retrieves detailed information for a specific agent
 *
 * @param agentName - Name of the agent
 * @param agentPath - Path to agent's directory
 * @returns Detailed agent information
 */
export async function getAgentInfo(
  agentName: string,
  agentPath: string
): Promise<AgentInfo> {
  // Determine scope from path
  const scope = agentPath.includes('/.claude/memory/agents/')
    ? Scope.AgentProject
    : Scope.AgentGlobal;

  const agentInfo: AgentInfo = {
    name: agentName,
    scope,
    path: agentPath,
  };

  // Gather statistics
  const stats = await gatherAgentStats(agentPath);
  Object.assign(agentInfo, stats);

  return agentInfo;
}
