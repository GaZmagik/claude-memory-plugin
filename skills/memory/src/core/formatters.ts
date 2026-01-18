/**
 * T056: Output formatting with scope indicators
 *
 * Formats memory output with scope indicators for display.
 */

import { Scope } from '../types/enums.js';
import type { MemorySummary, SearchResult } from '../types/api.js';

/**
 * Scope indicator format options
 */
export interface ScopeIndicatorOptions {
  /** Whether to use brackets around the indicator */
  brackets?: boolean;
  /** Whether to use short form (e, l, p, g) */
  short?: boolean;
  /** Whether to use colour codes (for terminal) */
  colour?: boolean;
}

/**
 * Get the scope indicator string
 */
export function getScopeIndicator(
  scope: Scope,
  options: ScopeIndicatorOptions = {}
): string {
  const { brackets = true, short = false } = options;

  let indicator: string;

  if (short) {
    switch (scope) {
      case Scope.Enterprise:
        indicator = 'E';
        break;
      case Scope.Local:
        indicator = 'L';
        break;
      case Scope.Project:
        indicator = 'P';
        break;
      case Scope.Global:
        indicator = 'G';
        break;
    }
  } else {
    indicator = scope;
  }

  return brackets ? `[${indicator}]` : indicator;
}

/**
 * Format a memory summary for display
 */
export function formatMemorySummary(
  memory: MemorySummary,
  options: ScopeIndicatorOptions = {}
): string {
  const scopeIndicator = getScopeIndicator(memory.scope, options);
  const tags = memory.tags.length > 0 ? ` (${memory.tags.join(', ')})` : '';

  return `${scopeIndicator} ${memory.type}/${memory.id}: ${memory.title}${tags}`;
}

/**
 * Format a search result for display
 */
export function formatSearchResult(
  result: SearchResult,
  options: ScopeIndicatorOptions = {}
): string {
  const scopeIndicator = result.scope
    ? getScopeIndicator(result.scope, options)
    : '';
  const score = `(${Math.round(result.score * 100)}%)`;
  const prefix = scopeIndicator ? `${scopeIndicator} ` : '';

  let output = `${prefix}${result.type}/${result.id}: ${result.title} ${score}`;

  if (result.snippet) {
    output += `\n    ${result.snippet}`;
  }

  return output;
}

/**
 * Format a list of memories for display
 */
export function formatMemoryList(
  memories: MemorySummary[],
  options: ScopeIndicatorOptions = {}
): string {
  if (memories.length === 0) {
    return 'No memories found.';
  }

  return memories.map(m => formatMemorySummary(m, options)).join('\n');
}

/**
 * Format search results for display
 */
export function formatSearchResults(
  results: SearchResult[],
  options: ScopeIndicatorOptions = {}
): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  return results.map(r => formatSearchResult(r, options)).join('\n\n');
}

/**
 * Get scope description for help text
 */
export function getScopeDescription(scope: Scope): string {
  switch (scope) {
    case Scope.Enterprise:
      return 'Organisation-wide memories (managed by enterprise settings)';
    case Scope.Local:
      return 'Personal project memories (gitignored, not shared)';
    case Scope.Project:
      return 'Shared project memories (tracked in git)';
    case Scope.Global:
      return 'Personal cross-project memories (~/.claude/memory/)';
  }
}

/**
 * Format scope hierarchy for display
 */
export function formatScopeHierarchy(): string {
  const scopes = [Scope.Enterprise, Scope.Local, Scope.Project, Scope.Global];
  const lines = scopes.map((scope, index) => {
    const prefix = index === 0 ? '→' : '  →';
    const indicator = getScopeIndicator(scope, { short: false });
    const description = getScopeDescription(scope);
    return `${prefix} ${indicator} ${description}`;
  });

  return 'Scope hierarchy (highest to lowest precedence):\n' + lines.join('\n');
}
