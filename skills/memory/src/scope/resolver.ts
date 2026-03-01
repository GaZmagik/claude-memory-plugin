/**
 * T048: Scope resolver with hierarchy logic
 *
 * Resolves memory storage paths based on the 4-tier scope hierarchy:
 * enterprise → local → project → global
 */

import { readFile, access } from 'node:fs/promises';
import * as path from 'node:path';
import { Scope } from '../types/enums.js';
import { isInGitRepository, findGitRoot } from './git-utils.js';
import { loadConfig, getEnterpriseConfig } from './config.js';
import { getEnterprisePath, validateEnterprisePath } from './enterprise.js';
import { createLogger } from '../core/logger.js';
import { getAgentDirectoryPath } from './get-agent-directory-path.js';
import { validateAgentName } from './validate-agent-name.js';

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
  /** Agent name for agent-scoped operations */
  agentName?: string;
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
export async function resolveScope(options: ResolveScopeOptions): Promise<ScopeResolution> {
  const {
    requestedScope,
    cwd,
    globalMemoryPath,
    enterpriseEnabled = false,
    enterprisePath,
    agentName,
  } = options;

  // If no scope requested, use default
  if (!requestedScope) {
    const defaultScope = await getDefaultScope({ cwd, globalMemoryPath, agentName });
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
        path: await getLocalScopePath(cwd),
      };

    case Scope.Project:
      return {
        scope: Scope.Project,
        path: await getProjectScopePath(cwd),
      };

    case Scope.Global:
      return {
        scope: Scope.Global,
        path: globalMemoryPath,
      };

    case Scope.AgentProject:
    case Scope.AgentGlobal:
      return resolveAgentScope(requestedScope, cwd, globalMemoryPath, agentName);

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
 * Resolve agent scope (AgentProject or AgentGlobal)
 */
function resolveAgentScope(
  scope: Scope.AgentProject | Scope.AgentGlobal,
  cwd: string,
  globalMemoryPath: string,
  agentName?: string
): ScopeResolution {
  // Validate agentName is provided
  if (!agentName || agentName.trim() === '') {
    return {
      scope: null,
      error: 'agentName is required for agent scopes',
    };
  }

  // Validate agent name format (no auto-sanitisation at API layer)
  const validation = validateAgentName(agentName);

  if (!validation.valid) {
    const errorMsg = validation.error || 'Invalid agent name';
    const suggestion = validation.suggestion ? ` (suggestion: ${validation.suggestion})` : '';
    return {
      scope: null,
      error: `${errorMsg}${suggestion}`,
    };
  }

  // Get the appropriate root path
  const projectRoot = scope === Scope.AgentProject ? cwd : undefined;
  const globalRoot = scope === Scope.AgentGlobal ? globalMemoryPath : undefined;

  try {
    const agentPath = getAgentDirectoryPath({
      scope,
      agentName,
      projectRoot,
      globalRoot,
    });

    return {
      scope,
      path: agentPath,
    };
  } catch (error) {
    return {
      scope: null,
      error: error instanceof Error ? error.message : 'Failed to resolve agent scope path',
    };
  }
}

/**
 * Get the storage path for a given scope
 */
export async function getScopePath(
  scope: Scope,
  cwd: string,
  globalMemoryPath: string,
  enterprisePath?: string
): Promise<string> {
  switch (scope) {
    case Scope.Enterprise:
      return enterprisePath ?? '';
    case Scope.Local:
      return getLocalScopePath(cwd);
    case Scope.Project:
      return getProjectScopePath(cwd);
    case Scope.Global:
      return globalMemoryPath;
    case Scope.AgentProject:
    case Scope.AgentGlobal:
      throw new Error(`Agent scopes require agentName parameter. Use resolveScope() instead.`);
    default:
      throw new Error(`Unknown scope: ${scope}`);
  }
}

/**
 * Get the project scope path (.claude/memory/)
 */
async function getProjectScopePath(cwd: string): Promise<string> {
  const gitRoot = await findGitRoot(cwd);
  const baseDir = gitRoot ?? cwd;
  return path.join(baseDir, '.claude', 'memory');
}

/**
 * Get the local scope path (.claude/memory/local/)
 */
async function getLocalScopePath(cwd: string): Promise<string> {
  const gitRoot = await findGitRoot(cwd);
  const baseDir = gitRoot ?? cwd;
  return path.join(baseDir, '.claude', 'memory', 'local');
}

/**
 * Determine the default scope based on context
 */
export async function getDefaultScope(context: ScopeContext | string): Promise<Scope> {
  // Handle legacy string parameter for backward compatibility
  const cwd = typeof context === 'string' ? context : context.cwd;
  const agentName = typeof context === 'string' ? undefined : context.agentName;

  // Check config for explicit default
  const config = loadConfig(cwd);
  const configDefault = config.scopes?.default;
  if (configDefault && Object.values(Scope).includes(configDefault as Scope)) {
    return configDefault as Scope;
  }

  // If agent context provided, use agent scopes
  if (agentName && agentName.trim() !== '') {
    // If in git repo, default to agent-project scope
    if (await isInGitRepository(cwd)) {
      return Scope.AgentProject;
    }
    // Otherwise default to agent-global
    return Scope.AgentGlobal;
  }

  // No agent context: use existing default logic
  // If in git repo, default to project scope
  if (await isInGitRepository(cwd)) {
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
    const scopePath = await getScopePath(scope, cwd, globalMemoryPath, enterprisePath);

    try {
      if (!scopePath) {
        continue;
      }

      try {
        await access(scopePath);
      } catch {
        continue;
      }

      const indexPath = path.join(scopePath, 'index.json');
      try {
        await access(indexPath);
      } catch {
        continue;
      }

      const indexContent = await readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexContent);

      if (Array.isArray(index.memories)) {
        for (const entry of index.memories) {
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
