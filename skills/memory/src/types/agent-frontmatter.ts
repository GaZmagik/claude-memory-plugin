/**
 * Agent-Scoped Memory Frontmatter Type
 *
 * Type alias for memory frontmatter with required agent field and agent scope constraint.
 */

import type { MemoryFrontmatter } from './memory.js';
import { Scope } from './enums.js';

/**
 * Frontmatter for agent-scoped memories.
 *
 * This is a refinement of MemoryFrontmatter that enforces:
 * - agent field is required (not optional)
 * - scope must be either AgentProject or AgentGlobal
 */
export type AgentMemoryFrontmatter = MemoryFrontmatter & {
  /** Agent name (required for agent-scoped memories) */
  agent: string;
  /** Scope must be an agent scope */
  scope: Scope.AgentProject | Scope.AgentGlobal;
};

/**
 * Type guard to check if frontmatter is agent-scoped.
 *
 * @param frontmatter - The frontmatter to check
 * @returns True if frontmatter has required agent field and agent scope
 */
export function isAgentMemoryFrontmatter(
  frontmatter: MemoryFrontmatter
): frontmatter is AgentMemoryFrontmatter {
  return (
    typeof frontmatter.agent === 'string' &&
    frontmatter.agent.length > 0 &&
    (frontmatter.scope === Scope.AgentProject || frontmatter.scope === Scope.AgentGlobal)
  );
}
