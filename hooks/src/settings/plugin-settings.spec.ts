/**
 * Tests for plugin settings parser
 * TDD: Tests written first to define expected behaviour
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import {
  loadSettings,
  parseYamlFrontmatter,
  validateSettings,
  DEFAULT_SETTINGS,
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
    it('should return defaults when file does not exist', () => {
      const settings = loadSettings(testDir);
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should merge user settings with defaults', () => {
      writeFileSync(
        settingsPath,
        `---
chat_model: llama3.2
health_threshold: 0.8
---
`
      );
      const settings = loadSettings(testDir);
      expect(settings.chat_model).toBe('llama3.2');
      expect(settings.health_threshold).toBe(0.8);
      // Defaults preserved
      expect(settings.enabled).toBe(true);
      expect(settings.ollama_host).toBe('http://localhost:11434');
    });

    it('should use defaults for invalid values', () => {
      writeFileSync(
        settingsPath,
        `---
chat_model: valid-model
context_window: not-a-number
---
`
      );
      const settings = loadSettings(testDir);
      expect(settings.chat_model).toBe('valid-model');
      expect(settings.context_window).toBe(DEFAULT_SETTINGS.context_window);
    });

    it('should handle parse errors gracefully', () => {
      writeFileSync(settingsPath, 'invalid: yaml: [unclosed');
      const settings = loadSettings(testDir);
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should handle complete settings file', () => {
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
      const settings = loadSettings(testDir);
      expect(settings).toEqual({
        enabled: false,
        ollama_host: 'http://remote:11434',
        chat_model: 'gpt-oss:20b',
        embedding_model: 'custom-embed',
        context_window: 65536,
        health_threshold: 0.9,
        semantic_threshold: 0.6,
        auto_sync: true,
      });
    });

    it('should respect enabled: false', () => {
      writeFileSync(
        settingsPath,
        `---
enabled: false
---
`
      );
      const settings = loadSettings(testDir);
      expect(settings.enabled).toBe(false);
    });
  });
});
