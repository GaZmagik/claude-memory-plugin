/**
 * Agent Information Types (Phase E - T114)
 *
 * Defines the structure for agent discovery and listing operations.
 */

import type { Scope, MemoryType } from './enums.js';

/**
 * Information about an agent and its memory collection
 */
export interface AgentInfo {
  /** Agent name (kebab-case, alphanumeric with hyphens) */
  name: string;

  /** Agent scope (must be AgentProject or AgentGlobal) */
  scope: Scope.AgentProject | Scope.AgentGlobal;

  /** Absolute path to agent's memory directory */
  path: string;

  /** Number of memories in agent's collection (optional) */
  memoryCount?: number;

  /** Number of links in agent's graph (optional) */
  linkCount?: number;

  /** Tags used in agent's memories (optional) */
  tags?: string[];

  /** Memory types present in agent's collection (optional) */
  types?: MemoryType[];

  /** Date of oldest memory (optional) */
  created?: Date;

  /** Date of most recent memory (optional) */
  updated?: Date;
}

/**
 * Response from agent listing operations
 */
export interface ListAgentsResponse {
  /** List of discovered agents */
  agents: AgentInfo[];

  /** Total number of agents found */
  count: number;

  /** Scope filter applied (if any) */
  scope?: Scope.AgentProject | Scope.AgentGlobal;
}
