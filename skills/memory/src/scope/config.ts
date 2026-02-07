/**
 * T046: Config.json reader and validator
 *
 * Reads and parses config.json for scope preferences and settings.
 * Supports both project-level and global-level configuration.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Scope } from '../types/enums.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('config');

/**
 * Memory plugin configuration structure
 */
export interface MemoryConfig {
  scopes?: {
    enterprise?: {
      enabled?: boolean;
    };
    default?: string;
  };
  embedding?: {
    model?: string;
    endpoint?: string;
  };
  error?: string;
}

/**
 * Enterprise configuration
 */
export interface EnterpriseConfig {
  enabled: boolean;
}

/**
 * Embedding configuration with defaults
 */
export interface EmbeddingConfig {
  model: string;
  endpoint?: string;
}

const DEFAULT_EMBEDDING_MODEL = 'embeddinggemma';

/**
 * Get the path to config.json in a directory
 */
function getConfigPath(basePath: string): string {
  return path.join(basePath, '.claude', 'config.json');
}

/**
 * Read and parse a config.json file
 */
function readConfigFile(configPath: string): MemoryConfig | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as MemoryConfig;
  } catch (error) {
    log.warn('Failed to parse config.json', { path: configPath, error: String(error) });
    return { error: `Failed to parse config.json: ${String(error)}` };
  }
}

/**
 * Loads memory plugin configuration from project and optionally global paths.
 *
 * Reads config.json files from `.claude/config.json` relative to the provided paths.
 * When both project and global configurations exist, they are merged with project
 * settings taking precedence over global settings. Nested objects (scopes, embedding)
 * are deep-merged.
 *
 * @param projectPath - The absolute path to the project directory containing `.claude/config.json`
 * @param globalPath - Optional absolute path to a global directory (typically user home) for fallback configuration
 * @returns The merged configuration object, or an empty object if no configuration files exist
 *
 * @example
 * ```typescript
 * // Load project-only configuration
 * const config = loadConfig('/path/to/project');
 *
 * // Load with global fallback (e.g., from home directory)
 * const config = loadConfig('/path/to/project', os.homedir());
 *
 * // Access configuration values
 * const defaultScope = config.scopes?.default;
 * const embeddingModel = config.embedding?.model;
 * ```
 */
export function loadConfig(projectPath: string, globalPath?: string): MemoryConfig {
  const projectConfigPath = getConfigPath(projectPath);
  const projectConfig = readConfigFile(projectConfigPath);

  // If no global path provided, just return project config
  if (!globalPath) {
    return projectConfig ?? {};
  }

  const globalConfigPath = getConfigPath(globalPath);
  const globalConfig = readConfigFile(globalConfigPath);

  // Merge configs (project overrides global)
  const merged: MemoryConfig = {
    ...globalConfig,
    ...projectConfig,
    scopes: {
      ...globalConfig?.scopes,
      ...projectConfig?.scopes,
      enterprise: {
        ...globalConfig?.scopes?.enterprise,
        ...projectConfig?.scopes?.enterprise,
      },
    },
    embedding: {
      ...globalConfig?.embedding,
      ...projectConfig?.embedding,
    },
  };

  return merged;
}

/**
 * Extracts enterprise configuration settings from a memory configuration object.
 *
 * Returns whether enterprise scope is enabled. Note that enterprise functionality
 * also requires `CLAUDE_MEMORY_ENTERPRISE_PATH` to be configured in managed-settings.json,
 * so this setting acts as a soft enable/disable toggle.
 *
 * @param config - The memory configuration object to extract enterprise settings from
 * @returns An EnterpriseConfig object with `enabled` defaulting to `true` if not explicitly set
 *
 * @example
 * ```typescript
 * const config = loadConfig('/path/to/project');
 * const enterpriseConfig = getEnterpriseConfig(config);
 *
 * if (enterpriseConfig.enabled) {
 *   // Enterprise scope is enabled (still requires CLAUDE_MEMORY_ENTERPRISE_PATH)
 *   console.log('Enterprise features available');
 * }
 * ```
 */
export function getEnterpriseConfig(config: MemoryConfig): EnterpriseConfig {
  // Default to true - enterprise still requires CLAUDE_MEMORY_ENTERPRISE_PATH
  // to be configured in managed-settings.json, so this is a soft enable
  return {
    enabled: config.scopes?.enterprise?.enabled ?? true,
  };
}

/**
 * Extracts the default scope setting from a memory configuration object.
 *
 * Retrieves the configured default scope and validates it against known Scope enum values.
 * If the configured value is not a valid scope, a warning is logged and `undefined` is returned.
 *
 * @param config - The memory configuration object to extract the default scope from
 * @returns The default scope string if configured and valid, otherwise `undefined`
 *
 * @example
 * ```typescript
 * const config = loadConfig('/path/to/project');
 * const defaultScope = getDefaultScopeConfig(config);
 *
 * if (defaultScope) {
 *   console.log(`Using configured default scope: ${defaultScope}`);
 * } else {
 *   console.log('No default scope configured, will use detection logic');
 * }
 * ```
 */
export function getDefaultScopeConfig(config: MemoryConfig): string | undefined {
  const defaultScope = config.scopes?.default;

  if (!defaultScope) {
    return undefined;
  }

  // Validate it's a known scope value
  const validScopes = Object.values(Scope) as string[];
  if (!validScopes.includes(defaultScope)) {
    log.warn('Invalid default scope in config', { scope: defaultScope });
    return undefined;
  }

  return defaultScope;
}

/**
 * Extracts embedding configuration from a memory configuration object with sensible defaults.
 *
 * Returns the embedding model and optional endpoint settings. If no model is configured,
 * defaults to 'embeddinggemma'. The endpoint is optional and only included if explicitly configured.
 *
 * @param config - The memory configuration object to extract embedding settings from
 * @returns An EmbeddingConfig object with `model` (defaulting to 'embeddinggemma') and optional `endpoint`
 *
 * @example
 * ```typescript
 * const config = loadConfig('/path/to/project');
 * const embeddingConfig = getEmbeddingConfig(config);
 *
 * console.log(`Using embedding model: ${embeddingConfig.model}`);
 * if (embeddingConfig.endpoint) {
 *   console.log(`Custom endpoint: ${embeddingConfig.endpoint}`);
 * }
 * ```
 */
export function getEmbeddingConfig(config: MemoryConfig): EmbeddingConfig {
  return {
    model: config.embedding?.model ?? DEFAULT_EMBEDDING_MODEL,
    endpoint: config.embedding?.endpoint,
  };
}

/**
 * Checks whether a configuration file exists at the specified base path.
 *
 * Looks for `.claude/config.json` relative to the provided base path.
 * This can be used to determine if configuration needs to be created
 * or to conditionally load configuration.
 *
 * @param basePath - The absolute path to the directory to check for configuration
 * @returns `true` if `.claude/config.json` exists at the path, `false` otherwise
 *
 * @example
 * ```typescript
 * const projectPath = '/path/to/project';
 *
 * if (configExists(projectPath)) {
 *   const config = loadConfig(projectPath);
 *   // Use existing configuration
 * } else {
 *   // Create default configuration or prompt user
 *   saveConfig(projectPath, { scopes: { default: 'project' } });
 * }
 * ```
 */
export function configExists(basePath: string): boolean {
  const configPath = getConfigPath(basePath);
  return fs.existsSync(configPath);
}

/**
 * Saves a memory configuration object to the config.json file.
 *
 * Writes the configuration to `.claude/config.json` relative to the provided base path.
 * Creates the `.claude` directory if it does not exist. The configuration is formatted
 * with 2-space indentation for readability.
 *
 * @param basePath - The absolute path to the directory where configuration should be saved
 * @param config - The memory configuration object to save
 * @throws {Error} If the file cannot be written (e.g., permission denied, disk full)
 *
 * @example
 * ```typescript
 * const projectPath = '/path/to/project';
 *
 * // Save a new configuration
 * saveConfig(projectPath, {
 *   scopes: {
 *     default: 'project',
 *     enterprise: { enabled: true }
 *   },
 *   embedding: {
 *     model: 'text-embedding-3-small'
 *   }
 * });
 *
 * // Update existing configuration
 * const existing = loadConfig(projectPath);
 * existing.scopes = { ...existing.scopes, default: 'global' };
 * saveConfig(projectPath, existing);
 * ```
 */
export function saveConfig(basePath: string, config: MemoryConfig): void {
  const configPath = getConfigPath(basePath);
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  log.debug('Saved config', { path: configPath });
}
