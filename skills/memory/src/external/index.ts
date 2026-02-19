/**
 * External File Module - Public API
 *
 * This module discovers and indexes external Claude CLI files (CLAUDE.md, agent MEMORY.md)
 * as read-only graph nodes.
 */

export {
  discoverRuleFiles,
  discoverReminderFiles,
  discoverExternalFiles,
} from './external-file-discovery.js';

export {
  indexExternalFiles,
  type IndexExternalFilesRequest,
  type IndexExternalFilesResponse,
  type EmbeddingProvider,
} from './external-file-indexer.js';

export {
  ExternalFileKind,
  type ExternalFileEntry,
} from './external-file-types.js';
