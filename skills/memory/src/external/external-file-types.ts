/**
 * External File Type Definitions
 *
 * Types for discovering and indexing external Claude CLI files (CLAUDE.md, agent MEMORY.md)
 * as read-only graph nodes.
 */

import type { Scope } from '../types/enums.js';

/**
 * Distinguishes sub-types of external files within rule and reminder categories
 */
export enum ExternalFileKind {
  /** CLAUDE.md at any level (prescriptive instructions) */
  ClaudeInstructions = 'claude-instructions',

  /** CLAUDE.local.md at any level (local-only prescriptive instructions) */
  ClaudeLocalInstructions = 'claude-local-instructions',

  /** File in .claude/rules/ or ~/.claude/rules/ directory */
  RulesFile = 'rules-file',

  /** MEMORY.md file in agent-memory directory (primary agent summary) */
  AgentMemorySummary = 'agent-memory-summary',

  /** Sub-file in agent-memory directory (e.g., patterns.md, debugging.md) */
  AgentMemorySubFile = 'agent-memory-sub-file',
}

/**
 * Represents a discovered external file before indexing
 */
export interface ExternalFileEntry {
  /** Absolute canonical path to the external file */
  absolutePath: string;

  /** Sub-kind of external file */
  kind: ExternalFileKind;

  /** Storage scope for graph/index */
  scope: Scope;

  /** Agent name (required for reminder files, undefined for rule files) */
  agentName?: string;

  /** Content hash (SHA-256 first 16 chars) for cache invalidation */
  contentHash: string;

  /** Deterministic ID for graph node */
  id: string;

  /** Human-readable title derived from filename */
  title: string;

  /** ISO 8601 timestamp when file was last modified */
  modifiedTime: string;
}
