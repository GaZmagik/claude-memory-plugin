/**
 * Format scope indicators for display (Phase E - T113)
 *
 * Formats scope values into readable indicators with optional agent names,
 * compact formatting, and colour support.
 */

import { Scope } from '../types/enums.js';

export interface FormatScopeOptions {
  /** Use compact format (e.g., [a:name] instead of [agent:name]) */
  compact?: boolean;
  /** Include ANSI colour codes */
  color?: boolean;
}

/**
 * Sanitises agent name for use in scope indicators
 */
function sanitizeAgentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Formats a scope value into a readable indicator
 *
 * @param scope - The scope to format
 * @param agentName - Optional agent name for agent scopes
 * @param options - Formatting options
 * @returns Formatted scope indicator (e.g., '[project]', '[agent:typescript-pro]')
 *
 * @example
 * formatScopeIndicator(Scope.Project) // '[project]'
 * formatScopeIndicator(Scope.AgentProject, 'typescript-pro') // '[agent:typescript-pro]'
 * formatScopeIndicator(Scope.AgentProject, 'typescript-pro', { compact: true }) // '[a:typescript-pro]'
 */
export function formatScopeIndicator(
  scope: Scope,
  agentName?: string,
  options: FormatScopeOptions = {}
): string {
  const { compact = false, color = false } = options;

  let indicator: string;

  switch (scope) {
    case Scope.Project:
      indicator = '[project]';
      break;
    case Scope.Global:
      indicator = '[global]';
      break;
    case Scope.Local:
      indicator = '[local]';
      break;
    case Scope.AgentProject:
      if (agentName) {
        const sanitised = sanitizeAgentName(agentName);
        indicator = compact ? `[a:${sanitised}]` : `[agent:${sanitised}]`;
      } else {
        indicator = compact ? '[a:project]' : '[agent:project]';
      }
      break;
    case Scope.AgentGlobal:
      if (agentName) {
        const sanitised = sanitizeAgentName(agentName);
        indicator = compact ? `[a:${sanitised}@g]` : `[agent:${sanitised}@global]`;
      } else {
        indicator = compact ? '[a:global]' : '[agent:global]';
      }
      break;
    default:
      indicator = '[unknown]';
  }

  if (color) {
    // Add ANSI colour codes based on scope type
    const colorCode = getScopeColor(scope);
    return `${colorCode}${indicator}\x1b[0m`; // Reset colour after
  }

  return indicator;
}

/**
 * Gets ANSI colour code for a scope
 */
function getScopeColor(scope: Scope): string {
  switch (scope) {
    case Scope.Project:
      return '\x1b[36m'; // Cyan
    case Scope.Global:
      return '\x1b[35m'; // Magenta
    case Scope.Local:
      return '\x1b[33m'; // Yellow
    case Scope.AgentProject:
      return '\x1b[32m'; // Green
    case Scope.AgentGlobal:
      return '\x1b[34m'; // Blue
    default:
      return '\x1b[37m'; // White
  }
}
