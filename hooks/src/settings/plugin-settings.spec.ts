/**
 * Tests for plugin settings parser
 * TDD: Tests written first to define expected behaviour
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import {
  loadSettings,
  parseYamlFrontmatter,
  validateSettings,
  DEFAULT_SETTINGS,
  checkAndMigrateSettingsVersion,
} from './plugin-settings.ts';

describe('plugin-settings', () => {
  const testDir = join(process.cwd(), '.test-settings');
  const claudeDir = join(testDir, '.claude');
  const settingsPath = join(claudeDir, 'memory.local.md');

  beforeEach(() => {
    mkdirSync(claudeDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have all required fields with sensible defaults', () => {
      expect(DEFAULT_SETTINGS).toEqual({
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
        ollama_prewarm_timeout: 10000,
      });
    });
  });

  describe('parseYamlFrontmatter', () => {
    it('should extract YAML between --- markers', () => {
      const content = `---
enabled: true
ollama_host: http://localhost:11434
---

# Some markdown content
`;
      const result = parseYamlFrontmatter(content);
      expect(result).toEqual({
        enabled: true,
        ollama_host: 'http://localhost:11434',
      });
    });

    it('should handle string values', () => {
      const content = `---
chat_model: llama3.2
---`;
      const result = parseYamlFrontmatter(content);
      expect(result.chat_model).toBe('llama3.2');
    });

    it('should handle quoted string values', () => {
      const content = `---
chat_model: "gpt-oss:20b"
ollama_host: 'http://remote:11434'
---`;
      const result = parseYamlFrontmatter(content);
      expect(result.chat_model).toBe('gpt-oss:20b');
      expect(result.ollama_host).toBe('http://remote:11434');
    });

    it('should handle numeric values', () => {
      const content = `---
context_window: 32768
health_threshold: 0.8
---`;
      const result = parseYamlFrontmatter(content);
      expect(result.context_window).toBe(32768);
      expect(result.health_threshold).toBe(0.8);
    });

    it('should handle boolean values', () => {
      const content = `---
enabled: false
auto_sync: true
---`;
      const result = parseYamlFrontmatter(content);
      expect(result.enabled).toBe(false);
      expect(result.auto_sync).toBe(true);
    });

    it('should ignore comments', () => {
      const content = `---
# This is a comment
enabled: true
# Another comment
chat_model: test
---`;
      const result = parseYamlFrontmatter(content);
      expect(result.enabled).toBe(true);
      expect(result.chat_model).toBe('test');
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('should return empty object for invalid frontmatter', () => {
      const content = `No frontmatter here`;
      const result = parseYamlFrontmatter(content);
      expect(result).toEqual({});
    });

    it('should return empty object for unclosed frontmatter', () => {
      const content = `---
enabled: true
`;
      const result = parseYamlFrontmatter(content);
      expect(result).toEqual({});
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---`;
      const result = parseYamlFrontmatter(content);
      expect(result).toEqual({});
    });
  });

  describe('validateSettings', () => {
    it('should validate boolean fields', () => {
      const raw = { enabled: true, auto_sync: false };
      const result = validateSettings(raw);
      expect(result.enabled).toBe(true);
      expect(result.auto_sync).toBe(false);
    });

    it('should reject non-boolean for boolean fields', () => {
      const raw = { enabled: 'yes' };
      const result = validateSettings(raw);
      expect(result.enabled).toBeUndefined();
    });

    it('should validate string fields', () => {
      const raw = { chat_model: 'llama3.2', ollama_host: 'http://test:11434' };
      const result = validateSettings(raw);
      expect(result.chat_model).toBe('llama3.2');
      expect(result.ollama_host).toBe('http://test:11434');
    });

    it('should reject non-string for string fields', () => {
      const raw = { chat_model: 123 };
      const result = validateSettings(raw);
      expect(result.chat_model).toBeUndefined();
    });

    it('should validate numeric fields', () => {
      const raw = { context_window: 32768, health_threshold: 0.8 };
      const result = validateSettings(raw);
      expect(result.context_window).toBe(32768);
      expect(result.health_threshold).toBe(0.8);
    });

    it('should reject non-numeric for numeric fields', () => {
      const raw = { context_window: 'big' };
      const result = validateSettings(raw);
      expect(result.context_window).toBeUndefined();
    });

    it('should clamp health_threshold to valid range', () => {
      expect(validateSettings({ health_threshold: 1.5 }).health_threshold).toBe(1.0);
      expect(validateSettings({ health_threshold: -0.5 }).health_threshold).toBe(0.0);
    });

    it('should clamp semantic_threshold to valid range', () => {
      expect(validateSettings({ semantic_threshold: 2.0 }).semantic_threshold).toBe(1.0);
      expect(validateSettings({ semantic_threshold: -1.0 }).semantic_threshold).toBe(0.0);
    });

    it('should ignore unknown fields', () => {
      const raw = { enabled: true, unknown_field: 'ignored' };
      const result = validateSettings(raw);
      expect(result.enabled).toBe(true);
      expect((result as Record<string, unknown>).unknown_field).toBeUndefined();
    });
  });

  describe('loadSettings', () => {
    it('should return defaults when file does not exist', async () => {
      const settings = await loadSettings(testDir);
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should merge user settings with defaults', async () => {
      writeFileSync(
        settingsPath,
        `---
chat_model: llama3.2
health_threshold: 0.8
---
`
      );
      const settings = await loadSettings(testDir);
      expect(settings.chat_model).toBe('llama3.2');
      expect(settings.health_threshold).toBe(0.8);
      // Defaults preserved
      expect(settings.enabled).toBe(true);
      expect(settings.ollama_host).toBe('http://localhost:11434');
    });

    it('should use defaults for invalid values', async () => {
      writeFileSync(
        settingsPath,
        `---
chat_model: valid-model
context_window: not-a-number
---
`
      );
      const settings = await loadSettings(testDir);
      expect(settings.chat_model).toBe('valid-model');
      expect(settings.context_window).toBe(DEFAULT_SETTINGS.context_window);
    });

    it('should handle parse errors gracefully', async () => {
      writeFileSync(settingsPath, 'invalid: yaml: [unclosed');
      const settings = await loadSettings(testDir);
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should handle complete settings file', async () => {
      writeFileSync(
        settingsPath,
        `---
enabled: false
ollama_host: http://remote:11434
chat_model: gpt-oss:20b
embedding_model: custom-embed
context_window: 65536
health_threshold: 0.9
semantic_threshold: 0.6
auto_sync: true
---

# Custom configuration
`
      );
      const settings = await loadSettings(testDir);
      expect(settings).toEqual({
        enabled: false,
        ollama_host: 'http://remote:11434',
        chat_model: 'gpt-oss:20b',
        embedding_model: 'custom-embed',
        context_window: 65536,
        health_threshold: 0.9,
        semantic_threshold: 0.6,
        auto_sync: true,
        duplicate_threshold: 0.92,
        lsh_collection_threshold: 200,
        lsh_hash_bits: 10,
        lsh_tables: 6,
        settings_version: 1,
        reminder_count: 1,
        skip_hooks_after_clear: false,
        ollama_keep_alive: '5m',
        ollama_prewarm_timeout: 10000,
      });
    });

    it('should respect enabled: false', async () => {
      writeFileSync(
        settingsPath,
        `---
enabled: false
---
`
      );
      const settings = await loadSettings(testDir);
      expect(settings.enabled).toBe(false);
    });
  });

  describe('checkAndMigrateSettingsVersion', () => {
    const testDir = join(__dirname, '../../../.test-temp/settings-version');
    const examplePath = join(testDir, '.claude', 'memory.example.md');

    beforeEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
      mkdirSync(join(testDir, '.claude'), { recursive: true });
    });

    afterEach(() => {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('should not migrate when versions match', async () => {
      const settings = { ...DEFAULT_SETTINGS, settings_version: 1 };
      const result = await checkAndMigrateSettingsVersion(testDir, settings);

      expect(result.migrationNeeded).toBe(false);
      expect(result.userVersion).toBe(1);
      expect(result.currentVersion).toBe(1);
      expect(result.newSettings).toEqual([]);
      expect(result.templateUpdated).toBe(false);
    });

    it('should migrate when user version is outdated', async () => {
      const settings = { ...DEFAULT_SETTINGS, settings_version: 0 };
      const result = await checkAndMigrateSettingsVersion(testDir, settings);

      expect(result.migrationNeeded).toBe(true);
      expect(result.userVersion).toBe(0);
      expect(result.currentVersion).toBe(1);
      expect(result.newSettings.length).toBeGreaterThan(0);
      expect(result.newSettings).toContain('settings_version: 1');
      expect(result.newSettings).toContain('reminder_count: 1');
    });

    it('should update memory.example.md when migrating', async () => {
      const settings = { ...DEFAULT_SETTINGS, settings_version: 0 };
      const result = await checkAndMigrateSettingsVersion(testDir, settings);

      expect(result.templateUpdated).toBe(true);
      expect(existsSync(examplePath)).toBe(true);

      // Verify content was copied
      const content = readFileSync(examplePath, 'utf-8');
      expect(content).toContain('settings_version: 1');
      expect(content).toContain('Memory Plugin Configuration');
    });

    it('should handle missing template gracefully', async () => {
      // Set invalid CLAUDE_PLUGIN_ROOT to simulate missing template
      const originalRoot = process.env.CLAUDE_PLUGIN_ROOT;
      process.env.CLAUDE_PLUGIN_ROOT = '/nonexistent/path';

      const settings = { ...DEFAULT_SETTINGS, settings_version: 0 };
      const result = await checkAndMigrateSettingsVersion(testDir, settings);

      expect(result.migrationNeeded).toBe(true);
      expect(result.templateUpdated).toBe(false); // Should fail gracefully

      // Restore env
      if (originalRoot) {
        process.env.CLAUDE_PLUGIN_ROOT = originalRoot;
      } else {
        delete process.env.CLAUDE_PLUGIN_ROOT;
      }
    });
  });
});
