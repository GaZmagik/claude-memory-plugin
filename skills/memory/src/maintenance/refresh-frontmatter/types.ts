/**
 * Types for Refresh Frontmatter
 *
 * Interfaces for the refresh frontmatter request and response.
 */

/**
 * Refresh frontmatter request options
 */
export interface RefreshFrontmatterRequest {
  /** Base path for memory storage */
  basePath: string;
  /** Dry run - report changes without applying */
  dryRun?: boolean;
  /** Only refresh specific IDs (optional) */
  ids?: string[];
  /** Project name to use (optional - auto-detected if not provided) */
  project?: string;
}

/**
 * Refresh frontmatter response
 */
export interface RefreshFrontmatterResponse {
  status: 'success' | 'error';
  /** Number of files updated */
  updated: number;
  /** IDs of files updated */
  updatedIds: string[];
  /** Files that would be updated (dry run only) */
  wouldUpdate?: string[];
  /** Files skipped (no changes needed) */
  skipped: number;
  /** Number of embeddings migrated */
  embeddingsMigrated: number;
  /** Number of think→thought ID migrations */
  thinkToThoughtMigrated: number;
  /** Number of graph node types updated */
  graphTypesUpdated: number;
  /** Project name used */
  project?: string;
  /** Any errors encountered */
  errors?: string[];
}
