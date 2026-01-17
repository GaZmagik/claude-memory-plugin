/**
 * Plugin Settings Parser
 *
 * Reads user configuration from .claude/memory.local.md
 * Uses YAML frontmatter format per Claude Code plugin convention.
 *
 * Override chain: user settings > plugin defaults
 * Error handling: invalid values fallback to defaults
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

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
        if (settingKey === 'health_threshold' || settingKey === 'semantic_threshold') {
          numValue = Math.max(0, Math.min(1, numValue));
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
export function loadSettings(projectDir: string): MemoryPluginSettings {
  const settingsPath = join(projectDir, '.claude', SETTINGS_FILENAME);

  // Return defaults if file doesn't exist
  if (!existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = readFileSync(settingsPath, 'utf-8');
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
