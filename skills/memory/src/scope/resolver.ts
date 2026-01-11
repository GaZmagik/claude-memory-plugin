/**
 * T048: Scope resolver with hierarchy logic
 *
 * Resolves memory storage paths based on the 4-tier scope hierarchy:
 * enterprise → local → project → global
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Scope } from '../types/enums.js';
import { isInGitRepository, findGitRoot } from './git-utils.js';
import { loadConfig, getEnterpriseConfig } from './config.js';
import { getEnterprisePath, validateEnterprisePath } from './enterprise.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('resolver');

/**
 * Context for scope resolution
 */
export interface ScopeContext {
  /** Current working directory */
  cwd: string;
  /** Path to global memory storage (~/.claude/memory/) */
  globalMemoryPath: string;
  /** Whether enterprise scope is enabled */
  enterpriseEnabled?: boolean;
  /** Path to enterprise memory storage */
  enterprisePath?: string;
}

/**
 * Result of scope resolution
 */
export interface ScopeResolution {
  /** Resolved scope (null if resolution failed) */
  scope: Scope | null;
  /** Resolved path for memory storage */
  path?: string;
  /** Error message if resolution failed */
  error?: string;
}

/**
 * Options for resolving scope
 */
export interface ResolveScopeOptions extends ScopeContext {
  /** Explicitly requested scope */
  requestedScope?: Scope;
}

/**
 * Resolve a requested scope to its storage path
 */
export function resolveScope(options: ResolveScopeOptions): ScopeResolution {
  const {
    requestedScope,
    cwd,
    globalMemoryPath,
    enterpriseEnabled = false,
    enterprisePath,
  } = options;

  // If no scope requested, use default
  if (!requestedScope) {
    const defaultScope = getDefaultScope(cwd);
    return resolveScope({
      ...options,
      requestedScope: defaultScope,
    });
  }

  switch (requestedScope) {
    case Scope.Enterprise:
      return resolveEnterpriseScope(enterpriseEnabled, enterprisePath);

    case Scope.Local:
      return {
        scope: Scope.Local,
        path: getLocalScopePath(cwd),
      };

    case Scope.Project:
      return {
        scope: Scope.Project,
        path: getProjectScopePath(cwd),
      };

    case Scope.Global:
      return {
        scope: Scope.Global,
        path: globalMemoryPath,
      };

    default:
      return {
        scope: null,
        error: `Unknown scope: ${requestedScope}`,
      };
  }
}

/**
 * Resolve enterprise scope
 */
function resolveEnterpriseScope(
  enabled: boolean,
  enterprisePath?: string
): ScopeResolution {
  if (!enabled) {
    return {
      scope: null,
      error:
        'Enterprise scope is disabled. Enable it in config.json with: ' +
        '{"scopes": {"enterprise": {"enabled": true}}}',
    };
  }

  if (!enterprisePath) {
    return {
      scope: null,
      error:
        'Enterprise scope is enabled but no path is configured. ' +
        'Set CLAUDE_MEMORY_ENTERPRISE_PATH in managed-settings.json',
    };
  }

  const validation = validateEnterprisePath(enterprisePath);
  if (!validation.valid) {
    return {
      scope: null,
      error: validation.error ?? 'Enterprise path is inaccessible',
    };
  }

  return {
    scope: Scope.Enterprise,
    path: enterprisePath,
  };
}

/**
 * Get the storage path for a given scope
 */
export function getScopePath(
  scope: Scope,
  cwd: string,
  globalMemoryPath: string,
  enterprisePath?: string
): string {
  switch (scope) {
    case Scope.Enterprise:
      return enterprisePath ?? '';
    case Scope.Local:
      return getLocalScopePath(cwd);
    case Scope.Project:
      return getProjectScopePath(cwd);
    case Scope.Global:
      return globalMemoryPath;
  }
}

/**
 * Get the project scope path (.claude/memory/)
 */
function getProjectScopePath(cwd: string): string {
  const gitRoot = findGitRoot(cwd);
  const baseDir = gitRoot ?? cwd;
  return path.join(baseDir, '.claude', 'memory');
}

/**
 * Get the local scope path (.claude/memory/local/)
 */
function getLocalScopePath(cwd: string): string {
  const gitRoot = findGitRoot(cwd);
  const baseDir = gitRoot ?? cwd;
  return path.join(baseDir, '.claude', 'memory', 'local');
}

/**
 * Determine the default scope based on context
 */
export function getDefaultScope(cwd: string): Scope {
  // Check config for explicit default
  const config = loadConfig(cwd);
  const configDefault = config.scopes?.default;
  if (configDefault && Object.values(Scope).includes(configDefault as Scope)) {
    return configDefault as Scope;
  }

  // If in git repo, default to project scope
  if (isInGitRepository(cwd)) {
    return Scope.Project;
  }

  // Otherwise default to global
  return Scope.Global;
}

/**
 * Check if enterprise scope is enabled
 */
export function isEnterpriseEnabled(cwd: string): boolean {
  const config = loadConfig(cwd);
  return getEnterpriseConfig(config).enabled;
}

/**
 * Get all accessible scopes based on context
 * Returns scopes in hierarchy order: enterprise → local → project → global
 */
export function getAllAccessibleScopes(context: ScopeContext): Scope[] {
  const { enterpriseEnabled, enterprisePath } = context;
  const scopes: Scope[] = [];

  // Enterprise (if enabled and accessible)
  if (enterpriseEnabled && enterprisePath) {
    const validation = validateEnterprisePath(enterprisePath);
    if (validation.valid) {
      scopes.push(Scope.Enterprise);
    }
  }

  // Local (always accessible)
  scopes.push(Scope.Local);

  // Project (always accessible)
  scopes.push(Scope.Project);

  // Global (always accessible)
  scopes.push(Scope.Global);

  return scopes;
}

/**
 * Memory with scope indicator for merged results
 */
export interface ScopedMemory {
  id: string;
  type: string;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  scope: Scope;
  relativePath: string;
  severity?: string;
}

/**
 * Result of merging memories from multiple scopes
 */
export interface MergeResult {
  memories: ScopedMemory[];
  scopesSearched: Scope[];
  errors: { scope: Scope; error: string }[];
}

/**
 * Merge memories from all accessible scopes
 * Returns memories in hierarchy order (enterprise first, global last)
 */
export async function mergeMemoriesFromScopes(
  context: ScopeContext
): Promise<MergeResult> {
  const { cwd, globalMemoryPath, enterpriseEnabled: _enterpriseEnabled, enterprisePath } = context;
  const accessibleScopes = getAllAccessibleScopes(context);

  const memories: ScopedMemory[] = [];
  const errors: { scope: Scope; error: string }[] = [];

  for (const scope of accessibleScopes) {
    const scopePath = getScopePath(scope, cwd, globalMemoryPath, enterprisePath);

    try {
      if (!scopePath || !fs.existsSync(scopePath)) {
        continue;
      }

      const indexPath = path.join(scopePath, 'index.json');
      if (!fs.existsSync(indexPath)) {
        continue;
      }

      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);

      if (Array.isArray(index.entries)) {
        for (const entry of index.entries) {
          memories.push({
            ...entry,
            scope,
          });
        }
      }
    } catch (error) {
      log.warn('Failed to read scope', { scope, error: String(error) });
      errors.push({ scope, error: String(error) });
    }
  }

  return {
    memories,
    scopesSearched: accessibleScopes,
    errors,
  };
}

/**
 * Build scope context from current environment
 */
export function buildScopeContext(
  cwd: string,
  globalMemoryPath: string
): ScopeContext {
  const enterpriseEnabled = isEnterpriseEnabled(cwd);
  const enterprisePath = enterpriseEnabled ? getEnterprisePath() : undefined;

  return {
    cwd,
    globalMemoryPath,
    enterpriseEnabled,
    enterprisePath,
  };
}
