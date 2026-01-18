/**
 * Think Document Type Definitions
 *
 * Type definitions for ephemeral thinking documents used for
 * brainstorming and deliberation.
 */

import type { MemoryId, SessionId, ThinkId } from './branded.js';
import type { MemoryType, Scope, ThinkStatus, ThoughtType } from './enums.js';

/**
 * Think document frontmatter (extends base memory frontmatter)
 */
export interface ThinkFrontmatter {
  /** Always breadcrumb type for think documents */
  type: MemoryType.Breadcrumb;
  /** Document title (auto-generated from topic) */
  title: string;
  /** The deliberation topic */
  topic: string;
  /** Document status: active or concluded */
  status: ThinkStatus;
  /** ISO 8601 creation timestamp */
  created: string;
  /** ISO 8601 last updated timestamp */
  updated: string;
  /** Categorisation tags */
  tags: string[];
  /** Storage scope (Project or Local) */
  scope: Scope;
  /** Conclusion text (set when concluded) */
  conclusion?: string;
  /** ID of the promoted memory (if promoted) */
  promotedTo?: MemoryId;
}

/**
 * Individual thought entry within a document
 */
export interface ThoughtEntry {
  /** ISO 8601 timestamp when thought was added */
  timestamp: string;
  /** Type of thought */
  type: ThoughtType;
  /** The thought content */
  content: string;
  /** Attribution (e.g., "Claude", "User") */
  by?: string;
  /** AI session ID for --resume support */
  sessionId?: SessionId;
  /** Output style used (if AI-generated) */
  outputStyle?: string;
  /** Agent used (if AI-generated) */
  agent?: string;
}

/**
 * Complete think document
 */
export interface ThinkDocument {
  /** Document ID (thought-YYYYMMDD-HHMMSSmmm format) */
  id: ThinkId;
  /** Frontmatter metadata */
  frontmatter: ThinkFrontmatter;
  /** Parsed thought entries */
  thoughts: ThoughtEntry[];
  /** Raw markdown content */
  rawContent: string;
  /** Absolute file path */
  filePath: string;
}

/**
 * State file tracking current document per scope
 */
export interface ThinkState {
  /** Current document ID (null if none selected) */
  currentDocumentId: ThinkId | null;
  /** Scope of the current document */
  currentScope: Scope | null;
  /** ISO 8601 timestamp of last state update */
  lastUpdated: string;
}

/**
 * Summary of a think document for list operations
 */
export interface ThinkDocumentSummary {
  /** Document ID */
  id: ThinkId;
  /** Topic being deliberated */
  topic: string;
  /** Current status */
  status: ThinkStatus;
  /** Storage scope */
  scope: Scope;
  /** Number of thoughts in document */
  thoughtCount: number;
  /** Creation timestamp */
  created: string;
  /** Last update timestamp */
  updated: string;
  /** Whether this is the current document */
  isCurrent: boolean;
}

/**
 * Options for AI invocation via --call
 */
export interface AICallOptions {
  /** Output style name (from output-styles/) */
  outputStyle?: string;
  /** Agent name (from agents/) */
  agent?: string;
  /** Model override (default: haiku) */
  model?: string;
  /** Resume existing session ID */
  resume?: string;
  /** Tools to enable for the AI */
  tools?: string[];
  /** User guidance text (optional context for the AI) */
  guidance?: string;
}

/**
 * Result of AI invocation
 */
export interface AICallResult {
  /** Whether the call succeeded */
  success: boolean;
  /** Generated thought content (if successful) */
  content?: string;
  /** Session ID for future --resume */
  sessionId?: SessionId;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Discovered agent or style file
 */
export interface DiscoveredFile {
  /** File name without extension */
  name: string;
  /** Absolute file path */
  path: string;
  /** Source scope (local, plugin, global, enterprise) */
  source: 'local' | 'plugin' | 'global' | 'enterprise';
  /** Description from frontmatter (if available) */
  description?: string;
}
