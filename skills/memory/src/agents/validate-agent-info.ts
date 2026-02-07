/**
 * Agent Information Validation (Phase E - T115)
 *
 * Validates AgentInfo structures for agent discovery operations.
 */

import type { AgentInfo } from '../types/agent-info.js';
import { Scope } from '../types/enums.js';

/**
 * Validation result for AgentInfo
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates agent name format (kebab-case, alphanumeric with hyphens)
 */
function isValidAgentName(name: string): boolean {
  // Must be kebab-case: lowercase alphanumeric with hyphens
  // Cannot start or end with hyphen, no consecutive hyphens
  const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return pattern.test(name);
}

/**
 * Validates an AgentInfo structure
 *
 * @param agentInfo - The agent info to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * const result = validateAgentInfo({
 *   name: 'typescript-pro',
 *   scope: Scope.AgentProject,
 *   path: '/path/to/agent'
 * });
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
export function validateAgentInfo(agentInfo: AgentInfo): ValidationResult {
  // Check required fields
  if (!agentInfo.name) {
    return { valid: false, error: 'AgentInfo must have a name' };
  }

  if (!agentInfo.scope) {
    return { valid: false, error: 'AgentInfo must have a scope' };
  }

  if (!agentInfo.path) {
    return { valid: false, error: 'AgentInfo must have a path' };
  }

  // Validate scope is an agent scope
  if (agentInfo.scope !== Scope.AgentProject && agentInfo.scope !== Scope.AgentGlobal) {
    return { valid: false, error: 'AgentInfo scope must be an agent scope (AgentProject or AgentGlobal)' };
  }

  // Validate agent name format
  if (!isValidAgentName(agentInfo.name)) {
    return {
      valid: false,
      error: 'AgentInfo name must be kebab-case (lowercase alphanumeric with hyphens)'
    };
  }

  // Validate optional numeric fields
  if (agentInfo.memoryCount !== undefined && agentInfo.memoryCount < 0) {
    return { valid: false, error: 'AgentInfo memoryCount must be non-negative' };
  }

  if (agentInfo.linkCount !== undefined && agentInfo.linkCount < 0) {
    return { valid: false, error: 'AgentInfo linkCount must be non-negative' };
  }

  // Validate date fields
  if (agentInfo.created !== undefined && !(agentInfo.created instanceof Date)) {
    return { valid: false, error: 'AgentInfo created must be a Date object' };
  }

  if (agentInfo.updated !== undefined && !(agentInfo.updated instanceof Date)) {
    return { valid: false, error: 'AgentInfo updated must be a Date object' };
  }

  return { valid: true };
}
