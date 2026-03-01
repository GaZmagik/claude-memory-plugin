/**
 * CLI Commands: Utility Operations
 *
 * Handlers for rename, move, promote, archive, status commands.
 * Note: Most of these are stubs pending Phase 4 implementation.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool, getFlagNumber } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope } from '../../types/enums.js';
import { loadGraph } from '../../graph/structure.js';
import { renameMemory } from '../../maintenance/rename.js';
import { moveMemory } from '../../maintenance/move.js';
import { promoteMemory } from '../../maintenance/promote.js';
import { archiveMemory } from '../../maintenance/archive.js';
import { MemoryType } from '../../types/enums.js';
import { getResolvedScopePath, getGlobalMemoryPath, parseScope } from '../helpers.js';
import { discoverAgents } from '../../core/agent-discovery.js';
import { getAgentDirectoryPath } from '../../scope/get-agent-directory-path.js';
import { checkRelevance, formatTable, formatJson } from '../../maintenance/check-relevance.js';

/**
 * Find which scope a memory exists in
 * Searches all scopes and returns the first one where the memory is found
 */
async function findMemoryScope(id: string): Promise<{ scope: Scope; basePath: string } | null> {
  const scopesToSearch: Scope[] = [Scope.Project, Scope.Local, Scope.Global];

  for (const scope of scopesToSearch) {
    const basePath = await getResolvedScopePath(scope);
    const permanentPath = path.join(basePath, 'permanent', `${id}.md`);
    const temporaryPath = path.join(basePath, 'temporary', `${id}.md`);

    if (fs.existsSync(permanentPath) || fs.existsSync(temporaryPath)) {
      return { scope, basePath };
    }
  }

  return null;
}

/**
 * rename - Rename a memory ID (updates all references)
 *
 * Usage: memory rename <old> <new> [--scope <scope>]
 *
 * Renames a memory and updates all graph references.
 */
export async function cmdRename(args: ParsedArgs): Promise<CliResponse> {
  const oldId = args.positional[0];
  const newId = args.positional[1];

  if (!oldId || !newId) {
    return error('Missing required arguments: <old> <new>');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = await getResolvedScopePath(scope);

  // Read-only guard: Reject renames on external nodes (rule/reminder types)
  // Dynamic import to avoid circular dependency: core/index.js -> cli/helpers.js -> cli/commands
  const { loadIndex } = await import('../../core/index.js');
  const index = await loadIndex({ basePath });
  const existingEntry = index.memories.find(m => m.id === oldId);

  if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
    return error(`'${oldId}' is a read-only external node. Run 'memory sync' to refresh it.`);
  }

  return wrapOperation(
    async () => {
      const result = await renameMemory({ oldId, newId, basePath });
      return result;
    },
    `Renamed ${oldId} to ${newId}`
  );
}

/**
 * move - Move memory between scopes
 *
 * Usage: memory move <id> <target-scope> [--scope <source-scope>]
 *
 * Moves a memory from one scope to another.
 * If --scope is not provided, auto-detects which scope the memory is in.
 */
export async function cmdMove(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];
  const targetScopeStr = args.positional[1];

  if (!id) {
    return error('Missing required argument: id');
  }

  if (!targetScopeStr) {
    return error('Missing required argument: target scope');
  }

  const targetScope = parseScope(targetScopeStr);
  const targetBasePath = await getResolvedScopePath(targetScope);

  // Read-only guard: Check all scopes for external nodes BEFORE file lookup
  // Dynamic import to avoid circular dependency: core/index.js -> cli/helpers.js -> cli/commands
  const { loadIndex } = await import('../../core/index.js');

  // Check all scopes for external nodes (which don't have files on disk)
  for (const checkScope of [Scope.Project, Scope.Local, Scope.Global]) {
    const checkBasePath = await getResolvedScopePath(checkScope);
    try {
      const index = await loadIndex({ basePath: checkBasePath });
      const existingEntry = index.memories.find(m => m.id === id);
      if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
        return error(`'${id}' is a read-only external node. Run 'memory sync' to refresh it.`);
      }
    } catch {
      // Index doesn't exist in this scope, continue
    }
  }

  // Also check agent scope indices (reminder nodes can live in AgentProject/AgentGlobal scopes)
  try {
    const agents = await discoverAgents({ projectRoot: process.cwd(), globalRoot: getGlobalMemoryPath() });
    for (const agent of agents) {
      const agentPath = getAgentDirectoryPath({
        scope: agent.scope,
        agentName: agent.name,
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
      });
      try {
        const index = await loadIndex({ basePath: agentPath });
        const existingEntry = index.memories.find(m => m.id === id);
        if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
          return error(`'${id}' is a read-only external node. Run 'memory sync' to refresh it.`);
        }
      } catch {
        // Index doesn't exist for this agent, continue
      }
    }
  } catch {
    // Agent discovery failed, continue
  }

  // If --scope is explicitly provided, use it; otherwise auto-detect
  const explicitScope = getFlagString(args.flags, 'scope');
  let sourceBasePath: string;

  if (explicitScope) {
    sourceBasePath = await getResolvedScopePath(parseScope(explicitScope));
  } else {
    // Auto-detect which scope the memory is in
    const found = await findMemoryScope(id);
    if (!found) {
      return error(`Memory not found in any scope: ${id}`);
    }
    sourceBasePath = found.basePath;
  }

  return wrapOperation(
    async () => {
      const result = await moveMemory({
        id,
        sourceBasePath,
        targetBasePath,
        targetScope,
      });
      return result;
    },
    `Moved ${id} to ${targetScopeStr}`
  );
}

/**
 * promote - Convert memory type (e.g., learning -> gotcha)
 *
 * Usage: memory promote <id> <type> [--scope <scope>]
 *
 * Changes a memory's type (e.g., learning -> gotcha).
 * Also used for demoting (gotcha -> learning).
 */
export async function cmdPromote(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];
  const targetTypeStr = args.positional[1];

  if (!id) {
    return error('Missing required argument: id');
  }

  if (!targetTypeStr) {
    return error('Missing required argument: target type');
  }

  // Validate target type
  const validTypes = ['decision', 'learning', 'artifact', 'gotcha', 'breadcrumb', 'hub'];
  if (!validTypes.includes(targetTypeStr.toLowerCase())) {
    return error(`Invalid type: ${targetTypeStr}. Valid types: ${validTypes.join(', ')}`);
  }

  // Read-only guard: Check all scopes for external nodes BEFORE proceeding
  // Dynamic import to avoid circular dependency: core/index.js -> cli/helpers.js -> cli/commands
  const { loadIndex } = await import('../../core/index.js');

  for (const checkScope of [Scope.Project, Scope.Local, Scope.Global]) {
    const checkBasePath = await getResolvedScopePath(checkScope);
    try {
      const index = await loadIndex({ basePath: checkBasePath });
      const existingEntry = index.memories.find(m => m.id === id);
      if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
        return error(`'${id}' is a read-only external node. Run 'memory sync' to refresh it.`);
      }
    } catch {
      // Index doesn't exist in this scope, continue
    }
  }

  // Also check agent scope indices (reminder nodes can live in AgentProject/AgentGlobal scopes)
  try {
    const agents = await discoverAgents({ projectRoot: process.cwd(), globalRoot: getGlobalMemoryPath() });
    for (const agent of agents) {
      const agentPath = getAgentDirectoryPath({
        scope: agent.scope,
        agentName: agent.name,
        projectRoot: process.cwd(),
        globalRoot: getGlobalMemoryPath(),
      });
      try {
        const index = await loadIndex({ basePath: agentPath });
        const existingEntry = index.memories.find(m => m.id === id);
        if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
          return error(`'${id}' is a read-only external node. Run 'memory sync' to refresh it.`);
        }
      } catch {
        // Index doesn't exist for this agent, continue
      }
    }
  } catch {
    // Agent discovery failed, continue
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = await getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await promoteMemory({
        id,
        targetType: targetTypeStr.toLowerCase() as MemoryType,
        basePath,
      });
      return result;
    },
    `Changed ${id} to type ${targetTypeStr}`
  );
}

/**
 * archive - Archive a memory
 *
 * Usage: memory archive <id> [--scope <scope>]
 *
 * Archives a memory by moving it to archive/ directory
 * and removing it from the active graph and index.
 */
export async function cmdArchive(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = await getResolvedScopePath(scope);

  // Read-only guard: Reject archives on external nodes (rule/reminder types)
  // Dynamic import to avoid circular dependency: core/index.js -> cli/helpers.js -> cli/commands
  const { loadIndex } = await import('../../core/index.js');
  const index = await loadIndex({ basePath });
  const existingEntry = index.memories.find(m => m.id === id);

  if (existingEntry && (existingEntry.type === MemoryType.Rule || existingEntry.type === MemoryType.Reminder)) {
    return error(`'${id}' is a read-only external node. Run 'memory sync' to refresh it.`);
  }

  return wrapOperation(
    async () => {
      const result = await archiveMemory({ id, basePath });
      return result;
    },
    `Archived ${id}`
  );
}

// Embedded settings template - works anywhere without needing example file
const SETTINGS_TEMPLATE = `---
# Memory Plugin Settings
# =======================
# This file customises the memory plugin behaviour for this project.
# All settings are optional - the plugin works without this file.
# Without Ollama, the plugin still functions (just without semantic search).

enabled: true

# Ollama Configuration
# --------------------
# The plugin uses Ollama for semantic search and AI-assisted features.
# If Ollama is not available, the plugin degrades gracefully.

ollama_host: http://localhost:11434
chat_model: gemma3:4b
embedding_model: embeddinggemma:latest
context_window: 16384

# Advanced Settings (optional)
# ----------------------------
# Uncomment to override defaults:

# health_threshold: 0.7
# semantic_threshold: 0.45
# auto_sync: false

# Duplicate Detection (LSH)
# -------------------------
# Settings for finding similar/duplicate memories.

# duplicate_threshold: 0.92
# lsh_collection_threshold: 200
# lsh_hash_bits: 10
# lsh_tables: 6
---

# Memory Plugin Configuration

Settings reference: https://github.com/GaZmagik/claude-memory-plugin#ollama-integration

## Model Selection

Chat models (for summaries, topic extraction):
- \`gemma3:4b\` - Fast, good quality (default)
- \`gemma3:12b\` - Higher quality, slower
- \`llama3.2\` - Meta's Llama model

Embedding models (for semantic search):
- \`embeddinggemma:latest\` - Google's embedding model (default)
- \`nomic-embed-text\` - Nomic AI's embedding model

## Without Ollama

The plugin works without Ollama. Semantic search and AI summaries will be
disabled, but core functionality (memory storage, graph, keyword search)
remains available.
`;

/**
 * setup - Create local settings file from embedded template
 *
 * Usage: memory setup [--force]
 *
 * Creates .claude/memory.local.md with default settings.
 * Also ensures .claude/*.local.md is in .gitignore.
 */
export async function cmdSetup(args: ParsedArgs): Promise<CliResponse> {
  const force = args.flags.force === true;
  const cwd = process.cwd();
  const claudeDir = path.join(cwd, '.claude');
  const localPath = path.join(claudeDir, 'memory.local.md');
  const gitignorePath = path.join(cwd, '.gitignore');

  return wrapOperation(
    async () => {
      // Check if .claude directory exists
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }

      // Check if local file already exists
      if (fs.existsSync(localPath) && !force) {
        return {
          status: 'error' as const,
          error: `Settings file already exists: ${localPath}\nUse --force to overwrite.`,
        };
      }

      // Write embedded template to local
      fs.writeFileSync(localPath, SETTINGS_TEMPLATE, 'utf-8');

      // Ensure .gitignore has the pattern
      let gitignoreUpdated = false;
      const localPattern = '.claude/*.local.md';

      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
        if (!gitignoreContent.includes(localPattern)) {
          fs.appendFileSync(gitignorePath, `\n# Memory plugin local settings\n${localPattern}\n`);
          gitignoreUpdated = true;
        }
      } else {
        fs.writeFileSync(gitignorePath, `# Memory plugin local settings\n${localPattern}\n`);
        gitignoreUpdated = true;
      }

      return {
        created: localPath,
        gitignore_updated: gitignoreUpdated,
        message: gitignoreUpdated
          ? `Created ${localPath} and updated .gitignore`
          : `Created ${localPath} (.gitignore already configured)`,
      };
    },
    'Settings file created'
  );
}

/**
 * status - Show memory system status
 *
 * Usage: memory status
 */
export async function cmdStatus(args: ParsedArgs): Promise<CliResponse> {
  void args; // Not used currently

  const cwd = process.cwd();
  const globalPath = getGlobalMemoryPath();

  return wrapOperation(
    async () => {
      const projectPath = await getResolvedScopePath(Scope.Project);
      const localPath = await getResolvedScopePath(Scope.Local);

      // Count memories in each scope
      const countMemories = async (basePath: string) => {
        const permanentDir = path.join(basePath, 'permanent');
        const temporaryDir = path.join(basePath, 'temporary');

        let permanent = 0;
        let temporary = 0;
        let edges = 0;

        try {
          if (fs.existsSync(permanentDir)) {
            permanent = fs.readdirSync(permanentDir).filter(f => f.endsWith('.md')).length;
          }
        } catch {
          // Directory doesn't exist
        }

        try {
          if (fs.existsSync(temporaryDir)) {
            temporary = fs.readdirSync(temporaryDir).filter(f => f.endsWith('.md')).length;
          }
        } catch {
          // Directory doesn't exist
        }

        try {
          const graph = await loadGraph(basePath);
          edges = graph.edges.length;
        } catch {
          // Graph doesn't exist
        }

        return { permanent, temporary, edges, dir: basePath };
      };

      const [projectStats, localStats, globalStats] = await Promise.all([
        countMemories(projectPath),
        countMemories(localPath),
        countMemories(globalPath),
      ]);

      return {
        cwd,
        project: projectStats,
        local: localStats,
        global: globalStats,
        total_memories:
          projectStats.permanent +
          projectStats.temporary +
          localStats.permanent +
          localStats.temporary +
          globalStats.permanent +
          globalStats.temporary,
        total_edges: projectStats.edges + localStats.edges + globalStats.edges,
      };
    },
    'Status retrieved'
  );
}

/**
 * check-relevance - Analyse memories for scope optimisation
 *
 * Usage: memory check-relevance [scope] [--type <type>] [--agent <name>]
 *        [--threshold <n>] [--auto-move] [--confirm] [--dry-run]
 *        [--format table|json|detailed]
 */
export async function cmdCheckRelevance(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scopeStr = scopeArg ?? getFlagString(args.flags, 'scope');
  const basePath = await getResolvedScopePath(parseScope(scopeStr));

  const typeStr = getFlagString(args.flags, 'type');
  const agentFilter = getFlagString(args.flags, 'agent');
  const threshold = getFlagNumber(args.flags, 'threshold');
  const autoMove = getFlagBool(args.flags, 'auto-move');
  const confirm = getFlagBool(args.flags, 'confirm');
  const dryRun = getFlagBool(args.flags, 'dry-run');
  const formatStr = getFlagString(args.flags, 'format') ?? 'table';
  const validFormats = ['table', 'json', 'detailed'] as const;
  if (!validFormats.includes(formatStr as typeof validFormats[number])) {
    return { status: 'error', error: `Invalid format '${formatStr}'. Valid formats: ${validFormats.join(', ')}` };
  }
  const format = formatStr as 'table' | 'json' | 'detailed';

  if (typeStr && !Object.values(MemoryType).includes(typeStr as MemoryType)) {
    const validTypes = Object.values(MemoryType).join(', ');
    return { status: 'error', error: `Invalid type '${typeStr}'. Valid types: ${validTypes}` };
  }
  const typeFilter = typeStr ? (typeStr as MemoryType) : undefined;

  return wrapOperation(
    async () => {
      const result = await checkRelevance({
        basePath,
        typeFilter,
        agentFilter: agentFilter ?? undefined,
        threshold: threshold ?? undefined,
        autoMove,
        confirm,
        dryRun,
        format,
      });

      const formatted = format === 'json'
        ? formatJson(result.results)
        : formatTable(result.results);

      return { ...result, formatted };
    },
    dryRun ? 'Dry run complete' : 'Relevance check complete'
  );
}
