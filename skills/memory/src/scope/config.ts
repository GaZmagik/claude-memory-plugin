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
 * Load configuration from project and optionally global paths
 * Project config takes precedence over global config
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
 * Get enterprise configuration from config
 */
export function getEnterpriseConfig(config: MemoryConfig): EnterpriseConfig {
  // Default to true - enterprise still requires CLAUDE_MEMORY_ENTERPRISE_PATH
  // to be configured in managed-settings.json, so this is a soft enable
  return {
    enabled: config.scopes?.enterprise?.enabled ?? true,
  };
}

/**
 * Get default scope configuration from config
 * Returns undefined if no default is configured
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
 * Get embedding configuration with defaults
 */
export function getEmbeddingConfig(config: MemoryConfig): EmbeddingConfig {
  return {
    model: config.embedding?.model ?? DEFAULT_EMBEDDING_MODEL,
    endpoint: config.embedding?.endpoint,
  };
}

/**
 * Check if a config file exists at the given path
 */
export function configExists(basePath: string): boolean {
  const configPath = getConfigPath(basePath);
  return fs.existsSync(configPath);
}

/**
 * Write configuration to config.json
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
