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
import { addEdge, removeEdge, hasEdge } from './edges.js';
import { loadIndex } from '../core/index.js';
import { createLogger } from '../core/logger.js';

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

  const basePath = request.basePath ?? process.cwd();
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

  const basePath = request.basePath ?? process.cwd();

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
