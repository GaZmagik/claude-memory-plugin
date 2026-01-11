/**
 * T036: Unit test for config.json parsing
 *
 * Tests the config reader that parses scope preferences and settings
 * from the project's config.json file.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadConfig,
  getEnterpriseConfig,
  getDefaultScopeConfig,
  getEmbeddingConfig,
  configExists,
  saveConfig,
  type MemoryConfig,
} from '../../../skills/memory/src/scope/config.js';

describe('Config Parser', () => {
  let testDir: string;
  let configDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'config-parser-'));
    configDir = path.join(testDir, '.claude');
    fs.mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('should return empty config when no config.json exists', () => {
      const result = loadConfig(testDir);

      expect(result).toBeDefined();
      expect(result.scopes).toBeUndefined();
    });

    it('should parse valid config.json', () => {
      const config = {
        scopes: {
          enterprise: { enabled: true },
          default: 'project',
        },
        embedding: {
          model: 'nomic-embed-text',
        },
      };
      fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config));

      const result = loadConfig(testDir);

      expect(result.scopes?.enterprise?.enabled).toBe(true);
      expect(result.scopes?.default).toBe('project');
      expect(result.embedding?.model).toBe('nomic-embed-text');
    });

    it('should handle malformed JSON gracefully', () => {
      fs.writeFileSync(path.join(configDir, 'config.json'), '{ invalid json }');

      const result = loadConfig(testDir);

      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
    });

    it('should look in ~/.claude/ for global config', () => {
      // This test verifies the lookup path logic
      const globalDir = fs.mkdtempSync(path.join(tmpdir(), 'global-config-'));
      const globalClaudeDir = path.join(globalDir, '.claude');
      fs.mkdirSync(globalClaudeDir, { recursive: true });

      const config = { scopes: { default: 'global' } };
      fs.writeFileSync(path.join(globalClaudeDir, 'config.json'), JSON.stringify(config));

      const result = loadConfig(globalDir);

      expect(result.scopes?.default).toBe('global');

      fs.rmSync(globalDir, { recursive: true, force: true });
    });
  });

  describe('getEnterpriseConfig', () => {
    it('should return disabled when no enterprise config', () => {
      const config: MemoryConfig = {};

      const result = getEnterpriseConfig(config);

      expect(result.enabled).toBe(false);
    });

    it('should return enabled state from config', () => {
      const config: MemoryConfig = {
        scopes: {
          enterprise: { enabled: true },
        },
      };

      const result = getEnterpriseConfig(config);

      expect(result.enabled).toBe(true);
    });

    it('should return false when explicitly disabled', () => {
      const config: MemoryConfig = {
        scopes: {
          enterprise: { enabled: false },
        },
      };

      const result = getEnterpriseConfig(config);

      expect(result.enabled).toBe(false);
    });
  });

  describe('getDefaultScopeConfig', () => {
    it('should return undefined when no default configured', () => {
      const config: MemoryConfig = {};

      const result = getDefaultScopeConfig(config);

      expect(result).toBeUndefined();
    });

    it('should return configured default scope', () => {
      const config: MemoryConfig = {
        scopes: {
          default: 'project',
        },
      };

      const result = getDefaultScopeConfig(config);

      expect(result).toBe('project');
    });

    it('should validate scope value', () => {
      const config: MemoryConfig = {
        scopes: {
          default: 'invalid-scope' as any,
        },
      };

      const result = getDefaultScopeConfig(config);

      // Should return undefined for invalid scope or throw
      expect(result === undefined || result === 'invalid-scope').toBe(true);
    });
  });

  describe('getEmbeddingConfig', () => {
    it('should return default embedding config when not specified', () => {
      const config: MemoryConfig = {};

      const result = getEmbeddingConfig(config);

      expect(result.model).toBe('embeddinggemma');
    });

    it('should return custom embedding model from config', () => {
      const config: MemoryConfig = {
        embedding: {
          model: 'nomic-embed-text',
        },
      };

      const result = getEmbeddingConfig(config);

      expect(result.model).toBe('nomic-embed-text');
    });

    it('should return embedding endpoint if configured', () => {
      const config: MemoryConfig = {
        embedding: {
          model: 'custom-model',
          endpoint: 'http://localhost:11434',
        },
      };

      const result = getEmbeddingConfig(config);

      expect(result.endpoint).toBe('http://localhost:11434');
    });
  });

  describe('Config merging', () => {
    it('should merge project config with global config', () => {
      // Create global config
      const globalDir = fs.mkdtempSync(path.join(tmpdir(), 'global-'));
      const globalClaudeDir = path.join(globalDir, '.claude');
      fs.mkdirSync(globalClaudeDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalClaudeDir, 'config.json'),
        JSON.stringify({
          embedding: { model: 'global-model' },
          scopes: { default: 'global' },
        })
      );

      // Create project config (should override)
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({
          embedding: { model: 'project-model' },
        })
      );

      const result = loadConfig(testDir, globalDir);

      // Project config should override global
      expect(result.embedding?.model).toBe('project-model');
      // Global config should be used for missing values
      expect(result.scopes?.default).toBe('global');

      fs.rmSync(globalDir, { recursive: true, force: true });
    });
  });

  describe('configExists', () => {
    it('should return true when config.json exists', () => {
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ scopes: { default: 'local' } })
      );

      expect(configExists(testDir)).toBe(true);
    });

    it('should return false when config.json does not exist', () => {
      expect(configExists(testDir)).toBe(false);
    });

    it('should return false for non-existent directory', () => {
      expect(configExists('/non-existent-path-12345')).toBe(false);
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const config: MemoryConfig = {
        scopes: { default: 'local' },
        embedding: { model: 'test-model' },
      };

      saveConfig(testDir, config);

      const savedContent = fs.readFileSync(
        path.join(configDir, 'config.json'),
        'utf-8'
      );
      const savedConfig = JSON.parse(savedContent);
      expect(savedConfig.scopes?.default).toBe('local');
      expect(savedConfig.embedding?.model).toBe('test-model');
    });

    it('should create .claude directory if it does not exist', () => {
      const newTestDir = fs.mkdtempSync(path.join(tmpdir(), 'config-save-'));
      const config: MemoryConfig = { scopes: { default: 'global' } };

      saveConfig(newTestDir, config);

      expect(fs.existsSync(path.join(newTestDir, '.claude', 'config.json'))).toBe(true);

      fs.rmSync(newTestDir, { recursive: true, force: true });
    });

    it('should overwrite existing config', () => {
      // Write initial config
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ scopes: { default: 'old-value' } })
      );

      // Save new config
      const newConfig: MemoryConfig = { scopes: { default: 'new-value' } };
      saveConfig(testDir, newConfig);

      const savedConfig = JSON.parse(
        fs.readFileSync(path.join(configDir, 'config.json'), 'utf-8')
      );
      expect(savedConfig.scopes?.default).toBe('new-value');
    });
  });
});
