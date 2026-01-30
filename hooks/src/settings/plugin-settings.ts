/**
 * Plugin Settings Parser
 *
 * Reads user configuration from .claude/memory.local.md
 * Uses YAML frontmatter format per Claude Code plugin convention.
 *
 * Override chain: user settings > plugin defaults
 * Error handling: invalid values fallback to defaults
 */

import { stat, readFile } from 'fs/promises';
import { join } from 'path';

/** Check if a path exists (async alternative to existsSync) */
async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Memory plugin settings interface
 */
export interface MemoryPluginSettings {
  /** Master switch for plugin (default: true) */
  enabled: boolean;
  /** Ollama API endpoint (default: http://localhost:11434) */
  ollama_host: string;
  /** Model for summaries/chat (default: gemma3:4b) */
  chat_model: string;
  /** Model for semantic search embeddings (default: embeddinggemma:latest) */
  embedding_model: string;
  /** Max tokens for context (default: 16384) */
  context_window: number;
  /** Graph health warning threshold 0-1 (default: 0.7) */
  health_threshold: number;
  /** Semantic search similarity cutoff 0-1 (default: 0.45) */
  semantic_threshold: number;
  /** Run memory sync on startup (default: false) */
  auto_sync: boolean;
  /** Similarity threshold for duplicate detection 0-1 (default: 0.92) */
  duplicate_threshold: number;
  /** Collection size to switch from brute force to LSH (default: 200) */
  lsh_collection_threshold: number;
  /** Hash bits per LSH table (default: 10) */
  lsh_hash_bits: number;
  /** Number of LSH hash tables (default: 6) */
  lsh_tables: number;
  /** Settings schema version for detecting config updates (default: 1) */
  settings_version: number;
  /** Show reminders N times per session, 0 to disable (default: 1) */
  reminder_count: number;
  /** Skip heavy hooks after /clear command (default: false) */
  skip_hooks_after_clear: boolean;
  /** How long Ollama keeps models loaded (default: "5m") */
  ollama_keep_alive: string;
}

/**
 * Default settings - used when no user config exists or for missing values
 */
export const DEFAULT_SETTINGS: MemoryPluginSettings = {
  enabled: true,
  ollama_host: 'http://localhost:11434',
  chat_model: 'gemma3:4b',
  embedding_model: 'embeddinggemma:latest',
  context_window: 16384,
  health_threshold: 0.7,
  semantic_threshold: 0.45,
  auto_sync: false,
  duplicate_threshold: 0.92,
  lsh_collection_threshold: 200,
  lsh_hash_bits: 10,
  lsh_tables: 6,
  settings_version: 1,
  reminder_count: 1,
  skip_hooks_after_clear: false,
  ollama_keep_alive: '5m',
};

/** Settings file location relative to project root */
const SETTINGS_FILENAME = 'memory.local.md';

/**
 * Field type definitions for validation
 */
const FIELD_TYPES: Record<keyof MemoryPluginSettings, 'boolean' | 'string' | 'number'> = {
  enabled: 'boolean',
  ollama_host: 'string',
  chat_model: 'string',
  embedding_model: 'string',
  context_window: 'number',
  health_threshold: 'number',
  semantic_threshold: 'number',
  auto_sync: 'boolean',
  duplicate_threshold: 'number',
  lsh_collection_threshold: 'number',
  lsh_hash_bits: 'number',
  lsh_tables: 'number',
  settings_version: 'number',
  reminder_count: 'number',
  skip_hooks_after_clear: 'boolean',
  ollama_keep_alive: 'string',
};

/**
 * Parse YAML frontmatter from markdown content
 * Extracts key-value pairs between --- markers
 *
 * @param content - Full markdown file content
 * @returns Parsed key-value pairs
 */
export function parseYamlFrontmatter(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Find frontmatter between --- markers
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match || !match[1]) {
    return result;
  }

  const frontmatter = match[1];
  const lines = frontmatter.split('\n');

  for (const line of lines) {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse key: value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    let value: string | number | boolean = trimmed.slice(colonIndex + 1).trim();

    // Skip if no value
    if (!value) {
      continue;
    }

    // Remove quotes from strings
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      result[key] = value;
      continue;
    }

    // Parse booleans
    if (value === 'true') {
      result[key] = true;
      continue;
    }
    if (value === 'false') {
      result[key] = false;
      continue;
    }

    // Parse numbers
    const num = parseFloat(value);
    if (!isNaN(num) && value === String(num)) {
      result[key] = num;
      continue;
    }

    // Default to string
    result[key] = value;
  }

  return result;
}

/**
 * Validate raw parsed values against expected types
 *
 * @param raw - Raw parsed key-value pairs
 * @returns Validated partial settings (only valid fields)
 */
export function validateSettings(raw: Record<string, unknown>): Partial<MemoryPluginSettings> {
  const result: Partial<MemoryPluginSettings> = {};

  for (const [key, expectedType] of Object.entries(FIELD_TYPES)) {
    const value = raw[key];

    // Skip if not present
    if (value === undefined) {
      continue;
    }

    const settingKey = key as keyof MemoryPluginSettings;

    // Type validation
    if (expectedType === 'boolean') {
      if (typeof value === 'boolean') {
        (result as Record<string, boolean>)[settingKey] = value;
      }
    } else if (expectedType === 'string') {
      if (typeof value === 'string') {
        (result as Record<string, string>)[settingKey] = value;
      }
    } else if (expectedType === 'number') {
      if (typeof value === 'number' && !isNaN(value)) {
        let numValue = value;

        // Clamp threshold values to 0-1 range
        if (settingKey === 'health_threshold' || settingKey === 'semantic_threshold' || settingKey === 'duplicate_threshold') {
          numValue = Math.max(0, Math.min(1, numValue));
        }

        // Ensure positive integers for LSH settings
        if (settingKey === 'lsh_collection_threshold' || settingKey === 'lsh_hash_bits' || settingKey === 'lsh_tables') {
          numValue = Math.max(1, Math.floor(numValue));
        }

        // Settings version must be >= 1
        if (settingKey === 'settings_version') {
          numValue = Math.max(1, Math.floor(numValue));
        }

        // Reminder count: 0-10 range
        if (settingKey === 'reminder_count') {
          numValue = Math.max(0, Math.min(10, Math.floor(numValue)));
        }

        (result as Record<string, number>)[settingKey] = numValue;
      }
    }
  }

  return result;
}

/**
 * Load settings from project directory
 *
 * @param projectDir - Project root directory
 * @returns Complete settings (user overrides merged with defaults)
 */
export async function loadSettings(projectDir: string): Promise<MemoryPluginSettings> {
  const settingsPath = join(projectDir, '.claude', SETTINGS_FILENAME);

  // Return defaults if file doesn't exist
  if (!(await pathExists(settingsPath))) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = await readFile(settingsPath, 'utf-8');
    const raw = parseYamlFrontmatter(content);
    const validated = validateSettings(raw);

    // Merge validated settings with defaults
    return {
      ...DEFAULT_SETTINGS,
      ...validated,
    };
  } catch {
    // Parse error - return defaults
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Get the settings file path for a project
 *
 * @param projectDir - Project root directory
 * @returns Full path to settings file
 */
export function getSettingsPath(projectDir: string): string {
  return join(projectDir, '.claude', SETTINGS_FILENAME);
}

/**
 * LSH options for duplicate detection (matches similarity.ts LSHOptions interface)
 */
export interface DuplicateDetectionOptions {
  /** Similarity threshold for duplicate detection (0-1) */
  threshold: number;
  /** Collection size to switch from brute force to LSH */
  lshThreshold: number;
  /** Hash bits per LSH table */
  numHashBits: number;
  /** Number of LSH hash tables */
  numTables: number;
}

/**
 * Extract duplicate detection options from settings
 *
 * @param settings - Plugin settings (or undefined to use defaults)
 * @returns Options formatted for findPotentialDuplicates
 */
export function getDuplicateDetectionOptions(
  settings?: Partial<MemoryPluginSettings>
): DuplicateDetectionOptions {
  return {
    threshold: settings?.duplicate_threshold ?? DEFAULT_SETTINGS.duplicate_threshold,
    lshThreshold: settings?.lsh_collection_threshold ?? DEFAULT_SETTINGS.lsh_collection_threshold,
    numHashBits: settings?.lsh_hash_bits ?? DEFAULT_SETTINGS.lsh_hash_bits,
    numTables: settings?.lsh_tables ?? DEFAULT_SETTINGS.lsh_tables,
  };
}

/**
 * Settings version migration result
 */
export interface VersionMigrationResult {
  /** Whether migration was needed */
  migrationNeeded: boolean;
  /** User's current settings version */
  userVersion: number;
  /** Current schema version */
  currentVersion: number;
  /** List of new settings added in newer versions */
  newSettings: string[];
  /** Whether template was successfully updated */
  templateUpdated: boolean;
}

/**
 * Check if user's settings version is outdated and migrate if needed
 *
 * @param projectDir - Project root directory
 * @param userSettings - User's loaded settings
 * @returns Migration result with details about any updates
 */
export async function checkAndMigrateSettingsVersion(
  projectDir: string,
  userSettings: MemoryPluginSettings
): Promise<VersionMigrationResult> {
  const userVersion = userSettings.settings_version;
  const currentVersion = DEFAULT_SETTINGS.settings_version;

  const result: VersionMigrationResult = {
    migrationNeeded: userVersion < currentVersion,
    userVersion,
    currentVersion,
    newSettings: [],
    templateUpdated: false,
  };

  // No migration needed if versions match
  if (!result.migrationNeeded) {
    return result;
  }

  // Determine what settings were added based on version difference
  // v1 -> v2 would add different settings than v1 -> v3
  if (userVersion < 1 && currentVersion >= 1) {
    // v1 added: settings_version, reminder_count, skip_hooks_after_clear, ollama_keep_alive
    result.newSettings.push(
      'settings_version: 1',
      'reminder_count: 1',
      'skip_hooks_after_clear: false',
      'ollama_keep_alive: "5m"'
    );
  }

  // Copy template from hooks/memory.example.md to .claude/memory.example.md
  try {
    const { readFile: readFileSync, writeFile: writeFileSync, mkdir: mkdirSync } = await import('fs/promises');

    // Find plugin root (CLAUDE_PLUGIN_ROOT or relative path)
    // import.meta.dir is hooks/src/settings, so go up 3 levels to get project root
    const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || join(import.meta.dir, '..', '..', '..');
    const templatePath = join(pluginRoot, 'hooks', 'memory.example.md');
    const targetPath = join(projectDir, '.claude', 'memory.example.md');

    // Ensure .claude directory exists
    await mkdirSync(join(projectDir, '.claude'), { recursive: true });

    // Copy template
    const templateContent = await readFileSync(templatePath, 'utf-8');
    await writeFileSync(targetPath, templateContent, 'utf-8');

    result.templateUpdated = true;
  } catch (error) {
    // Failed to update template - log but don't fail
    console.error('[Settings] Failed to update memory.example.md:', error);
    result.templateUpdated = false;
  }

  return result;
}
