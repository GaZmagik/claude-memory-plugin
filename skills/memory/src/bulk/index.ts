/**
 * Bulk Operations Module
 *
 * Pattern-based operations for managing multiple memories.
 */

export { filterMemories, countMatches, matchGlobPattern, matchTags } from './pattern-matcher.js';
export type { FilterCriteria } from './pattern-matcher.js';

export { bulkDelete } from './bulk-delete.js';
export { bulkLink } from './bulk-link.js';
