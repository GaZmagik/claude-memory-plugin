/**
 * Link Operations
 *
 * Public API for creating and removing links between memories.
 */

import type {
  LinkMemoriesRequest,
  LinkMemoriesResponse,
  UnlinkMemoriesRequest,
  UnlinkMemoriesResponse,
} from '../types/api.js';
import { loadGraph, saveGraph, addNode, hasNode } from './structure.js';
import type { GraphNode } from './structure.js';
import { addEdge, removeEdge, hasEdge, isCrossScopeEdge } from './edges.js';
import type { EdgeMetadata } from './edges.js';
import { loadIndex } from '../core/index.js';
import { createLogger } from '../core/logger.js';
import { resolveAgentScopePath } from '../cli/helpers.js';

const log = createLogger('link');

const DEFAULT_RELATION = 'relates-to';

/**
 * Create a link between two memories
 */
export async function linkMemories(request: LinkMemoriesRequest): Promise<LinkMemoriesResponse> {
  // Validate request
  if (!request.source || request.source.trim().length === 0) {
    return {
      status: 'error',
      error: 'source is required',
    };
  }

  if (!request.target || request.target.trim().length === 0) {
    return {
      status: 'error',
      error: 'target is required',
    };
  }

  if (request.source === request.target) {
    return {
      status: 'error',
      error: 'Cannot create self-referencing link',
    };
  }

  // Detect cross-scope scenario: targetBasePath or targetAgent present
  if (request.targetBasePath) {
    const sourceBasePath = request.agent
      ? resolveAgentScopePath(request.agent, undefined)
      : (request.basePath ?? process.cwd());

    const result = await storeCrossScopeEdge({
      sourceId: request.source,
      targetId: request.target,
      relation: request.relation,
      sourceBasePath,
      targetBasePath: request.targetBasePath,
      sourceScope: request.sourceScope ?? (request.agent ? 'agent-project' : 'project'),
      targetScope: request.targetScope ?? (request.targetAgent ? 'agent-project' : 'project'),
      sourceAgent: request.sourceAgent ?? request.agent,
      targetAgent: request.targetAgent,
    });

    return {
      status: result.status,
      error: result.error,
      edge: result.edge,
      alreadyExists: false,
    };
  }

  // Resolve basePath, considering agent context
  const basePath = request.agent
    ? resolveAgentScopePath(request.agent, undefined)
    : (request.basePath ?? process.cwd());
  const relation = request.relation ?? DEFAULT_RELATION;

  try {
    // Load index to verify memories exist
    const index = await loadIndex({ basePath });
    const sourceEntry = index.memories.find(m => m.id === request.source);
    const targetEntry = index.memories.find(m => m.id === request.target);

    if (!sourceEntry) {
      return {
        status: 'error',
        error: `Source memory not found: ${request.source}`,
      };
    }

    if (!targetEntry) {
      return {
        status: 'error',
        error: `Target memory not found: ${request.target}`,
      };
    }

    // Load graph
    let graph = await loadGraph(basePath);

    // Add nodes if not in graph
    if (!hasNode(graph, request.source)) {
      graph = addNode(graph, { id: request.source, type: sourceEntry.type });
    }

    if (!hasNode(graph, request.target)) {
      graph = addNode(graph, { id: request.target, type: targetEntry.type });
    }

    // Check if edge already exists
    if (hasEdge(graph, request.source, request.target, relation)) {
      return {
        status: 'success',
        edge: {
          source: request.source,
          target: request.target,
          label: relation,
        },
        alreadyExists: true,
      };
    }

    // Add edge
    graph = addEdge(graph, request.source, request.target, relation);

    // Save graph
    await saveGraph(basePath, graph);

    log.info('Created link', { source: request.source, target: request.target, relation });

    return {
      status: 'success',
      edge: {
        source: request.source,
        target: request.target,
        label: relation,
      },
      alreadyExists: false,
    };
  } catch (error) {
    log.error('Failed to create link', {
      source: request.source,
      target: request.target,
      error: String(error),
    });
    return {
      status: 'error',
      error: `Failed to create link: ${String(error)}`,
    };
  }
}

/**
 * Remove a link between two memories
 */
export async function unlinkMemories(request: UnlinkMemoriesRequest): Promise<UnlinkMemoriesResponse> {
  // Validate request
  if (!request.source || request.source.trim().length === 0) {
    return {
      status: 'error',
      error: 'source is required',
    };
  }

  if (!request.target || request.target.trim().length === 0) {
    return {
      status: 'error',
      error: 'target is required',
    };
  }

  // Detect cross-scope scenario
  if (request.targetBasePath) {
    const sourceBasePath = request.agent
      ? resolveAgentScopePath(request.agent, undefined)
      : (request.basePath ?? process.cwd());

    const result = await removeCrossScopeEdge({
      sourceId: request.source,
      targetId: request.target,
      relation: request.relation,
      sourceBasePath,
      targetBasePath: request.targetBasePath,
    });

    return {
      status: result.status,
      error: result.error,
      removedCount: result.removedCount,
    };
  }

  // Resolve basePath, considering agent context
  const basePath = request.agent
    ? resolveAgentScopePath(request.agent, undefined)
    : (request.basePath ?? process.cwd());

  try {
    // Load graph
    let graph = await loadGraph(basePath);

    // Count edges before removal
    const edgesBefore = graph.edges.length;

    // Remove edge(s)
    graph = removeEdge(graph, request.source, request.target, request.relation);

    const removedCount = edgesBefore - graph.edges.length;

    if (removedCount === 0) {
      return {
        status: 'success',
        removedCount: 0,
      };
    }

    // Save graph
    await saveGraph(basePath, graph);

    log.info('Removed link(s)', {
      source: request.source,
      target: request.target,
      relation: request.relation,
      removedCount,
    });

    return {
      status: 'success',
      removedCount,
    };
  } catch (error) {
    log.error('Failed to remove link', {
      source: request.source,
      target: request.target,
      error: String(error),
    });
    return {
      status: 'error',
      error: `Failed to remove link: ${String(error)}`,
    };
  }
}

// ============================================================================
// Cross-Scope Link Operations
// ============================================================================

/**
 * Request to store a cross-scope edge in both graphs
 */
export interface StoreCrossScopeEdgeRequest {
  sourceId: string;
  targetId: string;
  relation?: string;
  sourceBasePath: string;
  targetBasePath: string;
  sourceScope: string;
  targetScope: string;
  sourceAgent?: string;
  targetAgent?: string;
}

/**
 * Response from cross-scope edge storage
 */
export interface StoreCrossScopeEdgeResponse {
  status: 'success' | 'error';
  error?: string;
  edge?: {
    source: string;
    target: string;
    label: string;
  };
}

/**
 * Request to remove a cross-scope edge from both graphs
 */
export interface RemoveCrossScopeEdgeRequest {
  sourceId: string;
  targetId: string;
  relation?: string;
  sourceBasePath: string;
  targetBasePath: string;
}

/**
 * Response from cross-scope edge removal
 */
export interface RemoveCrossScopeEdgeResponse {
  status: 'success' | 'error';
  error?: string;
  removedCount: number;
}

/**
 * Store a cross-scope edge in both the source and target graph files.
 *
 * The same edge (with identical metadata) is written to both graphs.
 * Source graph is saved first (it "owns" the edge), then target.
 * Nodes are auto-added to graphs with enrichment from the index if missing.
 */
export async function storeCrossScopeEdge(
  request: StoreCrossScopeEdgeRequest
): Promise<StoreCrossScopeEdgeResponse> {
  const relation = request.relation ?? DEFAULT_RELATION;
  const metadata: EdgeMetadata = {
    sourceScope: request.sourceScope,
    targetScope: request.targetScope,
    sourceAgent: request.sourceAgent,
    targetAgent: request.targetAgent,
  };

  try {
    // Load both indexes to look up memory metadata for node enrichment
    const sourceIndex = await loadIndex({ basePath: request.sourceBasePath });
    const targetIndex = await loadIndex({ basePath: request.targetBasePath });

    const sourceEntry = sourceIndex.memories.find(m => m.id === request.sourceId)
      ?? targetIndex.memories.find(m => m.id === request.sourceId);
    const targetEntry = targetIndex.memories.find(m => m.id === request.targetId)
      ?? sourceIndex.memories.find(m => m.id === request.targetId);

    // Build enriched nodes
    const sourceNode: GraphNode = {
      id: request.sourceId,
      type: sourceEntry?.type ?? 'unknown',
      ...(sourceEntry?.title && { title: sourceEntry.title }),
      ...(request.sourceScope && { scope: request.sourceScope }),
      ...(request.sourceAgent && { agent: request.sourceAgent }),
    };

    const targetNode: GraphNode = {
      id: request.targetId,
      type: targetEntry?.type ?? 'unknown',
      ...(targetEntry?.title && { title: targetEntry.title }),
      ...(request.targetScope && { scope: request.targetScope }),
      ...(request.targetAgent && { agent: request.targetAgent }),
    };

    // Load both graphs
    let sourceGraph = await loadGraph(request.sourceBasePath);
    let targetGraph = await loadGraph(request.targetBasePath);

    // Add nodes if missing (with enrichment)
    if (!hasNode(sourceGraph, request.sourceId)) {
      sourceGraph = addNode(sourceGraph, sourceNode);
    }
    if (!hasNode(sourceGraph, request.targetId)) {
      sourceGraph = addNode(sourceGraph, targetNode);
    }
    if (!hasNode(targetGraph, request.sourceId)) {
      targetGraph = addNode(targetGraph, sourceNode);
    }
    if (!hasNode(targetGraph, request.targetId)) {
      targetGraph = addNode(targetGraph, targetNode);
    }

    // Add edge to both graphs with cross-scope metadata
    sourceGraph = addEdge(sourceGraph, request.sourceId, request.targetId, relation, metadata);
    targetGraph = addEdge(targetGraph, request.sourceId, request.targetId, relation, metadata);

    // Save source first, then target (non-atomic but source "owns" the edge)
    await saveGraph(request.sourceBasePath, sourceGraph);
    await saveGraph(request.targetBasePath, targetGraph);

    log.info('Created cross-scope link', {
      source: request.sourceId,
      target: request.targetId,
      relation,
      sourceScope: request.sourceScope,
      targetScope: request.targetScope,
    });

    return {
      status: 'success',
      edge: {
        source: request.sourceId,
        target: request.targetId,
        label: relation,
      },
    };
  } catch (error) {
    log.error('Failed to create cross-scope link', {
      source: request.sourceId,
      target: request.targetId,
      error: String(error),
    });
    return {
      status: 'error',
      error: `Failed to create cross-scope link: ${String(error)}`,
    };
  }
}

/**
 * Remove a cross-scope edge from both the source and target graph files.
 *
 * Scans the source graph for matching edges, removes from both graphs.
 * Best-effort on target graph — if it fails, source is still cleaned up.
 */
export async function removeCrossScopeEdge(
  request: RemoveCrossScopeEdgeRequest
): Promise<RemoveCrossScopeEdgeResponse> {
  let totalRemoved = 0;

  try {
    // Load source graph and remove matching edges
    let sourceGraph = await loadGraph(request.sourceBasePath);
    const edgesBefore = sourceGraph.edges.length;

    sourceGraph = removeEdge(sourceGraph, request.sourceId, request.targetId, request.relation);
    const sourceRemoved = edgesBefore - sourceGraph.edges.length;

    if (sourceRemoved > 0) {
      await saveGraph(request.sourceBasePath, sourceGraph);
      totalRemoved += sourceRemoved;
    }

    // Best-effort: remove from target graph
    try {
      let targetGraph = await loadGraph(request.targetBasePath);
      const targetEdgesBefore = targetGraph.edges.length;

      targetGraph = removeEdge(targetGraph, request.sourceId, request.targetId, request.relation);
      const targetRemoved = targetEdgesBefore - targetGraph.edges.length;

      if (targetRemoved > 0) {
        await saveGraph(request.targetBasePath, targetGraph);
        totalRemoved += targetRemoved;
      }
    } catch (targetError) {
      log.warn('Best-effort target graph cleanup failed', {
        targetBasePath: request.targetBasePath,
        error: String(targetError),
      });
    }

    log.info('Removed cross-scope link', {
      source: request.sourceId,
      target: request.targetId,
      removedCount: totalRemoved,
    });

    return {
      status: 'success',
      removedCount: totalRemoved,
    };
  } catch (error) {
    log.error('Failed to remove cross-scope link', {
      source: request.sourceId,
      target: request.targetId,
      error: String(error),
    });
    return {
      status: 'error',
      error: `Failed to remove cross-scope link: ${String(error)}`,
      removedCount: totalRemoved,
    };
  }
}
