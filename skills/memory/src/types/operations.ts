/**
 * Bulk & Utility Operation Type Definitions
 *
 * Types for tag, link, bulk, and export/import operations.
 */

import type { MemoryType, Scope } from './enums.js';
import type { MemoryFrontmatter } from './memory.js';
import type { BaseRequest, BaseResponse } from './api.js';

// ============================================================================
// Tag Operations
// ============================================================================

/**
 * Request to add tags to an existing memory
 */
export interface TagMemoryRequest extends BaseRequest {
  /** Memory ID */
  id: string;
  /** Tags to add (without + prefix) */
  tags: string[];
  /** Scope to search in (optional) */
  scope?: Scope;
}

/**
 * Response from tag operation
 */
export interface TagMemoryResponse extends BaseResponse {
  /** Updated memory ID */
  id?: string;
  /** Previous tags */
  previousTags?: string[];
  /** New tags after operation */
  newTags?: string[];
}

/**
 * Request to remove tags from an existing memory
 */
export interface UntagMemoryRequest extends BaseRequest {
  /** Memory ID */
  id: string;
  /** Tags to remove (without - prefix) */
  tags: string[];
  /** Scope to search in (optional) */
  scope?: Scope;
}

/**
 * Response from untag operation
 */
export interface UntagMemoryResponse extends BaseResponse {
  /** Updated memory ID */
  id?: string;
  /** Previous tags */
  previousTags?: string[];
  /** New tags after operation */
  newTags?: string[];
  /** Tags that were not found */
  notFound?: string[];
}

// ============================================================================
// Link Operations
// ============================================================================

/**
 * Request to create a link between memories
 */
export interface LinkMemoriesRequest extends BaseRequest {
  /** Source memory ID */
  source: string;
  /** Target memory ID */
  target: string;
  /** Relationship type (default: 'relates-to') */
  relation?: string;
}

/**
 * Response from link operation
 */
export interface LinkMemoriesResponse extends BaseResponse {
  /** Created edge details */
  edge?: {
    source: string;
    target: string;
    label: string;
  };
  /** Whether the link already existed */
  alreadyExists?: boolean;
}

/**
 * Request to remove a link between memories
 */
export interface UnlinkMemoriesRequest extends BaseRequest {
  /** Source memory ID */
  source: string;
  /** Target memory ID */
  target: string;
  /** Specific relation to remove (optional, removes all if not specified) */
  relation?: string;
}

/**
 * Response from unlink operation
 */
export interface UnlinkMemoriesResponse extends BaseResponse {
  /** Number of edges removed */
  removedCount?: number;
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Progress information for bulk operations
 */
export interface BulkProgress {
  /** Current item being processed */
  current: number;
  /** Total items to process */
  total: number;
  /** Current item ID */
  currentId?: string;
  /** Phase of operation */
  phase: 'scanning' | 'processing' | 'complete';
}

/**
 * Progress callback for bulk operations
 */
export type BulkProgressCallback = (progress: BulkProgress) => void;

/**
 * Request to delete multiple memories
 */
export interface BulkDeleteRequest extends BaseRequest {
  /** Glob pattern to match memory IDs (e.g., "decision-*") */
  pattern?: string;
  /** Filter by tags (AND logic) */
  tags?: string[];
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by scope */
  scope?: Scope;
  /** Preview mode - show what would be deleted without deleting */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: BulkProgressCallback;
}

/**
 * Response from bulk delete operation
 */
export interface BulkDeleteResponse extends BaseResponse {
  /** Number of memories deleted (or would be deleted in dry-run) */
  deletedCount?: number;
  /** IDs of deleted memories */
  deletedIds?: string[];
  /** IDs that failed to delete */
  failedIds?: Array<{ id: string; reason: string }>;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

/**
 * Request to create links between multiple memories
 */
export interface BulkLinkRequest extends BaseRequest {
  /** Glob pattern to match source memory IDs */
  sourcePattern?: string;
  /** Source memory IDs (alternative to pattern) */
  sourceIds?: string[];
  /** Target memory ID */
  target: string;
  /** Relationship type */
  relation?: string;
  /** Preview mode */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: BulkProgressCallback;
}

/**
 * Response from bulk link operation
 */
export interface BulkLinkResponse extends BaseResponse {
  /** Number of links created */
  createdCount?: number;
  /** Links that were created */
  createdLinks?: Array<{ source: string; target: string }>;
  /** Links that already existed */
  existingCount?: number;
  /** Links that failed */
  failedLinks?: Array<{ source: string; reason: string }>;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

/**
 * Shared filter criteria for bulk operations
 */
export interface BulkFilterCriteria {
  /** Glob pattern to match memory IDs (e.g., "decision-*") */
  pattern?: string;
  /** Explicit memory IDs (alternative to pattern) */
  ids?: string[];
  /** Filter by tags (AND logic) */
  tags?: string[];
  /** Filter by memory type */
  type?: MemoryType;
  /** Filter by current scope */
  sourceScope?: Scope;
}

/**
 * Request to move multiple memories to a different scope
 */
export interface BulkMoveRequest extends BaseRequest, BulkFilterCriteria {
  /** Target scope to move memories to */
  targetScope: Scope;
  /** Preview mode - show what would be moved without moving */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: BulkProgressCallback;
}

/**
 * Response from bulk move operation
 */
export interface BulkMoveResponse extends BaseResponse {
  /** Number of memories moved (or would be moved in dry-run) */
  movedCount?: number;
  /** IDs of moved memories */
  movedIds?: string[];
  /** IDs that failed to move */
  failedIds?: Array<{ id: string; reason: string }>;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

/**
 * Request to add or remove tags from multiple memories
 */
export interface BulkTagRequest extends BaseRequest, BulkFilterCriteria {
  /** Tags to add */
  addTags?: string[];
  /** Tags to remove */
  removeTags?: string[];
  /** Preview mode - show what would be modified without modifying */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: BulkProgressCallback;
}

/**
 * Response from bulk tag operation
 */
export interface BulkTagResponse extends BaseResponse {
  /** Number of memories modified (or would be modified in dry-run) */
  modifiedCount?: number;
  /** IDs of modified memories */
  modifiedIds?: string[];
  /** IDs that failed to modify */
  failedIds?: Array<{ id: string; reason: string }>;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

/**
 * Request to remove links from multiple memories to a target
 */
export interface BulkUnlinkRequest extends BaseRequest, BulkFilterCriteria {
  /** Target memory ID to unlink from */
  target: string;
  /** Specific relation to remove (optional, removes all if not specified) */
  relation?: string;
  /** Preview mode - show what would be unlinked without unlinking */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: BulkProgressCallback;
}

/**
 * Response from bulk unlink operation
 */
export interface BulkUnlinkResponse extends BaseResponse {
  /** Number of links removed (or would be removed in dry-run) */
  unlinkedCount?: number;
  /** Link pairs that were removed */
  unlinkedPairs?: Array<{ source: string; target: string }>;
  /** IDs that failed to unlink */
  failedIds?: Array<{ id: string; reason: string }>;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

/**
 * Request to promote or demote multiple memories to a different type
 */
export interface BulkPromoteRequest extends BaseRequest, BulkFilterCriteria {
  /** Target memory type to promote/demote to */
  targetType: MemoryType;
  /** Preview mode - show what would be promoted without promoting */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: BulkProgressCallback;
}

/**
 * Response from bulk promote/demote operation
 */
export interface BulkPromoteResponse extends BaseResponse {
  /** Number of memories promoted (or would be promoted in dry-run) */
  promotedCount?: number;
  /** IDs of promoted memories */
  promotedIds?: string[];
  /** IDs that failed to promote */
  failedIds?: Array<{ id: string; reason: string }>;
  /** Whether this was a dry run */
  dryRun?: boolean;
}

// ============================================================================
// Export/Import Operations
// ============================================================================

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'yaml';

/**
 * Exported memory structure
 */
export interface ExportedMemory {
  /** Memory ID */
  id: string;
  /** Frontmatter */
  frontmatter: MemoryFrontmatter;
  /** Content body */
  content: string;
}

/**
 * Export package structure
 */
export interface ExportPackage {
  /** Export version for compatibility */
  version: string;
  /** Export timestamp */
  exportedAt: string;
  /** Source scope */
  sourceScope?: Scope;
  /** Memories */
  memories: ExportedMemory[];
  /** Graph data (if includeGraph) */
  graph?: {
    nodes: Array<{ id: string; type: string }>;
    edges: Array<{ source: string; target: string; label: string }>;
  };
}

/**
 * Request to export memories
 */
export interface ExportMemoriesRequest extends BaseRequest {
  /** Export format */
  format?: ExportFormat;
  /** Filter by scope */
  scope?: Scope;
  /** Filter by type */
  type?: MemoryType;
  /** Filter by tags */
  tags?: string[];
  /** Include graph relationships */
  includeGraph?: boolean;
}

/**
 * Response from export operation
 */
export interface ExportMemoriesResponse extends BaseResponse {
  /** Exported data */
  data?: ExportPackage;
  /** Serialised string (in requested format) */
  serialised?: string;
  /** Number of memories exported */
  count?: number;
}

/**
 * Import conflict resolution strategy
 */
export type ImportStrategy = 'merge' | 'replace' | 'skip';

/**
 * Request to import memories
 */
export interface ImportMemoriesRequest extends BaseRequest {
  /** Import data (parsed) */
  data?: ExportPackage;
  /** Raw import string (JSON or YAML) */
  raw?: string;
  /** Conflict resolution strategy */
  strategy?: ImportStrategy;
  /** Target scope (override source scope) */
  targetScope?: Scope;
  /** Preview mode */
  dryRun?: boolean;
}

/**
 * Response from import operation
 */
export interface ImportMemoriesResponse extends BaseResponse {
  /** Number of memories imported */
  importedCount?: number;
  /** Memories that were merged */
  mergedCount?: number;
  /** Memories that were skipped (already exist) */
  skippedCount?: number;
  /** Memories that were replaced */
  replacedCount?: number;
  /** Import failures */
  failures?: Array<{ id: string; reason: string }>;
  /** Whether this was a dry run */
  dryRun?: boolean;
}
