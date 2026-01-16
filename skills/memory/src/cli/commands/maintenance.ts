/**
 * CLI Commands: Maintenance Operations
 *
 * Handlers for sync, repair, rebuild, reindex, prune, sync-frontmatter commands.
 * Note: Most of these are stubs pending Phase 3 implementation.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { getFlagString } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { Scope } from '../../types/enums.js';
import { rebuildIndex } from '../../core/index.js';
import { getScopePath } from '../../scope/resolver.js';
import { pruneMemories } from '../../maintenance/prune.js';
import { syncMemories } from '../../maintenance/sync.js';
import { reindexMemory } from '../../maintenance/reindex.js';
import { syncFrontmatter } from '../../maintenance/sync-frontmatter.js';
import { refreshFrontmatter } from '../../maintenance/refresh-frontmatter.js';
import { checkHealth } from '../../quality/health.js';
import { createOllamaProvider, batchGenerateEmbeddings } from '../../search/embedding.js';
import { loadIndex } from '../../core/index.js';
import { readMemory } from '../../core/read.js';

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
 * sync - Synchronise graph, index, and disk
 *
 * Usage: memory sync [scope] [--dry-run]
 */
export async function cmdSync(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const dryRun = args.flags['dry-run'] === true;

  return wrapOperation(
    async () => {
      const result = await syncMemories({
        basePath,
        dryRun,
      });
      return result;
    },
    dryRun ? 'Sync dry run complete' : 'Sync complete'
  );
}

/**
 * repair - Run sync then validate (health check)
 *
 * Usage: memory repair [scope] [--dry-run]
 */
export async function cmdRepair(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const dryRun = args.flags['dry-run'] === true;

  return wrapOperation(
    async () => {
      // Step 1: Sync
      const syncResult = await syncMemories({ basePath, dryRun });

      // Step 2: Health check (validate)
      const healthResult = await checkHealth({ basePath });

      return {
        sync: syncResult,
        health: healthResult,
        repaired: !dryRun,
      };
    },
    dryRun ? 'Repair dry run complete' : 'Repair complete'
  );
}

/**
 * rebuild - Rebuild graph and index from disk
 *
 * Usage: memory rebuild [scope]
 */
export async function cmdRebuild(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await rebuildIndex({ basePath });
      return result;
    },
    `Rebuilt index for ${scopeArg ?? 'project'} scope`
  );
}

/**
 * reindex - Re-index an orphan file
 *
 * Usage: memory reindex <id> [--scope <scope>]
 *
 * Re-adds a memory file to the index and graph.
 * Use when a file exists on disk but is missing from index.json/graph.json.
 */
export async function cmdReindex(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const result = await reindexMemory({ id, basePath });
      return result;
    },
    `Reindexed ${id}`
  );
}

/**
 * prune - Remove expired temporary memories
 *
 * Usage: memory prune [--scope <scope>] [--ttl <days>] [--concluded-ttl <days>] [--dry-run]
 *
 * Default TTL is 7 days for temporary memories, 1 day for concluded think docs.
 */
export async function cmdPrune(args: ParsedArgs): Promise<CliResponse> {
  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const ttlDays = args.flags.ttl ? Number(args.flags.ttl) : undefined;
  const concludedTtlDays = args.flags['concluded-ttl'] ? Number(args.flags['concluded-ttl']) : undefined;
  const dryRun = args.flags['dry-run'] === true;

  return wrapOperation(
    async () => {
      const result = await pruneMemories({
        basePath,
        ttlDays,
        concludedTtlDays,
        dryRun,
      });
      return result;
    },
    dryRun ? 'Prune dry run complete' : 'Prune complete'
  );
}

/**
 * sync-frontmatter - Bulk sync frontmatter from graph.json
 *
 * Usage: memory sync-frontmatter [scope] [--dry-run]
 *
 * Updates YAML frontmatter in memory files to match graph state.
 * Specifically syncs links from graph edges to frontmatter.
 */
export async function cmdSyncFrontmatter(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const dryRun = args.flags['dry-run'] === true;

  return wrapOperation(
    async () => {
      const result = await syncFrontmatter({ basePath, dryRun });
      return result;
    },
    dryRun ? 'Sync frontmatter dry run complete' : 'Sync frontmatter complete'
  );
}

/**
 * refresh - Backfill missing frontmatter fields and migrate legacy data
 *
 * Usage: memory refresh [scope] [--dry-run] [--project <name>] [--id <id>]
 *
 * Updates memory files to include:
 * - id: Memory ID (from filename)
 * - project: Project name (from git repo or directory)
 *
 * Also migrates legacy embedding hashes from frontmatter to embeddings.json.
 */
export async function cmdRefresh(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);
  const dryRun = args.flags['dry-run'] === true;
  const project = getFlagString(args.flags, 'project');
  const idFlag = getFlagString(args.flags, 'id');
  const ids = idFlag ? [idFlag] : undefined;
  const generateEmbeddings = args.flags['embeddings'] === true;

  return wrapOperation(
    async () => {
      // First run frontmatter refresh
      const result = await refreshFrontmatter({
        basePath,
        dryRun,
        project,
        ids,
      });

      // If --embeddings flag, generate embeddings for all memories
      if (generateEmbeddings && !dryRun) {
        const index = await loadIndex({ basePath });
        const provider = createOllamaProvider();

        // Build memory list for embedding
        const memoriesToEmbed: Array<{ id: string; content: string; hash?: string }> = [];
        for (const entry of index.memories) {
          // Skip if filtering by IDs and this one isn't included
          if (ids && !ids.includes(entry.id)) continue;

          // Skip temporary memories (thoughts) - they're ephemeral and often too large
          if (entry.id.startsWith('thought-') || entry.relativePath?.includes('temporary/')) continue;

          const memoryResult = await readMemory({ id: entry.id, basePath });
          if (memoryResult.status === 'success' && memoryResult.memory?.content) {
            memoriesToEmbed.push({
              id: entry.id,
              content: memoryResult.memory.content,
            });
          }
        }

        // Generate embeddings
        const embeddingResults = await batchGenerateEmbeddings(
          memoriesToEmbed,
          basePath,
          provider
        );

        return {
          ...result,
          embeddingsGenerated: embeddingResults.filter(r => !r.fromCache).length,
          embeddingsCached: embeddingResults.filter(r => r.fromCache).length,
          embeddingsTotal: embeddingResults.length,
        };
      }

      return result;
    },
    dryRun ? 'Refresh frontmatter dry run complete' : 'Refresh frontmatter complete'
  );
}
