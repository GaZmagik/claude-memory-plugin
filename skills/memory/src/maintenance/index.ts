/**
 * Maintenance Module
 *
 * Functions for maintaining memory system health:
 * - prune: Remove expired temporary memories
 * - sync: Reconcile graph/index/disk
 * - repair: Run sync + validate
 * - reindex: Re-add orphan files to index
 * - sync-frontmatter: Bulk sync frontmatter from graph
 */

export { pruneMemories, type PruneRequest, type PruneResponse } from './prune.js';
export { syncMemories, type SyncRequest, type SyncResponse } from './sync.js';
export { reindexMemory, type ReindexRequest, type ReindexResponse } from './reindex.js';
export { syncFrontmatter, type SyncFrontmatterRequest, type SyncFrontmatterResponse } from './sync-frontmatter.js';
export { renameMemory, type RenameRequest, type RenameResponse } from './rename.js';
export { moveMemory, type MoveRequest, type MoveResponse } from './move.js';
export { promoteMemory, type PromoteRequest, type PromoteResponse } from './promote.js';
export { archiveMemory, type ArchiveRequest, type ArchiveResponse } from './archive.js';
