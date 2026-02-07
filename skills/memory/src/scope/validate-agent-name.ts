import { sanitiseAgentName } from './sanitise-agent-name.js';

/**
 * Validation result for agent names
 */
export interface ValidationResult {
  /** Whether the name is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Suggested sanitised version if invalid */
  suggestion?: string;
}

/**
 * Reserved agent names that cannot be used
 * Includes scope names, system directories, and system-related terms
 */
const RESERVED_NAMES = new Set([
  // Scope names
  'project',
  'global',
  'local',
  'enterprise',
  'agent-project',
  'agent-global',
  // Memory system directories/files (would conflict with storage structure)
  'permanent',
  'temporary',
  'agents',
  'index',
  'graph',
  'embeddings',
  'cache',
  // System names
  'system',
  'admin',
  'root',
  'default',
  'config',
  'settings',
]);

/** Maximum length for agent names (filesystem compatibility) */
const MAX_AGENT_NAME_LENGTH = 64;

/**
 * Validates an agent name against format and reserved name rules
 *
 * Rules:
 * - Must be lowercase alphanumeric with hyphens only
 * - Cannot start or end with hyphen
 * - Cannot have consecutive hyphens
 * - Cannot be empty
 * - Cannot exceed 64 characters
 * - Cannot be a reserved name
 *
 * @param name - Agent name to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * validateAgentName('typescript-expert') // => { valid: true }
 * validateAgentName('TypeScript Expert') // => { valid: false, error: '...', suggestion: 'typescript-expert' }
 * validateAgentName('project') // => { valid: false, error: 'reserved name' }
 */
export function validateAgentName(name: string): ValidationResult {
  // Check empty
  if (!name || name.trim() === '') {
    return {
      valid: false,
      error: 'Agent name cannot be empty',
    };
  }

  // Check length
  if (name.length > MAX_AGENT_NAME_LENGTH) {
    return {
      valid: false,
      error: `Agent name too long (max ${MAX_AGENT_NAME_LENGTH} characters)`,
    };
  }

  // Check format (lowercase alphanumeric + hyphens only)
  if (!/^[a-z0-9-]+$/.test(name)) {
    const suggestion = sanitiseAgentName(name);
    return {
      valid: false,
      error: 'Agent name must be lowercase alphanumeric with hyphens only',
      suggestion: suggestion || undefined,
    };
  }

  // Check leading/trailing hyphens
  if (name.startsWith('-') || name.endsWith('-')) {
    return {
      valid: false,
      error: 'Agent name cannot start or end with hyphen',
    };
  }

  // Check consecutive hyphens
  if (/-{2,}/.test(name)) {
    return {
      valid: false,
      error: 'Agent name cannot have consecutive hyphens',
    };
  }

  // Check reserved names
  if (RESERVED_NAMES.has(name.toLowerCase())) {
    return {
      valid: false,
      error: `Agent name "${name}" is reserved`,
    };
  }

  return { valid: true };
}
