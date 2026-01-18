/**
 * Think Module - Ephemeral Thinking Documents
 *
 * Provides deliberation and brainstorming capabilities with:
 * - Ephemeral documents stored in temporary/
 * - Multi-AI collaboration via --call claude
 * - Promotion to permanent memories
 * - Session tracking for conversation continuity
 *
 * @module think
 */

// Document CRUD operations
export {
  createThinkDocument,
  listThinkDocuments,
  showThinkDocument,
  deleteThinkDocument,
  thinkDocumentExists,
  readThinkDocumentRaw,
  getThinkFilePath,
  getTemporaryDir,
} from './document.js';

// Thought operations
export {
  addThought,
  addCounterArgument,
  addBranch,
  useThinkDocument,
  getCurrentThinkContext,
} from './thoughts.js';

// Conclude and promotion
export { concludeThinkDocument } from './conclude.js';

// AI invocation
export {
  invokeAI,
  buildUserPrompt,
  buildCliArgs,
  isClaudeCliAvailable,
  getClaudeCliVersion,
} from './ai-invoke.js';

// Discovery (agents and styles)
export {
  discoverAgents,
  discoverStyles,
  findAgent,
  findStyle,
  readAgentBody,
  readStyleContent,
  listAgentNames,
  listStyleNames,
  extractBody,
  type DiscoveryConfig,
  getDefaultConfig,
} from './discovery.js';

// State management
export {
  loadState,
  saveState,
  getCurrentDocumentId,
  getCurrentScope,
  setCurrentDocument,
  clearCurrentDocument,
  isCurrentDocument,
  getStatePath,
} from './state.js';

// ID generation
export {
  generateThinkId,
  isValidThinkId,
  parseThinkIdTimestamp,
} from './id-generator.js';

// Frontmatter utilities
export {
  parseThinkDocument,
  parseThinkFrontmatter,
  parseThoughts,
  serialiseThinkDocument,
  serialiseThinkFrontmatter,
  createThinkFrontmatter,
  formatThought,
  generateInitialContent,
  concludeFrontmatter,
  type ThinkParseResult,
} from './frontmatter.js';

// Validation
export {
  validateThinkCreate,
  validateThinkAdd,
  validateThinkConclude,
  validateThinkUse,
  validateThinkDelete,
  isValidTopic,
  isValidThinkScope,
  isValidThinkStatus,
  isValidThoughtType,
  isValidPromotionType,
  isValidThoughtContent,
  type ThinkValidationError,
  type ThinkValidationResult,
} from './validation.js';

// Re-export types from types module for convenience
export type {
  ThinkFrontmatter,
  ThoughtEntry,
  ThinkDocument,
  ThinkDocumentSummary,
  ThinkState,
  AICallOptions,
  AICallResult,
  DiscoveredFile,
} from '../types/think.js';

// Re-export enums
export { ThinkStatus, ThoughtType } from '../types/enums.js';
