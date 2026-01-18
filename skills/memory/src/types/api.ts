/**
 * API Request/Response Type Definitions
 *
 * Contracts for all memory operations.
 */

import type { MemoryType, Scope, Severity, ThinkStatus, ThoughtType } from './enums.js';
import type { MemoryFrontmatter, MemoryIndex } from './memory.js';
import type { ThinkDocument, ThinkDocumentSummary, AICallOptions } from './think.js';
import type { EmbeddingProvider } from '../search/embedding.js';

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
  /** Explicit memory ID (optional - for imports/restore operations) */
  id?: string;
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
  /** Project name for cross-project context */
  project?: string;
  /** Automatically link to similar memories after write */
  autoLink?: boolean;
  /** Similarity threshold for auto-link (default: 0.85) */
  autoLinkThreshold?: number;
  /** Embedding provider for auto-link (optional - skips embedding generation if not provided) */
  embeddingProvider?: EmbeddingProvider;
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
  /** Number of auto-linked memories (if autoLink was true) */
  autoLinked?: number;
  /** Similar existing titles (warning, not error) */
  similarTitles?: Array<{ id: string; title: string; similarity: number }>;
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

// ============================================================================
// Think Operations
// ============================================================================

/**
 * Request to create a new thinking document
 */
export interface ThinkCreateRequest extends BaseRequest {
  /** The topic for deliberation */
  topic: string;
  /** Storage scope (default: Project) */
  scope?: Scope;
}

/**
 * Response from think create operation
 */
export interface ThinkCreateResponse extends BaseResponse {
  /** Created document details */
  document?: {
    /** Document ID */
    id: string;
    /** Absolute file path */
    filePath: string;
    /** Topic */
    topic: string;
    /** Scope */
    scope: Scope;
  };
}

/**
 * Request to add a thought to a document
 */
export interface ThinkAddRequest extends BaseRequest {
  /** The thought content (or guidance if using --call) */
  thought: string;
  /** Type of thought */
  type: ThoughtType;
  /** Target document ID (optional, uses current if not specified) */
  documentId?: string;
  /** Attribution (e.g., "Claude", "User") */
  by?: string;
  /** AI call options (if using --call) */
  call?: AICallOptions;
}

/**
 * Response from think add operation
 */
export interface ThinkAddResponse extends BaseResponse {
  /** Added thought details */
  thought?: {
    /** Timestamp when added */
    timestamp: string;
    /** Thought type */
    type: ThoughtType;
    /** Thought content */
    content: string;
    /** Attribution */
    by?: string;
    /** Session ID (for --resume) */
    sessionId?: string;
  };
  /** Document ID the thought was added to */
  documentId?: string;
}

/**
 * Request to list thinking documents
 */
export interface ThinkListRequest extends BaseRequest {
  /** Filter by status */
  status?: ThinkStatus;
  /** Filter by scope */
  scope?: Scope;
}

/**
 * Response from think list operation
 */
export interface ThinkListResponse extends BaseResponse {
  /** List of document summaries */
  documents?: ThinkDocumentSummary[];
  /** Current document ID (if any) */
  currentId?: string | null;
}

/**
 * Request to show a thinking document
 */
export interface ThinkShowRequest extends BaseRequest {
  /** Document ID (optional, uses current if not specified) */
  documentId?: string;
}

/**
 * Response from think show operation
 */
export interface ThinkShowResponse extends BaseResponse {
  /** Full document details */
  document?: ThinkDocument;
}

/**
 * Request to switch current document
 */
export interface ThinkUseRequest extends BaseRequest {
  /** Document ID to switch to */
  documentId: string;
}

/**
 * Response from think use operation
 */
export interface ThinkUseResponse extends BaseResponse {
  /** Previous current document ID */
  previousId?: string | null;
  /** New current document ID */
  currentId?: string;
  /** Topic of the new current document */
  topic?: string;
}

/**
 * Request to conclude a thinking document
 */
export interface ThinkConcludeRequest extends BaseRequest {
  /** Conclusion text */
  conclusion: string;
  /** Document ID (optional, uses current if not specified) */
  documentId?: string;
  /** Promote to permanent memory type */
  promote?: MemoryType;
}

/**
 * Response from think conclude operation
 */
export interface ThinkConcludeResponse extends BaseResponse {
  /** Concluded document details */
  concluded?: {
    /** Document ID */
    id: string;
    /** Conclusion text */
    conclusion: string;
  };
  /** Promoted memory details (if promoted) */
  promoted?: {
    /** New memory ID */
    id: string;
    /** Memory type */
    type: MemoryType;
    /** Absolute file path */
    filePath: string;
  };
}

/**
 * Request to delete a thinking document
 */
export interface ThinkDeleteRequest extends BaseRequest {
  /** Document ID to delete */
  documentId: string;
}

/**
 * Response from think delete operation
 */
export interface ThinkDeleteResponse extends BaseResponse {
  /** Deleted document ID */
  deletedId?: string;
}

// ============================================================================
// Re-export Bulk & Utility Operation Types
// ============================================================================

export type {
  TagMemoryRequest,
  TagMemoryResponse,
  UntagMemoryRequest,
  UntagMemoryResponse,
  LinkMemoriesRequest,
  LinkMemoriesResponse,
  UnlinkMemoriesRequest,
  UnlinkMemoriesResponse,
  BulkProgress,
  BulkProgressCallback,
  BulkDeleteRequest,
  BulkDeleteResponse,
  BulkLinkRequest,
  BulkLinkResponse,
  ExportFormat,
  ExportedMemory,
  ExportPackage,
  ExportMemoriesRequest,
  ExportMemoriesResponse,
  ImportStrategy,
  ImportMemoriesRequest,
  ImportMemoriesResponse,
} from './operations.js';
