import { Scope } from '../types/enums.js';
import { sanitiseAgentName } from './sanitise-agent-name.js';
import { validateAgentName, ValidationResult } from './validate-agent-name.js';
import { isAgentScope } from './is-agent-scope.js';

/**
 * Agent context for scoped memory operations
 */
export interface AgentContext {
  /** Sanitised agent name */
  agentName: string;
  /** Agent scope (AgentProject or AgentGlobal) */
  scope: Scope.AgentProject | Scope.AgentGlobal;
}

/**
 * Options for creating agent context
 */
export interface CreateAgentContextOptions {
  /** Agent name (will be sanitised) */
  agentName: string;
  /** Agent scope */
  scope: Scope;
}

/**
 * Create agent context with sanitised and validated agent name
 *
 * @param options - Agent name and scope
 * @returns Agent context with sanitised name
 * @throws Error if agent name is invalid or scope is not an agent scope
 *
 * @example
 * createAgentContext({ agentName: 'TypeScript Expert', scope: Scope.AgentProject })
 * // => { agentName: 'typescript-expert', scope: Scope.AgentProject }
 */
export function createAgentContext(options: CreateAgentContextOptions): AgentContext {
  const { agentName, scope } = options;

  // Validate scope is an agent scope
  if (!isAgentScope(scope)) {
    throw new Error(`Scope must be an agent scope (AgentProject or AgentGlobal), got: ${scope}`);
  }

  // Validate agent name is not empty
  if (!agentName || agentName.trim() === '') {
    throw new Error('agentName cannot be empty');
  }

  // Sanitise agent name
  const sanitised = sanitiseAgentName(agentName);

  // Validate sanitised name
  const validation = validateAgentName(sanitised);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid agent name');
  }

  return {
    agentName: sanitised,
    scope: scope as Scope.AgentProject | Scope.AgentGlobal,
  };
}

/**
 * Validate an existing agent context object
 *
 * @param context - Agent context to validate
 * @returns Validation result
 *
 * @example
 * validateAgentContext({ agentName: 'typescript-expert', scope: Scope.AgentProject })
 * // => { valid: true }
 *
 * validateAgentContext({ agentName: 'TypeScript Expert', scope: Scope.AgentProject })
 * // => { valid: false, error: '...' }
 */
export function validateAgentContext(context: {
  agentName: string;
  scope: Scope;
}): ValidationResult {
  // Check scope is an agent scope
  if (!isAgentScope(context.scope)) {
    return {
      valid: false,
      error: `Scope must be an agent scope, got: ${context.scope}`,
    };
  }

  // Check agent name is not empty
  if (!context.agentName || context.agentName.trim() === '') {
    return {
      valid: false,
      error: 'agentName cannot be empty',
    };
  }

  // Validate agent name format (should already be sanitised)
  const validation = validateAgentName(context.agentName);
  if (!validation.valid) {
    return {
      valid: false,
      error: `Agent name is invalid: ${validation.error}`,
    };
  }

  return { valid: true };
}
