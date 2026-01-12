/**
 * Memory Entity Type Definitions
 *
 * Core type definitions for the Memory entity and related structures.
 */

import { MemoryType, Scope, Severity } from './enums.js';

/**
 * YAML Frontmatter structure for memory files
 */
export interface MemoryFrontmatter {
  /** Unique identifier (matches filename without .md extension) */
  id?: string;
  /** Memory type from taxonomy */
  type: MemoryType;
  /** Human-readable title */
  title: string;
  /** Project name (for cross-project context) */
  project?: string;
  /** ISO 8601 creation timestamp */
  created: string;
  /** ISO 8601 last updated timestamp */
  updated: string;
  /** Categorisation tags */
  tags: string[];
  /** Storage scope */
  scope?: Scope;
  /** Severity level (optional, primarily for gotchas/learnings) */
  severity?: Severity;
  /** Linked memory IDs */
  links?: string[];
  /** Source file or context that prompted this memory */
  source?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

/**
 * Complete Memory entity including content
 */
export interface Memory {
  /** Unique identifier (slug derived from title) */
  id: string;
  /** Frontmatter metadata */
  frontmatter: MemoryFrontmatter;
  /** Markdown content body */
  content: string;
  /** Storage scope */
  scope: Scope;
  /** Absolute file path */
  filePath: string;
}

/**
 * Index entry for cached memory metadata
 */
export interface IndexEntry {
  /** Memory ID (slug) */
  id: string;
  /** Memory type */
  type: MemoryType;
  /** Title for display */
  title: string;
  /** Tags for filtering */
  tags: string[];
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  updated: string;
  /** Storage scope */
  scope: Scope;
  /** Relative file path from scope root */
  relativePath: string;
  /** Severity if applicable */
  severity?: Severity;
}

/**
 * Complete index structure
 */
export interface MemoryIndex {
  /** Schema version for future migrations */
  version: string;
  /** Last rebuild timestamp */
  lastUpdated: string;
  /** Indexed memories */
  memories: IndexEntry[];
}

/**
 * Graph node representation
 */
export interface GraphNode {
  /** Memory ID */
  id: string;
  /** Display title */
  title: string;
}

/**
 * Graph edge representation
 * Note: Uses source/target to match D3.js and graph library conventions
 */
export interface GraphEdge {
  /** Source memory ID */
  source: string;
  /** Target memory ID */
  target: string;
  /** Relationship label */
  label: string;
}

/**
 * Complete graph structure (adjacency list)
 * Note: Matches implementation in graph/structure.ts
 */
export interface MemoryGraph {
  /** Schema version (numeric for semantic versioning) */
  version: number;
  /** All nodes in the graph */
  nodes: GraphNode[];
  /** All edges in the graph */
  edges: GraphEdge[];
}

/**
 * Configuration for memory system
 */
export interface MemoryConfig {
  /** Scope configuration */
  scopes: {
    /** Enterprise scope settings */
    enterprise: {
      /** Whether enterprise scope is enabled */
      enabled: boolean;
    };
    /** Default scope for new memories */
    default: Scope;
  };
  /** Embedding configuration */
  embedding: {
    /** Ollama endpoint URL */
    endpoint: string;
    /** Model to use for embeddings */
    model: string;
    /** Fallback models if primary unavailable */
    fallbackModels: string[];
  };
  /** Fork session configuration */
  fork: {
    /** Claude binary to use for forked sessions */
    claudeBinary: string;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: MemoryConfig = {
  scopes: {
    enterprise: {
      enabled: false,
    },
    default: Scope.Global,
  },
  embedding: {
    endpoint: 'http://localhost:11434',
    model: 'embeddinggemma',
    fallbackModels: ['nomic-embed-text', 'all-minilm'],
  },
  fork: {
    claudeBinary: 'claude2',
  },
};
