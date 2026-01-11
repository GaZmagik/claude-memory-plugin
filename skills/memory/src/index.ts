/**
 * Claude Memory Plugin
 *
 * TypeScript implementation of the memory management system.
 * Provides CRUD operations, semantic search, graph operations, and health monitoring.
 */

// ============================================================================
// Core CRUD Operations
// ============================================================================

export { writeMemory } from './core/write.js';
export { readMemory } from './core/read.js';
export { listMemories } from './core/list.js';
export { deleteMemory } from './core/delete.js';
export { searchMemories } from './core/search.js';
export { semanticSearchMemories } from './core/semantic-search.js';

// ============================================================================
// Index Operations
// ============================================================================

export { loadIndex, addToIndex, removeFromIndex, rebuildIndex } from './core/index.js';

// ============================================================================
// Frontmatter Operations
// ============================================================================

export {
  parseFrontmatter,
  serialiseFrontmatter,
  parseMemoryFile,
  serialiseMemoryFile,
  createFrontmatter,
  updateFrontmatter,
} from './core/frontmatter.js';

// ============================================================================
// Scope Resolution
// ============================================================================

export { findGitRoot, isInGitRepository, getProjectName } from './scope/git-utils.js';
export { loadConfig, getEnterpriseConfig, getDefaultScopeConfig } from './scope/config.js';
export { getEnterprisePath, getEnterpriseStatus } from './scope/enterprise.js';
export {
  resolveScope,
  getScopePath,
  getDefaultScope,
  isEnterpriseEnabled,
  getAllAccessibleScopes,
} from './scope/resolver.js';
export { selectDefaultScope, getRecommendedScope } from './scope/defaults.js';
export { ensureLocalScopeGitignored, isPathGitignored } from './scope/gitignore.js';

// ============================================================================
// Search Operations
// ============================================================================

export {
  generateEmbedding,
  loadEmbeddingCache,
  saveEmbeddingCache,
  getEmbeddingForMemory,
  batchGenerateEmbeddings,
  createMockProvider,
  createOllamaProvider,
  type EmbeddingProvider,
  type EmbeddingCache,
} from './search/embedding.js';

export {
  cosineSimilarity,
  findSimilarMemories,
  rankBySimilarity,
  findPotentialDuplicates,
} from './search/similarity.js';

export { semanticSearch, findSimilarToMemory } from './search/semantic.js';

// ============================================================================
// Graph Operations
// ============================================================================

export {
  createGraph,
  loadGraph,
  saveGraph,
  addNode,
  removeNode,
  getNode,
  getAllNodes,
  type MemoryGraph,
  type GraphNode,
} from './graph/structure.js';

export {
  addEdge,
  removeEdge,
  getEdges,
  getInboundEdges,
  getOutboundEdges,
  hasEdge,
  getNeighbours,
  findOrphanedNodes,
  bulkAddEdges,
  type GraphEdge,
} from './graph/edges.js';

export {
  bfsTraversal,
  dfsTraversal,
  findReachable,
  findPredecessors,
  findShortestPath,
  getSubgraph,
  findConnectedComponents,
  calculateImpact,
} from './graph/traversal.js';

export { generateMermaid, generateTextGraph, generateDot } from './graph/mermaid.js';

// ============================================================================
// Quality & Health
// ============================================================================

export {
  checkHealth,
  calculateHealthScore,
  formatHealthReport,
  type HealthReport,
  type HealthIssue,
  type HealthStatus,
} from './quality/health.js';

// ============================================================================
// Formatting
// ============================================================================

export {
  getScopeIndicator,
  formatMemorySummary,
  formatSearchResult,
  formatMemoryList,
  formatSearchResults,
  getScopeDescription,
  formatScopeHierarchy,
} from './core/formatters.js';

// ============================================================================
// Types
// ============================================================================

export { MemoryType, Scope, Severity } from './types/enums.js';

export type {
  WriteMemoryRequest,
  WriteMemoryResponse,
  ReadMemoryRequest,
  ReadMemoryResponse,
  ListMemoriesRequest,
  ListMemoriesResponse,
  DeleteMemoryRequest,
  DeleteMemoryResponse,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
  SemanticSearchRequest,
  SemanticSearchResponse,
  MemorySummary,
  SearchResult,
} from './types/api.js';

export type { MemoryFrontmatter, IndexEntry, MemoryIndex } from './types/memory.js';

// ============================================================================
// Utilities
// ============================================================================

export { generateSlug, generateUniqueId } from './core/slug.js';
export { createLogger } from './core/logger.js';
export { fileExists, readFile, writeFileAtomic, ensureDir } from './core/fs-utils.js';
