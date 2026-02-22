/**
 * External File Indexer
 *
 * Indexes discovered external files into graph, index, and embeddings.
 */

import type { ExternalFileEntry } from './external-file-types.js';
import { discoverExternalFiles } from './external-file-discovery.js';
import type { MemoryGraph, MemoryIndex, GraphNode, IndexEntry } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';
import { unsafeAsMemoryId } from '../types/branded.js';
import {
  loadEmbeddingCache,
  saveEmbeddingCache,
  truncateForEmbedding,
  type EmbeddingProvider,
} from '../search/embedding.js';
import { readFile } from '../core/fs-utils.js';

/**
 * Request parameters for indexing external files
 */
export interface IndexExternalFilesRequest {
  /** Base path for memory storage */
  basePath: string;

  /** Current graph (will be modified in-place) */
  graph: MemoryGraph;

  /** Current index (will be modified in-place) */
  index: MemoryIndex;

  /** Path to embeddings cache file */
  embeddingsPath: string;

  /** Embedding provider (optional - graceful fallback if undefined) */
  embeddingProvider?: EmbeddingProvider;

  /** Dry run - report changes without applying */
  dryRun?: boolean;

  /** Discovered external files (if not provided, runs discovery automatically) */
  externalFiles?: ExternalFileEntry[];
}

/**
 * Response from indexing external files
 */
export interface IndexExternalFilesResponse {
  status: 'success' | 'error';

  /** Changes made during indexing */
  changes: {
    /** External nodes added to graph */
    addedNodes: string[];

    /** External nodes updated (content hash changed) */
    updatedNodes: string[];

    /** External nodes removed (file deleted) */
    removedNodes: string[];

    /** Embeddings generated */
    embeddingsGenerated: number;

    /** Embeddings reused from cache */
    embeddingsReused: number;
  };

  /** Summary counts after indexing */
  summary: {
    totalExternalNodes: number;
    ruleNodes: number;
    reminderNodes: number;
  };

  errors?: string[];
}

/**
 * External graph nodes have guaranteed non-optional fields
 */
interface ExternalGraphNode extends GraphNode {
  title: string;
  scope: Scope;
  agent?: string;
  type: MemoryType.Rule | MemoryType.Reminder;
}

/**
 * Type guard for external nodes
 * @internal Exported for testing
 */
export function isExternalNode(node: GraphNode): node is ExternalGraphNode {
  return node.type === MemoryType.Rule || node.type === MemoryType.Reminder;
}

/**
 * Create GraphNode from ExternalFileEntry
 * @internal Exported for testing
 */
export function createGraphNode(entry: ExternalFileEntry): ExternalGraphNode {
  const type = entry.id.startsWith('rule-') ? MemoryType.Rule : MemoryType.Reminder;

  return {
    id: unsafeAsMemoryId(entry.id),
    type,
    title: entry.title,
    scope: entry.scope,
    agent: entry.agentName,
  };
}

/**
 * Create IndexEntry from ExternalFileEntry
 * @internal Exported for testing
 */
export function createIndexEntry(entry: ExternalFileEntry): IndexEntry {
  const type = entry.id.startsWith('rule-') ? MemoryType.Rule : MemoryType.Reminder;

  return {
    id: unsafeAsMemoryId(entry.id),
    type,
    title: entry.title,
    tags: [],
    created: entry.modifiedTime,
    updated: entry.modifiedTime,
    scope: entry.scope,
    agent: entry.agentName,
    relativePath: `external/${entry.id}`, // Sentinel path
    externalPath: entry.absolutePath,
    externalFileKind: entry.kind,
  };
}


/**
 * Index discovered external files into graph, index, and embeddings
 */
export async function indexExternalFiles(
  request: IndexExternalFilesRequest
): Promise<IndexExternalFilesResponse> {
  const {
    graph,
    index,
    embeddingsPath,
    embeddingProvider,
    dryRun = false,
    externalFiles: providedFiles,
  } = request;

  const errors: string[] = [];
  const changes = {
    addedNodes: [] as string[],
    updatedNodes: [] as string[],
    removedNodes: [] as string[],
    embeddingsGenerated: 0,
    embeddingsReused: 0,
  };

  try {
    // 1. Discover external files (if not provided)
    const externalFiles = providedFiles || await discoverExternalFiles();

    // 2. Load existing embedding cache
    const embeddingCache = await loadEmbeddingCache(embeddingsPath);

    // 3. Track existing external node IDs
    const existingExternalIds = new Set(
      graph.nodes.filter(isExternalNode).map(n => n.id as string)
    );

    const discoveredIds = new Set(externalFiles.map(f => f.id));

    // 4. Process each discovered file (metadata updates only)
    const filesToEmbed: Array<{ nodeId: string; absolutePath: string; hash: string }> = [];

    for (const entry of externalFiles) {
      try {
        const nodeId = entry.id;
        const existingNode = graph.nodes.find(n => n.id === nodeId);
        const existingEntry = index.memories.find(m => m.id === nodeId);

        // Check if content changed
        const cachedEmbedding = embeddingCache.memories[nodeId];
        const contentChanged = !cachedEmbedding || cachedEmbedding.hash !== entry.contentHash;

        if (!existingNode) {
          // New node
          if (!dryRun) {
            graph.nodes.push(createGraphNode(entry));
            index.memories.push(createIndexEntry(entry));
          }
          changes.addedNodes.push(nodeId);

          // Queue for embedding generation if provider available
          if (embeddingProvider && contentChanged) {
            filesToEmbed.push({
              nodeId,
              absolutePath: entry.absolutePath,
              hash: entry.contentHash,
            });
          }
        } else if (contentChanged) {
          // Existing node with content change
          if (!dryRun) {
            // Update node (title might have changed)
            existingNode.title = entry.title;

            // Update index entry
            if (existingEntry) {
              existingEntry.title = entry.title;
              existingEntry.updated = entry.modifiedTime;
            }
          }
          changes.updatedNodes.push(nodeId);

          // Queue for embedding regeneration
          if (embeddingProvider) {
            filesToEmbed.push({
              nodeId,
              absolutePath: entry.absolutePath,
              hash: entry.contentHash,
            });
          }
        } else {
          // Node exists and content unchanged - reuse cache
          if (cachedEmbedding) {
            changes.embeddingsReused++;
          }
        }
      } catch (error) {
        errors.push(`Failed to process ${entry.id}: ${error}`);
      }
    }

    // 4b. Generate embeddings in batches to avoid overwhelming Ollama
    if (!dryRun && filesToEmbed.length > 0 && embeddingProvider) {
      try {
        const CONCURRENT_EMBEDDINGS = 10;
        const embeddingResults: Array<{ nodeId: string; embedding: number[]; hash: string; timestamp: string } | null> = [];

        // Process embeddings in batches of 10
        for (let i = 0; i < filesToEmbed.length; i += CONCURRENT_EMBEDDINGS) {
          const batch = filesToEmbed.slice(i, i + CONCURRENT_EMBEDDINGS);
          const batchPromises = batch.map(async ({ nodeId, absolutePath, hash }) => {
            try {
              const fileContent = await readFile(absolutePath);
              const truncatedContent = truncateForEmbedding(fileContent);
              const embedding = await embeddingProvider!.generate(truncatedContent);
              return {
                nodeId,
                embedding,
                hash,
                timestamp: new Date().toISOString(),
              };
            } catch (error) {
              errors.push(`Failed to generate embedding for ${nodeId}: ${error}`);
              return null;
            }
          });
          const batchResults = await Promise.allSettled(batchPromises);
          embeddingResults.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : null));
        }

        // Store successful embeddings
        for (const result of embeddingResults) {
          if (result) {
            embeddingCache.memories[result.nodeId] = {
              embedding: result.embedding,
              hash: result.hash,
              timestamp: result.timestamp,
            };
            changes.embeddingsGenerated++;
          }
        }
      } catch (error) {
        errors.push(`Parallel embedding generation failed: ${error}`);
      }
    } else {
      // Dry run - just count what would be generated
      changes.embeddingsGenerated = filesToEmbed.length;
    }

    // 5. Remove stale external nodes (exist in graph but not discovered)
    for (const existingId of existingExternalIds) {
      if (!discoveredIds.has(existingId)) {
        if (!dryRun) {
          // Remove from graph
          const nodeIndex = graph.nodes.findIndex(n => n.id === existingId);
          if (nodeIndex !== -1) {
            graph.nodes.splice(nodeIndex, 1);
          }

          // Remove from index
          const entryIndex = index.memories.findIndex(m => m.id === existingId);
          if (entryIndex !== -1) {
            index.memories.splice(entryIndex, 1);
          }

          // Remove from embedding cache
          delete embeddingCache.memories[existingId];
        }
        changes.removedNodes.push(existingId);
      }
    }

    // 6. Calculate summary
    const externalNodes = dryRun
      ? externalFiles
      : graph.nodes.filter(isExternalNode);

    const ruleNodes = externalNodes.filter(n =>
      (n.id as string).startsWith('rule-')
    );
    const reminderNodes = externalNodes.filter(n =>
      (n.id as string).startsWith('reminder-')
    );

    // 7. Save embedding cache (unless dry run)
    if (!dryRun) {
      await saveEmbeddingCache(embeddingsPath, embeddingCache);
    }

    return {
      status: 'success',
      changes,
      summary: {
        totalExternalNodes: externalNodes.length,
        ruleNodes: ruleNodes.length,
        reminderNodes: reminderNodes.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      status: 'error',
      changes,
      summary: {
        totalExternalNodes: 0,
        ruleNodes: 0,
        reminderNodes: 0,
      },
      errors: [`Indexing failed: ${error}`],
    };
  }
}
