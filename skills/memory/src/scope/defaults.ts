/**
 * T049: Default scope selection logic
 *
 * Determines the default scope when none is explicitly specified.
 */

import { Scope } from '../types/enums.js';
import { isInGitRepository } from './git-utils.js';
import { loadConfig } from './config.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('defaults');

/**
 * Options for default scope selection
 */
export interface DefaultScopeOptions {
  /** Current working directory */
  cwd: string;
  /** Optional global config path */
  globalConfigPath?: string;
  /** Override to force a specific default */
  forceDefault?: Scope;
}

/**
 * Result of default scope selection
 */
export interface DefaultScopeResult {
  /** Selected default scope */
  scope: Scope;
  /** Reason for selection */
  reason: string;
  /** Whether from config or inferred */
  source: 'config' | 'git-detection' | 'fallback' | 'forced';
}

/**
 * Select the default scope based on context
 *
 * Priority:
 * 1. Forced default (if provided)
 * 2. Config-specified default
 * 3. Git detection (project scope if in git repo)
 * 4. Fallback to global
 */
export async function selectDefaultScope(options: DefaultScopeOptions): Promise<DefaultScopeResult> {
  const { cwd, globalConfigPath, forceDefault } = options;

  // 1. Check for forced default
  if (forceDefault) {
    log.debug('Using forced default scope', { scope: forceDefault });
    return {
      scope: forceDefault,
      reason: 'Forced default scope',
      source: 'forced',
    };
  }

  // 2. Check config for explicit default
  const config = loadConfig(cwd, globalConfigPath);
  const configDefault = config.scopes?.default;

  if (configDefault) {
    const validScope = parseScope(configDefault);
    if (validScope) {
      log.debug('Using config default scope', { scope: validScope });
      return {
        scope: validScope,
        reason: `Configured in config.json: ${configDefault}`,
        source: 'config',
      };
    }
    log.warn('Invalid scope in config, ignoring', { value: configDefault });
  }

  // 3. Git detection
  if (await isInGitRepository(cwd)) {
    log.debug('Using project scope (git detected)');
    return {
      scope: Scope.Project,
      reason: 'In git repository, defaulting to project scope',
      source: 'git-detection',
    };
  }

  // 4. Fallback to global
  log.debug('Using global scope (fallback)');
  return {
    scope: Scope.Global,
    reason: 'Not in git repository, defaulting to global scope',
    source: 'fallback',
  };
}

/**
 * Parse a string to a Scope enum value
 */
function parseScope(value: string): Scope | null {
  const normalised = value.toLowerCase();
  switch (normalised) {
    case 'enterprise':
      return Scope.Enterprise;
    case 'local':
      return Scope.Local;
    case 'project':
      return Scope.Project;
    case 'global':
      return Scope.Global;
    default:
      return null;
  }
}

/**
 * Determines the recommended scope for a given memory type based on its nature.
 *
 * Different memory types have natural scope preferences:
 * - **Artifacts**: Typically shared globally across projects
 * - **Gotchas/Learnings**: Usually project-specific (if in a git repository)
 * - **Breadcrumbs**: Temporary personal markers, stored locally
 * - **Other types**: Falls back to the standard default scope selection logic
 *
 * @param memoryType - The type of memory being created (e.g., 'artifact', 'gotcha', 'learning', 'breadcrumb')
 * @param cwd - The current working directory, used for git repository detection
 * @returns A DefaultScopeResult containing the recommended scope, reason, and source
 *
 * @example
 * ```typescript
 * // Get recommended scope for an artifact
 * const result = getRecommendedScope('artifact', '/path/to/project');
 * console.log(result.scope);  // Scope.Global
 * console.log(result.reason); // 'Artifacts are typically shared across projects'
 *
 * // Get recommended scope for a gotcha in a git repository
 * const gotchaResult = getRecommendedScope('gotcha', '/path/to/git-project');
 * console.log(gotchaResult.scope);  // Scope.Project
 *
 * // Get recommended scope for a breadcrumb
 * const breadcrumbResult = getRecommendedScope('breadcrumb', '/path/to/project');
 * console.log(breadcrumbResult.scope);  // Scope.Local
 * ```
 */
export async function getRecommendedScope(
  memoryType: string,
  cwd: string
): Promise<DefaultScopeResult> {
  // Artifacts and patterns are often meant to be shared globally
  if (memoryType === 'artifact') {
    return {
      scope: Scope.Global,
      reason: 'Artifacts are typically shared across projects',
      source: 'fallback',
    };
  }

  // Gotchas and learnings are often project-specific
  if (memoryType === 'gotcha' || memoryType === 'learning') {
    if (await isInGitRepository(cwd)) {
      return {
        scope: Scope.Project,
        reason: `${memoryType}s are typically project-specific`,
        source: 'git-detection',
      };
    }
  }

  // Breadcrumbs are temporary and personal
  if (memoryType === 'breadcrumb') {
    return {
      scope: Scope.Local,
      reason: 'Breadcrumbs are temporary personal markers',
      source: 'fallback',
    };
  }

  // Default behavior
  return selectDefaultScope({ cwd });
}

/**
 * Validates whether the selected scope is appropriate for the given content and memory type.
 *
 * Analyses the content and memory type to detect potential mismatches with the selected scope.
 * Returns an array of warning messages if issues are detected:
 * - Personal/confidential content in shared scopes (project/enterprise)
 * - Breadcrumbs stored outside local scope
 * - Artifacts stored in local scope (won't be shared)
 *
 * @param selectedScope - The scope that was selected for the memory
 * @param memoryType - The type of memory being created (e.g., 'artifact', 'breadcrumb')
 * @param content - The content of the memory to analyse for personal/confidential indicators
 * @returns An array of warning strings; empty array if no issues detected
 *
 * @example
 * ```typescript
 * // Check for personal content in shared scope
 * const warnings = validateScopeChoice(
 *   Scope.Project,
 *   'note',
 *   'This is my personal API key: abc123'
 * );
 * // Returns: ['Content appears to be personal but scope is shared. Consider using local scope.']
 *
 * // Check breadcrumb in non-local scope
 * const breadcrumbWarnings = validateScopeChoice(
 *   Scope.Global,
 *   'breadcrumb',
 *   'Debugging session marker'
 * );
 * // Returns: ['Breadcrumbs are typically stored in local scope for privacy.']
 *
 * // No warnings for appropriate scope choice
 * const noWarnings = validateScopeChoice(
 *   Scope.Project,
 *   'gotcha',
 *   'Remember to run migrations before deploying'
 * );
 * // Returns: []
 * ```
 */
export function validateScopeChoice(
  selectedScope: Scope,
  memoryType: string,
  content: string
): string[] {
  const warnings: string[] = [];

  // Warn if putting personal content in shared scope
  const personalIndicators = [
    'my personal',
    'private',
    'do not share',
    'confidential',
  ];
  const hasPersonalContent = personalIndicators.some(indicator =>
    content.toLowerCase().includes(indicator)
  );

  if (
    hasPersonalContent &&
    (selectedScope === Scope.Project || selectedScope === Scope.Enterprise)
  ) {
    warnings.push(
      'Content appears to be personal but scope is shared. Consider using local scope.'
    );
  }

  // Warn if putting temporary content in permanent scope
  if (memoryType === 'breadcrumb' && selectedScope !== Scope.Local) {
    warnings.push(
      'Breadcrumbs are typically stored in local scope for privacy.'
    );
  }

  // Warn if putting global patterns in local scope
  if (memoryType === 'artifact' && selectedScope === Scope.Local) {
    warnings.push(
      'Artifacts in local scope won\'t be shared. Consider project or global scope.'
    );
  }

  return warnings;
}
