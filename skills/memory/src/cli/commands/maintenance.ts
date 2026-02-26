/**
 * CLI Commands: Maintenance Operations
 *
 * Handlers for sync, repair, rebuild, reindex, prune, sync-frontmatter commands.
 * Note: Most of these are stubs pending Phase 3 implementation.
 */

import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { rebuildIndex } from '../../core/index.js';
import { pruneMemories } from '../../maintenance/prune.js';
import { syncMemories } from '../../maintenance/sync.js';
import { reindexMemory } from '../../maintenance/reindex.js';
import { syncFrontmatter } from '../../maintenance/sync-frontmatter.js';
import { refreshFrontmatter } from '../../maintenance/refresh-frontmatter/index.js';
import { checkHealth } from '../../quality/health.js';
import { createOllamaProvider, batchGenerateEmbeddings } from '../../search/embedding.js';
import { loadIndex, saveIndex } from '../../core/index.js';
import { readMemory } from '../../core/read.js';
import { getResolvedScopePath, parseScope, resolveAgentScopePath } from '../helpers.js';
import { discoverExternalFiles, indexExternalFiles } from '../../external/index.js';
import { loadGraph, saveGraph } from '../../graph/structure.js';
import { scoreEdges } from '../../graph/score-edges.js';
import { findGitRoot } from '../../scope/git-utils.js';
import * as path from 'node:path';
import * as os from 'node:os';
import { ProgressReporter } from '../progress.js';

/**
 * sync - Synchronise graph, index, and disk
 *
 * Usage: memory sync [scope] [--dry-run] [--agent <name>]
 */
export async function cmdSync(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = scopeArg ?? getFlagString(args.flags, 'scope');

  // Validate --include-shared flag (write operations are single-scope only)
  const includeShared = getFlagBool(args.flags, 'include-shared');
  if (includeShared) {
    return error('Error: write operations are single-scope only. Remove --include-shared flag.');
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  const dryRun = args.flags['dry-run'] === true;

  return wrapOperation(
    async () => {
      const progress = new ProgressReporter({ operation: 'Syncing memories' });
      const result = await syncMemories({
        basePath,
        dryRun,
        agent: agentName,
        onProgress: (phase, current, total) => {
          progress.setTotal(total);
          progress.update(current, `${phase}`);
        },
      });
      progress.complete(
        `Sync: ${result.changes.addedToGraph.length} added, ${result.changes.removedGhostNodes.length} ghosts removed`
      );
      return result;
    },
    dryRun ? 'Sync dry run complete' : 'Sync complete'
  );
}

/**
 * repair - Run sync then validate (health check)
 *
 * Usage: memory repair [scope] [--dry-run] [--agent <name>]
 */
export async function cmdRepair(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = scopeArg ?? getFlagString(args.flags, 'scope');

  // Validate --include-shared flag (write operations are single-scope only)
  const includeShared = getFlagBool(args.flags, 'include-shared');
  if (includeShared) {
    return error('Error: write operations are single-scope only. Remove --include-shared flag.');
  }

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  const dryRun = args.flags['dry-run'] === true;

  return wrapOperation(
    async () => {
      // Step 1: Sync
      const syncProgress = new ProgressReporter({ operation: 'Repairing: syncing' });
      const syncResult = await syncMemories({
        basePath,
        dryRun,
        agent: agentName,
        onProgress: (phase, current, total) => {
          syncProgress.setTotal(total);
          syncProgress.update(current, phase);
        },
      });
      syncProgress.complete('Sync phase complete');

      // Step 2: Health check (validate)
      const healthProgress = new ProgressReporter({ operation: 'Repairing: health check' });
      const healthResult = await checkHealth({ basePath, agent: agentName });
      healthProgress.complete('Health check complete');

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
 *        [--embeddings] [--score-edges [--verify] [--apply] [--force]]
 *
 * Updates memory files to include:
 * - id: Memory ID (from filename)
 * - project: Project name (from git repo or directory)
 *
 * Also migrates legacy embedding hashes from frontmatter to embeddings.json.
 *
 * Flags:
 * --embeddings   Generate/update embeddings for all memories (requires Ollama)
 * --score-edges  Batch-compute cosine similarity for all graph edges
 * --verify       (with --score-edges) Ask Ollama to suggest a relation label → verifiedRelation
 * --apply        (with --score-edges) Promote verifiedRelation → label on all embeddable edges
 * --force        (with --score-edges) Re-score edges that already have similarity set
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
  const scoreEdgesFlag = args.flags['score-edges'] === true;
  const verifyEdges = args.flags['verify'] === true;
  const applyEdges = args.flags['apply'] === true;
  const forceFlag = args.flags['force'] === true;

  return wrapOperation(
    async () => {
      // First run frontmatter refresh
      const refreshProgress = new ProgressReporter({
        operation: 'Refreshing frontmatter',
      });
      const result = await refreshFrontmatter({
        basePath,
        dryRun,
        project,
        ids,
        onProgress: refreshProgress.toCallback(),
      });
      refreshProgress.complete(
        `Frontmatter refresh: ${result.updated} updated, ${result.skipped} skipped`
      );

      let combinedResult: Record<string, unknown> = { ...result };

      // If --embeddings flag, generate embeddings for all memories
      if (generateEmbeddings && !dryRun) {
        const index = await loadIndex({ basePath });
        const provider = createOllamaProvider();

        // Pre-filter to only eligible memories (exclude thoughts, temporaries, and non-matching IDs)
        const eligibleMemories = index.memories.filter(entry => {
          if (!entry) return false;
          if (ids && !ids.includes(entry.id)) return false;
          if (entry.id.startsWith('thought-') || entry.relativePath?.includes('temporary/')) return false;
          return true;
        });

        // Build memory list for embedding
        const collectProgress = new ProgressReporter({
          operation: 'Collecting memories for embedding',
          total: eligibleMemories.length,
        });
        const memoriesToEmbed: Array<{ id: string; content: string; hash?: string }> = [];
        for (let i = 0; i < eligibleMemories.length; i++) {
          const entry = eligibleMemories[i]!;

          collectProgress.update(i + 1, entry.id);

          const memoryResult = await readMemory({ id: entry.id, basePath });
          if (memoryResult.status === 'success' && memoryResult.memory?.content) {
            memoriesToEmbed.push({
              id: entry.id,
              content: memoryResult.memory.content,
            });
          }
        }
        collectProgress.complete(
          `Found ${memoriesToEmbed.length} memories to embed`
        );

        // Generate embeddings with progress reporting
        const embedProgress = new ProgressReporter({
          operation: 'Generating embeddings',
          total: memoriesToEmbed.length,
        });
        const embeddingResults = await batchGenerateEmbeddings(
          memoriesToEmbed,
          basePath,
          provider,
          embedProgress.toCallback()
        );
        const generated = embeddingResults.filter(r => !r.fromCache).length;
        const cached = embeddingResults.filter(r => r.fromCache).length;
        embedProgress.complete(
          `Embeddings: ${generated} generated, ${cached} cached`
        );

        combinedResult = {
          ...combinedResult,
          embeddingsGenerated: generated,
          embeddingsCached: cached,
          embeddingsTotal: embeddingResults.length,
        };
      }

      if (scoreEdgesFlag) {
        const scoreProgress = new ProgressReporter({
          operation: verifyEdges ? 'Scoring and verifying edges' : 'Scoring edges',
        });
        const scoreResult = await scoreEdges({
          basePath,
          dryRun,
          verify: verifyEdges,
          apply: applyEdges,
          force: forceFlag,
          onProgress: scoreProgress.toCallback(),
        });
        if (scoreResult.status === 'error') {
          scoreProgress.complete(`Score-edges failed: ${scoreResult.error}`);
          throw new Error(scoreResult.error ?? 'score-edges failed');
        }
        scoreProgress.complete(
          `Edges: ${scoreResult.scored} scored, ${scoreResult.skipped} skipped, ${scoreResult.noEmbedding} no embedding`
        );
        combinedResult = {
          ...combinedResult,
          edgesScored: scoreResult.scored,
          edgesSkipped: scoreResult.skipped,
          edgesNoEmbedding: scoreResult.noEmbedding,
          edgesVerified: scoreResult.verified,
          edgesApplied: scoreResult.applied,
        };
      }

      return combinedResult;
    },
    dryRun ? 'Refresh frontmatter dry run complete' : 'Refresh frontmatter complete'
  );
}

/**
 * index-context - Index external context files (CLAUDE.md, agent MEMORY.md)
 *
 * Usage: memory index-context [scope] [--dry-run] [--agent <name>]
 */
export async function cmdIndexContext(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];

  // Extract agent name if provided
  const agentName = getFlagString(args.flags, 'agent');
  const scopeStr = scopeArg ?? getFlagString(args.flags, 'scope');

  // Choose helper based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  const dryRun = args.flags['dry-run'] === true;

  return wrapOperation(
    async () => {
      // Load current graph and index
      let graph = await loadGraph(basePath);
      let index = await loadIndex({ basePath });

      // Discover external files from actual project/home directories
      // Note: basePath is the memory storage dir (.claude/memory/), not the project root
      const cwd = process.cwd();
      const homeDir = os.homedir();
      const gitRoot = findGitRoot(cwd) || cwd;

      const externalFiles = await discoverExternalFiles({
        cwd,
        homeDir,
        gitRoot,
      });

      // Index external files
      const embeddingsPath = path.join(basePath, 'embeddings.json');
      const result = await indexExternalFiles({
        basePath,
        graph,
        index,
        embeddingsPath,
        externalFiles,
        dryRun,
      });

      // Save graph and index to disk (unless dry-run)
      if (!dryRun && result.status === 'success') {
        await saveGraph(basePath, graph);
        await saveIndex(basePath, index);
      }

      return {
        status: result.status,
        changes: result.changes,
        summary: result.summary,
        errors: result.errors,
      };
    },
    dryRun ? 'Index context dry run complete' : 'Index context complete'
  );
}
