import { Scope } from '../types/enums.js';

/**
 * Checks if a scope is an agent scope (AgentProject or AgentGlobal)
 *
 * @param scope - Scope to check
 * @returns True if scope is AgentProject or AgentGlobal
 *
 * @example
 * isAgentScope(Scope.AgentProject) // => true
 * isAgentScope(Scope.Project) // => false
 */
export function isAgentScope(scope: Scope): scope is Scope.AgentProject | Scope.AgentGlobal {
  return scope === Scope.AgentProject || scope === Scope.AgentGlobal;
}
