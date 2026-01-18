/**
 * Bulk Operations Module
 *
 * Pattern-based operations for managing multiple memories.
 */

export { filterMemories, countMatches, matchGlobPattern, matchTags } from './pattern-matcher.js';
export type { FilterCriteria } from './pattern-matcher.js';

export { bulkDelete } from './bulk-delete.js';
export { bulkLink } from './bulk-link.js';
export { bulkMove } from './bulk-move.js';
export { bulkTag } from './bulk-tag.js';
export { bulkUnlink } from './bulk-unlink.js';
export { bulkPromote } from './bulk-promote.js';
