/**
 * Suggest Links - Find potential relationships using embeddings
 *
 * Uses semantic similarity to suggest links between memories
 * that might be related but aren't yet connected.
 */

import * as path from 'node:path';
import { loadEmbeddingCache } from '../search/embedding.js';
import { findSimilarMemories } from '../search/similarity.js';
import { loadIndex } from '../core/index.js';
import { loadGraph, hasNode } from '../graph/structure.js';
import { linkMemories, storeCrossScopeEdge } from '../graph/link.js';
import { generate, isAvailable } from '../services/ollama.js';
import { unsafeAsMemoryId } from '../types/branded.js';

import { getScopePath } from '../scope/resolver.js';
import { Scope } from '../types/enums.js';

/**
 * Metadata for a memory loaded during multi-scope suggest-links
 */
interface MemoryMetadata {
  basePath: string;
  scope: string;
  agent?: string;
}

/**
 * Derive scope type from a target path by comparing it to known scope paths.
 * Used during multi-scope loading to determine the scope of shared memories.
 */
function deriveScope(targetPath: string, projectBase: string, globalBase: string): string {
  // Normalize paths for comparison
  const normalizedTarget = path.resolve(targetPath);
  const normalizedProject = path.resolve(projectBase);
  const normalizedGlobal = path.resolve(globalBase);

  if (normalizedTarget === normalizedGlobal) {
    return 'global';
  } else if (normalizedTarget === normalizedProject) {
    return 'project';
  } else if (normalizedTarget.includes('/.claude/agents/')) {
    return 'agent-project';
  } else {
    return 'local';
  }
}

/**
 * Suggested link
 */
export interface SuggestedLink {
  source: string;
  target: string;
  similarity: number;
  sourceTitle: string;
  targetTitle: string;
  reason: string;
  /** Whether this suggestion crosses scope boundaries (v1.4.0+) */
  isCrossScope?: boolean;
  /** Source memory metadata (v1.4.0+) */
  sourceMetadata?: MemoryMetadata;
  /** Target memory metadata (v1.4.0+) */
  targetMetadata?: MemoryMetadata;
}

/**
 * Suggest links request
 */
export interface SuggestLinksRequest {
  basePath: string;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Maximum suggestions to return */
  limit?: number;
  /** Automatically create suggested links */
  autoLink?: boolean;
  /** Include ALL scopes (project, global, all agents) - v1.4.0+ */
  allScopes?: boolean;
  /** Agent name (for multi-scope loading) */
  agentName?: string;
  /** Scope string for agent scoping */
  scopeStr?: string;
  /** Invoke LLM to verify relation type on auto-linked same-scope edges (requires Ollama) */
  llmType?: boolean;
  /** Force update existing edge metadata (smart bypass: only updates if metadata differs) */
  force?: boolean;
}

/**
 * Suggest links response
 */
export interface SuggestLinksResponse {
  status: 'success' | 'error';
  /** Suggested links */
  suggestions: SuggestedLink[];
  /** Links auto-created (if autoLink=true) */
  created: number;
  /** Same-scope links created (v1.4.0+) */
  createdSameScope?: number;
  /** Cross-scope links created (v1.4.0+) */
  createdCrossScope?: number;
  /** Skipped (already linked) */
  skipped: number;
  /** Total pairs analysed */
  analysed: number;
  error?: string;
}

/**
 * Suggest potential links between memories
 */
export async function suggestLinks(
  request: SuggestLinksRequest
): Promise<SuggestLinksResponse> {
  const { basePath, threshold = 0.75, limit = 20, autoLink = false, allScopes = false, agentName, llmType = false, force = false } = request;

  const suggestions: SuggestedLink[] = [];
  let created = 0;
  let createdSameScope = 0;
  let createdCrossScope = 0;
  let skipped = 0;
  let analysed = 0;

  // Load embeddings cache(s)
  const embeddings: Record<string, number[]> = {};
  const indexMap = new Map<string, any>();
  const metadataMap = new Map<string, MemoryMetadata>();
  let graph = await loadGraph(basePath);
  const existingLinks = new Set<string>();

  // Get global path for scope detection
  const globalPath = getScopePath(Scope.Global, process.cwd(), '');

  // Load primary (agent or project) embeddings
  const cachePath = path.join(basePath, 'embeddings.json');
  let cache;
  try {
    cache = await loadEmbeddingCache(cachePath);
  } catch {
    return {
      status: 'error',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
      error: 'No embeddings cache found. Run semantic search to generate embeddings.',
    };
  }

  // Check cache has memories
  if (!cache.memories || Object.keys(cache.memories).length === 0) {
    return {
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
    };
  }

  // Load index for primary basePath
  const index = await loadIndex({ basePath });
  for (const entry of index.memories) {
    indexMap.set(entry.id, entry);
  }

  // Determine primary scope type
  const primaryScope = agentName ? 'agent-project' : deriveScope(basePath, process.cwd(), globalPath);

  // Build embeddings map from primary scope (excluding thoughts)
  // AND track metadata for each memory
  for (const [id, entry] of Object.entries(cache.memories)) {
    if (id.startsWith('thought-')) continue; // Skip temporary
    embeddings[id] = entry.embedding;

    // Track metadata for primary scope memories
    metadataMap.set(id, {
      basePath,
      scope: primaryScope,
      agent: agentName,
    });
  }

  // Build set of existing links from primary graph
  for (const edge of graph.edges) {
    existingLinks.add(`${edge.source}:${edge.target}`);
    existingLinks.add(`${edge.target}:${edge.source}`); // Bidirectional check
  }

  // When --all-scopes, load embeddings from ALL scopes (project, global, all agents)
  if (allScopes) {
    try {
      const projectPath = getScopePath(Scope.Project, process.cwd(), '');
      const globalPath = getScopePath(Scope.Global, process.cwd(), '');
      const scopePaths = new Set<string>([projectPath, globalPath]);

      // Scan for all agent scopes
      const agentsPath = path.join(projectPath, 'agents');
      try {
        const agentDirs = await Bun.file(agentsPath).exists()
          ? await Array.fromAsync(
              (async function* () {
                const dir = Bun.file(agentsPath).name ? agentsPath : '';
                if (!dir) return;
                for await (const entry of new Bun.Glob('*').scan(dir)) {
                  const agentMemoryPath = path.join(agentsPath, entry);
                  if (await Bun.file(path.join(agentMemoryPath, 'index.json')).exists()) {
                    yield agentMemoryPath;
                  }
                }
              })()
            )
          : [];
        agentDirs.forEach(p => scopePaths.add(p));
      } catch {
        // Agent scanning failed, continue with project + global only
      }

      // Load embeddings from all scopes
      for (const scopePath of scopePaths) {
        if (scopePath === basePath) continue; // Already loaded

        const scopeCachePath = path.join(scopePath, 'embeddings.json');
        let scopeCache;
        try {
          scopeCache = await loadEmbeddingCache(scopeCachePath);
        } catch {
          continue;
        }

        const scopeType = deriveScope(scopePath, projectPath, globalPath);

        for (const [id, entry] of Object.entries(scopeCache.memories)) {
          if (id.startsWith('thought-')) continue;
          if (!embeddings[id]) {
            embeddings[id] = entry.embedding;
            metadataMap.set(id, {
              basePath: scopePath,
              scope: scopeType,
              agent: scopePath.includes('/.claude/agents/') ? path.basename(scopePath) : undefined,
            });
          }
        }

        const scopeIndex = await loadIndex({ basePath: scopePath });
        for (const entry of scopeIndex.memories) {
          if (!indexMap.has(entry.id)) {
            indexMap.set(entry.id, entry);
          }
        }

        const scopeGraph = await loadGraph(scopePath);
        for (const edge of scopeGraph.edges) {
          existingLinks.add(`${edge.source}:${edge.target}`);
          existingLinks.add(`${edge.target}:${edge.source}`);
        }
      }
    } catch {
      // All-scopes loading failed, continue with primary scope
    }
  }
  // Filter out temporary memories (thoughts)
  const memoryIds = Object.keys(embeddings).filter(id => !id.startsWith('thought-'));
  if (memoryIds.length < 2) {
    return {
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
    };
  }

  // Find similar pairs
  for (const sourceId of memoryIds) {
    if (!embeddings[sourceId]) continue;
    const sourceEmbedding = embeddings[sourceId];

    // Find similar memories
    const similar = findSimilarMemories(sourceEmbedding, embeddings, threshold, limit);

    for (const match of similar) {
      if (match.id === sourceId) continue;

      analysed++;

      // Check if already linked
      if (existingLinks.has(`${sourceId}:${match.id}`)) {
        skipped++;
        continue;
      }

      // For --all-scopes, we allow cross-scope suggestions
      // For single-scope, check if both are in the graph
      if (!allScopes) {
        if (!hasNode(graph, sourceId) || !hasNode(graph, match.id)) {
          continue;
        }
      }

      const sourceEntry = indexMap.get(unsafeAsMemoryId(sourceId));
      const targetEntry = indexMap.get(unsafeAsMemoryId(match.id));

      if (!sourceEntry || !targetEntry) continue;

      // Get metadata for both memories to detect cross-scope
      const sourceMeta = metadataMap.get(sourceId);
      const targetMeta = metadataMap.get(match.id);
      const isCrossScope = sourceMeta && targetMeta && sourceMeta.basePath !== targetMeta.basePath;

      suggestions.push({
        source: sourceId,
        target: match.id,
        similarity: match.similarity,
        sourceTitle: sourceEntry.title,
        targetTitle: targetEntry.title,
        reason: `Semantic similarity: ${(match.similarity * 100).toFixed(1)}%`,
        isCrossScope,
        sourceMetadata: sourceMeta,
        targetMetadata: targetMeta,
      });

      // Mark as seen to avoid duplicates
      existingLinks.add(`${sourceId}:${match.id}`);
    }

    // Stop if we have enough
    if (suggestions.length >= limit) break;
  }

  // Sort by similarity (highest first)
  suggestions.sort((a, b) => b.similarity - a.similarity);

  // Trim to limit
  const finalSuggestions = suggestions.slice(0, limit);

  // Auto-link if requested
  // v1.4.0+: Now supports cross-scope auto-linking using storeCrossScopeEdge()
  if (autoLink && finalSuggestions.length > 0) {
    for (const suggestion of finalSuggestions) {
      try {
        if (suggestion.isCrossScope && suggestion.sourceMetadata && suggestion.targetMetadata) {
          // Cross-scope link: use storeCrossScopeEdge()
          await storeCrossScopeEdge({
            sourceId: suggestion.source,
            targetId: suggestion.target,
            relation: 'auto-linked-by-similarity',
            sourceBasePath: suggestion.sourceMetadata.basePath,
            targetBasePath: suggestion.targetMetadata.basePath,
            sourceScope: suggestion.sourceMetadata.scope,
            targetScope: suggestion.targetMetadata.scope,
            sourceAgent: suggestion.sourceMetadata.agent,
            targetAgent: suggestion.targetMetadata.agent,
          });
          createdCrossScope++;
        } else {
          // Same-scope link: use linkMemories()
          let verifiedRelation: string | undefined;
          if (llmType) {
            const available = await isAvailable();
            if (available) {
              const prompt = `Given source memory "${suggestion.sourceTitle}" and target memory "${suggestion.targetTitle}", what is the best relation label for their link? Reply with a single short label only.`;
              const llmResult = await generate(prompt, undefined, 300_000);
              verifiedRelation = llmResult.trim() || undefined;
            } else {
              process.stderr.write('[Ollama] Unavailable — skipping LLM type verification\n');
            }
          }
          await linkMemories({
            source: suggestion.source,
            target: suggestion.target,
            relation: 'auto-linked-by-similarity',
            basePath,
            agent: agentName,
            similarity: suggestion.similarity,
            verifiedRelation,
            force,
          });
          createdSameScope++;
        }
        created++;
      } catch {
        // Link failed, skip
      }
    }
  }

  return {
    status: 'success',
    suggestions: finalSuggestions,
    created,
    createdSameScope: createdSameScope > 0 ? createdSameScope : undefined,
    createdCrossScope: createdCrossScope > 0 ? createdCrossScope : undefined,
    skipped,
    analysed,
  };
}
