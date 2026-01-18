/**
 * Unit tests for plugin.json schema validation
 * Validates that plugin metadata conforms to Claude Code plugin schema
 *
 * Official schema reference: https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema
 *
 * Required fields: name, version, description
 * Optional fields: author, license, repository, keywords
 *
 * Note: Claude Code uses auto-discovery for components (skills/, agents/, commands/, hooks/)
 * so 'engines' and 'components' are NOT part of the official schema.
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

  describe('auto-discovery directories', () => {
    it('should have skills directory', () => {
      const skillsDir = join(pluginRoot, 'skills');
      expect(existsSync(skillsDir)).toBe(true);
    });

    it('should have agents directory', () => {
      const agentsDir = join(pluginRoot, 'agents');
      expect(existsSync(agentsDir)).toBe(true);
    });

    it('should have commands directory', () => {
      const commandsDir = join(pluginRoot, 'commands');
      expect(existsSync(commandsDir)).toBe(true);
    });

    it('should have hooks directory', () => {
      const hooksDir = join(pluginRoot, 'hooks');
      expect(existsSync(hooksDir)).toBe(true);
    });
  });

  describe('schema compliance', () => {
    it('should not have deprecated components field', () => {
      // Official schema uses auto-discovery, not explicit components
      expect(pluginJson.components).toBeUndefined();
    });

    it('should not have engines field (not in official schema)', () => {
      // engines field is not part of official Claude Code plugin schema
      expect(pluginJson.engines).toBeUndefined();
    });
  });
});
