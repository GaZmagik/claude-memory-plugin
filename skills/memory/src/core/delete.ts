/**
 * T032: Memory Delete Operation
 *
 * Delete memory files and clean up index, graph, and embeddings.
 */

import * as path from 'node:path';
import type { DeleteMemoryRequest, DeleteMemoryResponse } from '../types/api.js';
import { Scope } from '../types/enums.js';
import { findInIndex, removeFromIndex } from './index.js';
import { deleteFile, fileExists, isInsideDir, readFile, writeFileAtomic } from './fs-utils.js';
import { createLogger } from './logger.js';
import { loadGraph, saveGraph, removeNode } from '../graph/structure.js';
import { isCrossScopeEdge } from '../graph/edges.js';
import { removeEdge } from '../graph/edges.js';
import type { EmbeddingCache } from '../search/embedding.js';
import { getAgentDirectoryPath } from '../scope/get-agent-directory-path.js';
import { resolveAgentScopePath, getResolvedScopePath, parseScope } from '../cli/helpers.js';

const log = createLogger('delete');

/**
 * Resolve the base path for the "other" scope in a cross-scope edge.
 *
 * Given a cross-scope edge and the ID of the memory being deleted,
 * determines which scope is the "other" side and resolves its path.
 */
function resolveOtherScopeBasePath(
  edge: { source: string; target: string; sourceScope?: string; targetScope?: string; sourceAgent?: string; targetAgent?: string },
  deletedId: string
): string | null {
  // Determine which side is the "other" scope
  const isSource = edge.source === deletedId;
  const otherScope = isSource ? edge.targetScope : edge.sourceScope;
  const otherAgent = isSource ? edge.targetAgent : edge.sourceAgent;

  if (!otherScope) return null;

  try {
    const agentScopes = ['agent-project', 'agent-global'];
    if (agentScopes.includes(otherScope) && otherAgent) {
      return resolveAgentScopePath(otherAgent, undefined);
    }

    // Non-agent scope — resolve via standard scope path
    return getResolvedScopePath(parseScope(otherScope));
  } catch (error) {
    log.warn('Failed to resolve other scope base path', {
      otherScope,
      otherAgent,
      error: String(error),
    });
    return null;
  }
}

/**
 * Delete a memory by ID
 */
export async function deleteMemory(request: DeleteMemoryRequest): Promise<DeleteMemoryResponse> {
  // Validate ID
  if (!request.id || request.id.trim().length === 0) {
    return {
      status: 'error',
      error: 'id is required',
    };
  }

  // Resolve base path (handle agent scopes)
  let basePath: string;
  if (request.scope && (request.scope === Scope.AgentProject || request.scope === Scope.AgentGlobal)) {
    // Agent scope - resolve agent directory
    if (!request.agent) {
      return {
        status: 'error',
        error: 'agent field is required for agent scopes',
      };
    }

    const projectRoot = request.scope === Scope.AgentProject ? process.cwd() : undefined;
    const globalRoot = request.scope === Scope.AgentGlobal ? (request.basePath ?? process.env.HOME + '/.claude/memory') : undefined;

    basePath = getAgentDirectoryPath({
      scope: request.scope,
      agentName: request.agent,
      projectRoot,
      globalRoot,
    });
  } else {
    // Regular scope - use existing resolution
    basePath = request.basePath ?? process.cwd();
  }

  try {
    // Find in index first
    const indexEntry = await findInIndex(basePath, request.id);

    let filePath: string;

    if (indexEntry) {
      filePath = path.join(basePath, indexEntry.relativePath);
    } else {
      // Fall back to direct file lookup
      filePath = path.join(basePath, `${request.id}.md`);
    }

    // Security: Validate path stays within basePath (prevent path traversal)
    if (!isInsideDir(basePath, filePath)) {
      log.warn('Path traversal attempt detected', { id: request.id, filePath });
      return {
        status: 'error',
        error: 'Invalid memory ID: path traversal not allowed',
      };
    }

    // Check if file exists
    if (!(await fileExists(filePath))) {
      return {
        status: 'error',
        error: `Memory not found: ${request.id}`,
      };
    }

    // Delete the file
    await deleteFile(filePath);

    // Remove from index
    await removeFromIndex(basePath, request.id);

    // Remove from graph (node and all edges involving it)
    try {
      let graph = await loadGraph(basePath);

      // Before removing the node, scan for cross-scope edges to clean up other graphs
      const crossScopeEdges = graph.edges.filter(
        e => (e.source === request.id || e.target === request.id) && isCrossScopeEdge(e)
      );

      // Clean up cross-scope edges in other graphs (best-effort)
      for (const edge of crossScopeEdges) {
        try {
          const otherBasePath = resolveOtherScopeBasePath(edge, request.id);
          if (otherBasePath) {
            let otherGraph = await loadGraph(otherBasePath);
            const beforeCount = otherGraph.edges.length;
            otherGraph = removeEdge(otherGraph, edge.source, edge.target, edge.label);
            if (otherGraph.edges.length < beforeCount) {
              await saveGraph(otherBasePath, otherGraph);
              log.info('Cleaned up cross-scope edge in other graph', {
                id: request.id,
                otherBasePath,
                edge: `${edge.source} -> ${edge.target}`,
              });
            }
          }
        } catch (crossScopeError) {
          log.warn('Best-effort cross-scope edge cleanup failed', {
            id: request.id,
            edge: `${edge.source} -> ${edge.target}`,
            error: String(crossScopeError),
          });
        }
      }

      graph = removeNode(graph, request.id);
      await saveGraph(basePath, graph);
    } catch {
      // Graph cleanup is best-effort - sync.ts can fix orphans later
      log.warn('Failed to clean up graph node', { id: request.id });
    }

    // Remove from embeddings cache
    try {
      const embeddingsPath = path.join(basePath, 'embeddings.json');
      if (await fileExists(embeddingsPath)) {
        const content = await readFile(embeddingsPath);
        const cache = JSON.parse(content) as EmbeddingCache;
        if (cache.memories && cache.memories[request.id]) {
          delete cache.memories[request.id];
          await writeFileAtomic(embeddingsPath, JSON.stringify(cache, null, 2));
        }
      }
    } catch {
      // Embeddings cleanup is best-effort
      log.warn('Failed to clean up embedding', { id: request.id });
    }

    log.info('Deleted memory', { id: request.id, path: filePath });

    return {
      status: 'success',
      deletedId: request.id,
    };
  } catch (error) {
    log.error('Failed to delete memory', { id: request.id, error: String(error) });
    return {
      status: 'error',
      error: `Failed to delete memory: ${String(error)}`,
    };
  }
}
