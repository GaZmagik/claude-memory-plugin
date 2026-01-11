/**
 * API Request/Response Type Definitions
 *
 * Contracts for all memory operations.
 */

import type { MemoryType, Scope, Severity } from './enums.js';
import type { MemoryFrontmatter, MemoryIndex } from './memory.js';

// ============================================================================
// Common Types
// ============================================================================

/**
 * Base response structure for all operations
 */
export interface BaseResponse {
  /** Operation status */
  status: 'success' | 'error';
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Base request with optional base path override
 */
export interface BaseRequest {
  /** Override base path for testing */
  basePath?: string;
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Request to create or update a memory
 */
export interface WriteMemoryRequest extends BaseRequest {
  /** Memory title */
  title: string;
  /** Memory type */
  type: MemoryType;
  /** Markdown content body */
  content: string;
  /** Categorisation tags */
  tags: string[];
  /** Storage scope */
  scope: Scope;
  /** Severity level (optional, primarily for gotchas) */
  severity?: Severity;
  /** Linked memory IDs */
  links?: string[];
  /** Source file or context */
  source?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
  /** Project root for gitignore automation (optional) */
  projectRoot?: string;
}

/**
 * Response from write operation
 */
export interface WriteMemoryResponse extends BaseResponse {
  /** Created/updated memory details */
  memory?: {
    /** Memory ID (slug) */
    id: string;
    /** Absolute file path */
    filePath: string;
    /** Frontmatter data */
    frontmatter: MemoryFrontmatter;
    /** Storage scope */
    scope: Scope;
  };
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Request to read a memory by ID
 */
export interface ReadMemoryRequest extends BaseRequest {
  /** Memory ID (slug) */
  id: string;
  /** Scope to search in (optional) */
  scope?: Scope;
}

/**
 * Response from read operation
 */
export interface ReadMemoryResponse extends BaseResponse {
  /** Retrieved memory */
  memory?: {
    /** Frontmatter metadata */
    frontmatter: MemoryFrontmatter;
    /** Markdown content body */
    content: string;
    /** Absolute file path */
    filePath: string;
  };
}

// ============================================================================
// List Operations
// ============================================================================

/**
 * Request to list memories with optional filters
 */
export interface ListMemoriesRequest extends BaseRequest {
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by single tag */
  tag?: string;
  /** Filter by multiple tags (AND logic) */
  tags?: string[];
  /** Filter by scope */
  scope?: Scope;
  /** Maximum number of results */
  limit?: number;
  /** Sort order */
  sortBy?: 'created' | 'updated' | 'title';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Memory summary for list results
 */
export interface MemorySummary {
  /** Memory ID */
  id: string;
  /** Memory type */
  type: MemoryType;
  /** Title */
  title: string;
  /** Tags */
  tags: string[];
  /** Scope */
  scope: Scope;
  /** Creation timestamp */
  created: string;
  /** Update timestamp */
  updated: string;
  /** Relative file path */
  relativePath: string;
  /** Severity if applicable */
  severity?: Severity;
}

/**
 * Response from list operation
 */
export interface ListMemoriesResponse extends BaseResponse {
  /** List of memory summaries */
  memories?: MemorySummary[];
  /** Total count (before limit) */
  count?: number;
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Request to delete a memory
 */
export interface DeleteMemoryRequest extends BaseRequest {
  /** Memory ID (slug) */
  id: string;
  /** Scope to delete from (optional) */
  scope?: Scope;
}

/**
 * Response from delete operation
 */
export interface DeleteMemoryResponse extends BaseResponse {
  /** Deleted memory ID */
  deletedId?: string;
}

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Request to search memories by keyword
 */
export interface SearchMemoriesRequest extends BaseRequest {
  /** Search query */
  query: string;
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by scope */
  scope?: Scope;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  /** Memory ID */
  id: string;
  /** Memory type */
  type: MemoryType;
  /** Title */
  title: string;
  /** Tags */
  tags: string[];
  /** Storage scope */
  scope?: Scope;
  /** Relevance score (0-1) */
  score: number;
  /** Matching snippet */
  snippet?: string;
}

/**
 * Response from search operation
 */
export interface SearchMemoriesResponse extends BaseResponse {
  /** Search results */
  results?: SearchResult[];
}

// ============================================================================
// Semantic Search Operations
// ============================================================================

/**
 * Request for semantic search
 */
export interface SemanticSearchRequest extends BaseRequest {
  /** Natural language query */
  query: string;
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by scope */
  scope?: Scope;
  /** Minimum similarity threshold (0-1) */
  threshold?: number;
  /** Maximum number of results */
  limit?: number;
  /** For auto-link mode (uses higher threshold) */
  forAutoLink?: boolean;
  /** Embedding provider (injected) */
  provider?: unknown;
}

/**
 * Semantic search result
 */
export interface SemanticSearchResultItem {
  /** Memory ID */
  id: string;
  /** Memory type */
  type: MemoryType;
  /** Title */
  title: string;
  /** Tags */
  tags: string[];
  /** Storage scope */
  scope?: Scope;
  /** Similarity score (0-1) */
  score: number;
}

/**
 * Response from semantic search
 */
export interface SemanticSearchResponse extends BaseResponse {
  /** Search results */
  results?: SemanticSearchResultItem[];
}

// ============================================================================
// Index Operations
// ============================================================================

/**
 * Request to rebuild index
 */
export interface RebuildIndexRequest extends BaseRequest {
  /** Force full rebuild */
  force?: boolean;
}

/**
 * Response from rebuild operation
 */
export interface RebuildIndexResponse extends BaseResponse {
  /** Number of entries in rebuilt index */
  entriesCount?: number;
  /** Number of orphaned entries removed */
  orphansRemoved?: number;
  /** Number of new entries added */
  newEntriesAdded?: number;
}

/**
 * Request to load index
 */
export interface LoadIndexRequest extends BaseRequest {}

/**
 * Response from load index operation - returns the full index
 */
export type LoadIndexResponse = MemoryIndex;
