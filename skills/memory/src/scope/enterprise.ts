/**
 * T047: Managed-settings.json reader for enterprise path
 *
 * Reads the enterprise memory path from managed-settings.json
 * environment variable CLAUDE_MEMORY_ENTERPRISE_PATH.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createLogger } from '../core/logger.js';

const log = createLogger('enterprise');

const ENTERPRISE_PATH_ENV_VAR = 'CLAUDE_MEMORY_ENTERPRISE_PATH';
const MANAGED_SETTINGS_FILENAME = 'managed-settings.json';

/**
 * Structure of managed-settings.json
 */
interface ManagedSettings {
  env?: Record<string, string>;
}

/**
 * Find managed-settings.json in standard locations
 * Searches in order:
 * 1. Provided path directly
 * 2. ~/.claude/managed-settings.json
 * 3. /etc/claude/managed-settings.json (Linux/macOS)
 */
function findManagedSettingsPath(searchPath?: string): string | null {
  const locations: string[] = [];

  if (searchPath) {
    // Check if path is directory or file
    if (searchPath.endsWith('.json')) {
      locations.push(searchPath);
    } else {
      locations.push(path.join(searchPath, MANAGED_SETTINGS_FILENAME));
    }
  }

  // Standard locations
  const homeDir = os.homedir();
  if (homeDir) {
    locations.push(path.join(homeDir, '.claude', MANAGED_SETTINGS_FILENAME));
  }

  // System location (Linux/macOS)
  locations.push(path.join('/etc', 'claude', MANAGED_SETTINGS_FILENAME));

  for (const location of locations) {
    if (fs.existsSync(location)) {
      return location;
    }
  }

  return null;
}

/**
 * Read and parse managed-settings.json
 */
function readManagedSettings(settingsPath: string): ManagedSettings | null {
  try {
    const content = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content) as ManagedSettings;
  } catch (error) {
    log.warn('Failed to parse managed-settings.json', {
      path: settingsPath,
      error: String(error),
    });
    return null;
  }
}

/**
 * Get the enterprise memory path from managed-settings.json
 *
 * Looks for CLAUDE_MEMORY_ENTERPRISE_PATH in the env section
 * of managed-settings.json.
 *
 * @param searchPath - Optional path to search for managed-settings.json
 * @returns The enterprise path if configured, undefined otherwise
 */
export function getEnterprisePath(searchPath?: string): string | undefined {
  // First check actual environment variable
  const envPath = process.env[ENTERPRISE_PATH_ENV_VAR];
  if (envPath) {
    log.debug('Enterprise path from environment', { path: envPath });
    return envPath;
  }

  // Then check managed-settings.json
  const settingsPath = findManagedSettingsPath(searchPath);
  if (!settingsPath) {
    log.debug('No managed-settings.json found');
    return undefined;
  }

  const settings = readManagedSettings(settingsPath);
  if (!settings) {
    return undefined;
  }

  const enterprisePath = settings.env?.[ENTERPRISE_PATH_ENV_VAR];
  if (enterprisePath) {
    log.debug('Enterprise path from managed-settings', {
      path: enterprisePath,
      settingsPath,
    });
  }

  return enterprisePath;
}

/**
 * Validate that the enterprise path exists and is accessible
 */
export function validateEnterprisePath(enterprisePath: string): {
  valid: boolean;
  error?: string;
} {
  try {
    if (!fs.existsSync(enterprisePath)) {
      return {
        valid: false,
        error: `Enterprise path does not exist: ${enterprisePath}`,
      };
    }

    const stats = fs.statSync(enterprisePath);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: `Enterprise path is not a directory: ${enterprisePath}`,
      };
    }

    // Try to access (read permission)
    fs.accessSync(enterprisePath, fs.constants.R_OK | fs.constants.W_OK);

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Enterprise path is inaccessible: ${String(error)}`,
    };
  }
}

/**
 * Represents the current status of enterprise memory configuration.
 */
export interface EnterpriseStatus {
  configured: boolean;
  path?: string;
  accessible: boolean;
  error?: string;
}

/**
 * Retrieves the current enterprise memory configuration status.
 *
 * Checks whether enterprise memory is configured by looking for `CLAUDE_MEMORY_ENTERPRISE_PATH`
 * in the environment or managed-settings.json. If configured, validates that the path exists
 * and is accessible (readable and writable).
 *
 * The search order for the enterprise path is:
 * 1. `CLAUDE_MEMORY_ENTERPRISE_PATH` environment variable
 * 2. `env.CLAUDE_MEMORY_ENTERPRISE_PATH` in managed-settings.json at the provided search path
 * 3. `~/.claude/managed-settings.json`
 * 4. `/etc/claude/managed-settings.json` (Linux/macOS)
 *
 * @param searchPath - Optional path to search for managed-settings.json (can be a directory or direct file path)
 * @returns An EnterpriseStatus object containing:
 *   - `configured`: Whether an enterprise path was found
 *   - `path`: The configured enterprise path (if any)
 *   - `accessible`: Whether the path exists and is readable/writable
 *   - `error`: Error message if the path is configured but inaccessible
 *
 * @example
 * ```typescript
 * // Check enterprise status with default search paths
 * const status = getEnterpriseStatus();
 *
 * if (!status.configured) {
 *   console.log('Enterprise memory not configured');
 * } else if (!status.accessible) {
 *   console.error(`Enterprise path error: ${status.error}`);
 * } else {
 *   console.log(`Enterprise memory available at: ${status.path}`);
 * }
 *
 * // Check with custom search path
 * const customStatus = getEnterpriseStatus('/custom/config/path');
 * ```
 */
export function getEnterpriseStatus(searchPath?: string): EnterpriseStatus {
  const enterprisePath = getEnterprisePath(searchPath);

  if (!enterprisePath) {
    return {
      configured: false,
      accessible: false,
    };
  }

  const validation = validateEnterprisePath(enterprisePath);

  return {
    configured: true,
    path: enterprisePath,
    accessible: validation.valid,
    error: validation.error,
  };
}
