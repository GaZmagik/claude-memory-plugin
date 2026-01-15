/**
 * Unit tests for plugin.json schema validation
 * Validates that plugin metadata conforms to expected structure
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Plugin Metadata (plugin.json)', () => {
  const pluginRoot = join(import.meta.dir, '../../..');
  const pluginJsonPath = join(pluginRoot, '.claude-plugin/plugin.json');
  let pluginJson: Record<string, unknown>;

  beforeAll(() => {
    expect(existsSync(pluginJsonPath)).toBe(true);
    const content = readFileSync(pluginJsonPath, 'utf-8');
    pluginJson = JSON.parse(content);
  });

  describe('required fields', () => {
    it('should have a name', () => {
      expect(pluginJson.name).toBeDefined();
      expect(typeof pluginJson.name).toBe('string');
      expect((pluginJson.name as string).length).toBeGreaterThan(0);
    });

    it('should have a version following semver', () => {
      expect(pluginJson.version).toBeDefined();
      expect(typeof pluginJson.version).toBe('string');
      // Basic semver pattern
      expect(pluginJson.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have a description', () => {
      expect(pluginJson.description).toBeDefined();
      expect(typeof pluginJson.description).toBe('string');
      expect((pluginJson.description as string).length).toBeGreaterThan(10);
    });

    it('should have an author', () => {
      expect(pluginJson.author).toBeDefined();
      expect(typeof pluginJson.author).toBe('object');
      expect((pluginJson.author as Record<string, string>).name).toBeDefined();
    });
  });

  describe('optional metadata fields', () => {
    it('should have a license', () => {
      expect(pluginJson.license).toBeDefined();
      expect(['MIT', 'Apache-2.0', 'ISC', 'BSD-3-Clause']).toContain(pluginJson.license as string);
    });

    it('should have a repository URL', () => {
      expect(pluginJson.repository).toBeDefined();
      expect(typeof pluginJson.repository).toBe('string');
      expect(pluginJson.repository).toMatch(/^https?:\/\//);
    });

    it('should have keywords array', () => {
      expect(pluginJson.keywords).toBeDefined();
      expect(Array.isArray(pluginJson.keywords)).toBe(true);
      expect((pluginJson.keywords as string[]).length).toBeGreaterThan(0);
    });
  });

  describe('engine requirements', () => {
    it('should specify claude-code version', () => {
      expect(pluginJson.engines).toBeDefined();
      const engines = pluginJson.engines as Record<string, string>;
      expect(engines['claude-code']).toBeDefined();
      expect(engines['claude-code']).toMatch(/^>=?\d+/);
    });

    it('should specify bun version', () => {
      const engines = pluginJson.engines as Record<string, string>;
      expect(engines.bun).toBeDefined();
      expect(engines.bun).toMatch(/^>=?\d+/);
    });
  });

  describe('components declaration', () => {
    it('should declare components object', () => {
      expect(pluginJson.components).toBeDefined();
      expect(typeof pluginJson.components).toBe('object');
    });

    it('should declare skills', () => {
      const components = pluginJson.components as Record<string, unknown>;
      expect(components.skills).toBeDefined();
      expect(Array.isArray(components.skills)).toBe(true);
      expect((components.skills as string[]).length).toBeGreaterThan(0);
    });

    it('should declare hooks configuration', () => {
      const components = pluginJson.components as Record<string, unknown>;
      expect(components.hooks).toBeDefined();
      expect(typeof components.hooks).toBe('string');
      expect(components.hooks).toContain('hooks.json');
    });

    it('should declare commands', () => {
      const components = pluginJson.components as Record<string, unknown>;
      expect(components.commands).toBeDefined();
      expect(Array.isArray(components.commands)).toBe(true);
      expect((components.commands as string[]).length).toBeGreaterThan(0);
    });

    it('should declare agents', () => {
      const components = pluginJson.components as Record<string, unknown>;
      expect(components.agents).toBeDefined();
      expect(Array.isArray(components.agents)).toBe(true);
      expect((components.agents as string[]).length).toBeGreaterThan(0);
    });
  });

  describe('component paths validation', () => {
    it('should have valid skill paths', () => {
      const components = pluginJson.components as Record<string, string[]>;
      for (const skillPath of components.skills) {
        const fullPath = join(pluginRoot, skillPath);
        expect(existsSync(fullPath)).toBe(true);
      }
    });

    it('should have valid hooks.json path', () => {
      const components = pluginJson.components as Record<string, string>;
      const hooksPath = join(pluginRoot, components.hooks);
      expect(existsSync(hooksPath)).toBe(true);
    });

    it('should have valid command paths', () => {
      const components = pluginJson.components as Record<string, string[]>;
      for (const cmdPath of components.commands) {
        const fullPath = join(pluginRoot, cmdPath);
        expect(existsSync(fullPath)).toBe(true);
      }
    });

    it('should have valid agent paths', () => {
      const components = pluginJson.components as Record<string, string[]>;
      for (const agentPath of components.agents) {
        const fullPath = join(pluginRoot, agentPath);
        expect(existsSync(fullPath)).toBe(true);
      }
    });
  });
});
