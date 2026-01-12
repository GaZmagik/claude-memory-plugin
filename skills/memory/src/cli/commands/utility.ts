/**
 * CLI Commands: Utility Operations
 *
 * Handlers for rename, move, promote, archive, status commands.
 * Note: Most of these are stubs pending Phase 4 implementation.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ParsedArgs } from '../parser.js';
import { getFlagString } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope, MemoryType } from '../../types/enums.js';
import { loadGraph } from '../../graph/structure.js';
import { getScopePath } from '../../scope/resolver.js';
import { renameMemory } from '../../maintenance/rename.js';
import { moveMemory } from '../../maintenance/move.js';
import { promoteMemory } from '../../maintenance/promote.js';
import { archiveMemory } from '../../maintenance/archive.js';

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
  const basePath = getResolvedScopePath(scope);

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

  const sourceScope = parseScope(getFlagString(args.flags, 'scope'));
  const targetScope = parseScope(targetScopeStr);

  const sourceBasePath = getResolvedScopePath(sourceScope);
  const targetBasePath = getResolvedScopePath(targetScope);

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

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

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
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await archiveMemory({ id, basePath });
      return result;
    },
    `Archived ${id}`
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
      const projectPath = getResolvedScopePath(Scope.Project);
      const localPath = getResolvedScopePath(Scope.Local);

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
