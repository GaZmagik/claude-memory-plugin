/**
 * CLI Commands: Agent Discovery (Phase E)
 *
 * Handlers for agents list and agents stats commands.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { parseArgs, getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { discoverAgents } from '../../core/agent-discovery.js';
import { Scope } from '../../types/enums.js';
import { createAgent } from '../../maintenance/agent-operations/create.js';
import { deleteAgent } from '../../maintenance/agent-operations/delete.js';
import { copyAgent } from '../../maintenance/agent-operations/copy.js';
import { renameAgent } from '../../maintenance/agent-operations/rename.js';

/**
 * agents - Main dispatcher for agents subcommands
 *
 * Usage: memory agents <subcommand> [options]
 */
export async function cmdAgents(args: ParsedArgs): Promise<CliResponse> {
  const subcommand = args.positional[0];

  if (!subcommand) {
    return error('Missing subcommand. Use: list, stats, create, delete, copy, rename');
  }

  // Re-parse remaining args for subcommand
  const subArgs = parseArgs(args.positional.slice(1));
  // Merge flags from parent
  subArgs.flags = { ...args.flags, ...subArgs.flags };

  switch (subcommand) {
    case 'list':
      return cmdAgentsList(subArgs);
    case 'stats':
      return cmdAgentsStats(subArgs);
    case 'create':
      return cmdAgentsCreate(subArgs);
    case 'delete':
      return cmdAgentsDelete(subArgs);
    case 'copy':
      return cmdAgentsCopy(subArgs);
    case 'rename':
      return cmdAgentsRename(subArgs);
    default:
      return error(`Unknown agents subcommand: ${subcommand}`);
  }
}

/**
 * agents list - List all available agents across scopes
 *
 * Usage: memory agents list [--scope project|global] [--include-stats]
 */
export async function cmdAgentsList(args: ParsedArgs): Promise<CliResponse> {
  const scopeStr = getFlagString(args.flags, 'scope');
  const includeStats = getFlagBool(args.flags, 'include-stats');

  // Validate scope if provided
  let scope: Scope.AgentProject | Scope.AgentGlobal | undefined;
  if (scopeStr) {
    if (scopeStr === 'project') {
      scope = Scope.AgentProject;
    } else if (scopeStr === 'global') {
      scope = Scope.AgentGlobal;
    } else {
      return error(`Invalid scope for agents: ${scopeStr} (must be 'project' or 'global')`);
    }
  }

  return wrapOperation(
    async () => {
      const agents = await discoverAgents({
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
        includeStats,
        scope,
      });

      return {
        agents,
        count: agents.length,
        scopes: [...new Set(agents.map((a) => a.scope))],
      };
    },
    'Listed agents'
  );
}

/**
 * agents stats - Show detailed statistics for agent(s)
 *
 * Usage: memory agents stats <agent-name>
 *        memory agents stats --all
 */
export async function cmdAgentsStats(args: ParsedArgs): Promise<CliResponse> {
  const agentName = args.positional[0];
  const allAgents = getFlagBool(args.flags, 'all');

  // Validation: mutually exclusive flags
  if (allAgents && agentName) {
    return error('Cannot specify agent name with --all flag');
  }

  if (!allAgents && !agentName) {
    return error('Agent name required (or use --all)');
  }

  if (allAgents) {
    // Stats for all agents
    return wrapOperation(
      async () => {
        const agents = await discoverAgents({
          projectRoot: process.cwd(),
          globalRoot: getGlobalMemoryPath(),
          includeStats: true,
        });

        return { agents };
      },
      'Retrieved agent statistics'
    );
  }

  // Stats for single agent
  return wrapOperation(
    async () => {
      const agents = await discoverAgents({
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
        includeStats: true,
      });

      const agent = agents.find((a) => a.name === agentName);
      if (!agent) {
        throw new Error(`Agent not found: ${agentName}`);
      }

      return { agent };
    },
    `Retrieved statistics for ${agentName}`
  );
}

/**
 * agents create - Create a new agent
 *
 * Usage: memory agents create <agent-name> [--scope project|global] [--dry-run]
 */
export async function cmdAgentsCreate(args: ParsedArgs): Promise<CliResponse> {
  const agentName = args.positional[0];

  if (!agentName) {
    return error('Agent name required');
  }

  const scopeStr = getFlagString(args.flags, 'scope') || 'project';
  const dryRun = getFlagBool(args.flags, 'dry-run');

  // Validate scope
  let scope: Scope.AgentProject | Scope.AgentGlobal;
  if (scopeStr === 'project') {
    scope = Scope.AgentProject;
  } else if (scopeStr === 'global') {
    scope = Scope.AgentGlobal;
  } else {
    return error(`Invalid scope: ${scopeStr} (must be 'project' or 'global')`);
  }

  return wrapOperation(
    async () => {
      const result = await createAgent({
        name: agentName,
        scope,
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
        dryRun,
      });

      return result;
    },
    dryRun ? `Would create agent: ${agentName}` : `Created agent: ${agentName}`
  );
}

/**
 * agents delete - Delete an agent and all its memories
 *
 * Usage: memory agents delete <agent-name> [--scope project|global] [--force] [--dry-run]
 */
export async function cmdAgentsDelete(args: ParsedArgs): Promise<CliResponse> {
  const agentName = args.positional[0];

  if (!agentName) {
    return error('Agent name required');
  }

  const scopeStr = getFlagString(args.flags, 'scope') || 'project';
  const force = getFlagBool(args.flags, 'force');
  const dryRun = getFlagBool(args.flags, 'dry-run');

  // Validate scope
  let scope: Scope.AgentProject | Scope.AgentGlobal;
  if (scopeStr === 'project') {
    scope = Scope.AgentProject;
  } else if (scopeStr === 'global') {
    scope = Scope.AgentGlobal;
  } else {
    return error(`Invalid scope: ${scopeStr} (must be 'project' or 'global')`);
  }

  return wrapOperation(
    async () => {
      const result = await deleteAgent({
        name: agentName,
        scope,
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
        force,
        dryRun,
      });

      return result;
    },
    dryRun ? `Would delete agent: ${agentName}` : `Deleted agent: ${agentName}`
  );
}

/**
 * agents copy - Copy an agent to a new name
 *
 * Usage: memory agents copy <source> <target> [--scope project|global] [--force] [--dry-run]
 */
export async function cmdAgentsCopy(args: ParsedArgs): Promise<CliResponse> {
  const source = args.positional[0];
  const target = args.positional[1];

  if (!source || !target) {
    return error('Source and target agent names required');
  }

  const scopeStr = getFlagString(args.flags, 'scope') || 'project';
  const force = getFlagBool(args.flags, 'force');
  const dryRun = getFlagBool(args.flags, 'dry-run');

  // Validate scope
  let scope: Scope.AgentProject | Scope.AgentGlobal;
  if (scopeStr === 'project') {
    scope = Scope.AgentProject;
  } else if (scopeStr === 'global') {
    scope = Scope.AgentGlobal;
  } else {
    return error(`Invalid scope: ${scopeStr} (must be 'project' or 'global')`);
  }

  return wrapOperation(
    async () => {
      const result = await copyAgent({
        source,
        target,
        scope,
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
        force,
        dryRun,
      });

      return result;
    },
    dryRun ? `Would copy ${source} to ${target}` : `Copied ${source} to ${target}`
  );
}

/**
 * agents rename - Rename an agent
 *
 * Usage: memory agents rename <old-name> <new-name> [--scope project|global] [--dry-run]
 */
export async function cmdAgentsRename(args: ParsedArgs): Promise<CliResponse> {
  const oldName = args.positional[0];
  const newName = args.positional[1];

  if (!oldName || !newName) {
    return error('Old and new agent names required');
  }

  const scopeStr = getFlagString(args.flags, 'scope') || 'project';
  const dryRun = getFlagBool(args.flags, 'dry-run');

  // Validate scope
  let scope: Scope.AgentProject | Scope.AgentGlobal;
  if (scopeStr === 'project') {
    scope = Scope.AgentProject;
  } else if (scopeStr === 'global') {
    scope = Scope.AgentGlobal;
  } else {
    return error(`Invalid scope: ${scopeStr} (must be 'project' or 'global')`);
  }

  return wrapOperation(
    async () => {
      const result = await renameAgent({
        oldName,
        newName,
        scope,
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
        dryRun,
      });

      return result;
    },
    dryRun ? `Would rename ${oldName} to ${newName}` : `Renamed ${oldName} to ${newName}`
  );
}

/**
 * Helper to get global memory path
 */
function getGlobalMemoryPath(): string {
  return path.join(os.homedir(), '.claude', 'memory');
}
