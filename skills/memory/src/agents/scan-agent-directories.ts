/**
 * Agent Directory Scanning (Phase E - T116)
 *
 * Scans agent directories and gathers information about agents.
 */

import fsp from 'node:fs/promises';
import os from 'node:os';
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
 * Processes a single agent entry and returns AgentInfo or null if inaccessible
 */
async function processAgentEntry(
  entry: { name: string; isDirectory: () => boolean },
  agentsDir: string,
  scope: Scope.AgentProject | Scope.AgentGlobal,
  options: ScanAgentOptions
): Promise<AgentInfo | null> {
  // Skip non-directories
  if (!entry.isDirectory()) {
    return null;
  }

  // Apply name pattern filter
  if (options.namePattern && !matchesPattern(entry.name, options.namePattern)) {
    return null;
  }

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

    return agentInfo;
  } catch {
    // Skip agents that can't be accessed
    return null;
  }
}

/**
 * Scans a single agent directory location
 */
async function scanLocation(
  agentsDir: string,
  scope: Scope.AgentProject | Scope.AgentGlobal,
  options: ScanAgentOptions
): Promise<AgentInfo[]> {
  try {
    // Check if directory exists
    if (!(await directoryExists(agentsDir))) {
      return [];
    }

    // Read directory contents
    const entries = await fsp.readdir(agentsDir, { withFileTypes: true });

    // Process entries in parallel
    const results = await Promise.all(
      entries.map(entry => processAgentEntry(entry, agentsDir, scope, options))
    );

    // Filter out null results (inaccessible or non-matching entries)
    return results.filter((agent): agent is AgentInfo => agent !== null);
  } catch {
    // Return empty array if we can't scan this location
    return [];
  }
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
  // Build list of scan promises for parallel execution
  const scanPromises: Promise<AgentInfo[]>[] = [];

  // Scan project agents
  if (options.projectRoot && (!options.scope || options.scope === Scope.AgentProject)) {
    const projectAgentsDir = path.join(options.projectRoot, '.claude', 'memory', 'agents');
    scanPromises.push(scanLocation(projectAgentsDir, Scope.AgentProject, options));
  }

  // Scan global agents
  if (options.globalRoot && (!options.scope || options.scope === Scope.AgentGlobal)) {
    const globalAgentsDir = path.join(options.globalRoot, 'agents');
    scanPromises.push(scanLocation(globalAgentsDir, Scope.AgentGlobal, options));
  }

  // Execute all scans in parallel and flatten results
  const results = await Promise.all(scanPromises);
  const agents = results.flat();

  // Sort alphabetically by name
  agents.sort((a, b) => a.name.localeCompare(b.name));

  return agents;
}

/**
 * Retrieves detailed information for a specific agent.
 *
 * This function gathers comprehensive information about an agent including:
 * - Basic metadata (name, scope, path)
 * - Memory count from the agent's index
 * - Link count from the agent's graph
 * - Tags and types used across all memories
 * - Creation and last update timestamps
 *
 * The scope is automatically determined by checking if the agent path
 * is under the global agents directory (`~/.claude/memory/agents/`) or
 * a project-specific location.
 *
 * @param agentName - The name of the agent to retrieve information for
 * @param agentPath - The absolute filesystem path to the agent's directory
 *
 * @returns A promise resolving to {@link AgentInfo} containing:
 *   - `name` - The agent name
 *   - `scope` - Either AgentGlobal or AgentProject
 *   - `path` - The agent directory path
 *   - `memoryCount` - Number of memories (if index.json readable)
 *   - `linkCount` - Number of graph edges (if graph.json readable)
 *   - `tags` - Array of unique tags across all memories
 *   - `types` - Array of unique memory types
 *   - `created` - Oldest memory creation date or directory birthtime
 *   - `updated` - Most recent memory update date or directory mtime
 *
 * @throws {Error} When the agent directory does not exist or is not accessible
 * @throws {Error} When filesystem stat operations fail due to permissions
 *
 * @example
 * const info = await getAgentInfo(
 *   'typescript-expert',
 *   '/home/user/project/.claude/memory/agents/typescript-expert'
 * );
 * console.log(`Agent has ${info.memoryCount} memories and ${info.linkCount} links`);
 */
export async function getAgentInfo(
  agentName: string,
  agentPath: string
): Promise<AgentInfo> {
  // Determine scope from path
  // Global agents are under ~/.claude/memory/agents/
  // Project agents are under /project/.claude/memory/agents/
  const globalAgentsBase = path.join(os.homedir(), '.claude', 'memory', 'agents');
  const scope = agentPath.startsWith(globalAgentsBase)
    ? Scope.AgentGlobal
    : Scope.AgentProject;

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
