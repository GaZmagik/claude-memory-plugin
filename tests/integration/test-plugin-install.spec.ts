/**
 * Integration tests for plugin installation process
 * Validates that all required files exist and are properly structured
 */

import { describe, it, expect } from 'bun:test';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Plugin Installation', () => {
  const pluginRoot = join(import.meta.dir, '../..');

  describe('required directories', () => {
    it('should have .claude-plugin directory', () => {
      expect(existsSync(join(pluginRoot, '.claude-plugin'))).toBe(true);
    });

    it('should have skills directory', () => {
      expect(existsSync(join(pluginRoot, 'skills'))).toBe(true);
      expect(existsSync(join(pluginRoot, 'skills/memory'))).toBe(true);
    });

    it('should have hooks directory', () => {
      expect(existsSync(join(pluginRoot, 'hooks'))).toBe(true);
    });

    it('should have commands directory', () => {
      expect(existsSync(join(pluginRoot, 'commands'))).toBe(true);
    });

    it('should have agents directory', () => {
      expect(existsSync(join(pluginRoot, 'agents'))).toBe(true);
    });
  });

  describe('plugin.json manifest', () => {
    it('should exist and be valid JSON', () => {
      const pluginJsonPath = join(pluginRoot, '.claude-plugin/plugin.json');
      expect(existsSync(pluginJsonPath)).toBe(true);

      const content = readFileSync(pluginJsonPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should have auto-discoverable component directories', () => {
      // Claude Code auto-discovers components from these directories
      // Validate skills directory
      expect(existsSync(join(pluginRoot, 'skills'))).toBe(true);
      expect(existsSync(join(pluginRoot, 'skills/memory/SKILL.md'))).toBe(true);

      // Validate hooks.json
      expect(existsSync(join(pluginRoot, 'hooks/hooks.json'))).toBe(true);

      // Validate commands directory
      expect(existsSync(join(pluginRoot, 'commands'))).toBe(true);

      // Validate agents directory
      expect(existsSync(join(pluginRoot, 'agents'))).toBe(true);
    });
  });

  describe('hooks.json manifest', () => {
    it('should exist and be valid JSON', () => {
      const hooksJsonPath = join(pluginRoot, 'hooks/hooks.json');
      expect(existsSync(hooksJsonPath)).toBe(true);

      const content = readFileSync(hooksJsonPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should reference existing hook files', () => {
      const hooksJson = JSON.parse(
        readFileSync(join(pluginRoot, 'hooks/hooks.json'), 'utf-8')
      );

      // Extract all hook commands and validate files exist
      for (const [eventType, configs] of Object.entries(hooksJson.hooks)) {
        for (const config of configs as Array<{ hooks: Array<{ command: string }> }>) {
          for (const hook of config.hooks) {
            // Extract path from command (removes 'bun ${CLAUDE_PLUGIN_ROOT}/')
            const hookPath = hook.command
              .replace('bun ${CLAUDE_PLUGIN_ROOT}/', '')
              .replace(/\s+$/, '');
            expect(existsSync(join(pluginRoot, hookPath))).toBe(true);
          }
        }
      }
    });
  });

  describe('package.json configuration', () => {
    it('should exist and be valid JSON', () => {
      const packageJsonPath = join(pluginRoot, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);

      const content = readFileSync(packageJsonPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should have required scripts', () => {
      const packageJson = JSON.parse(
        readFileSync(join(pluginRoot, 'package.json'), 'utf-8')
      );

      expect(packageJson.scripts.postinstall).toBeDefined();
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.test).toBeDefined();
    });

    it('should have bin entry for CLI', () => {
      const packageJson = JSON.parse(
        readFileSync(join(pluginRoot, 'package.json'), 'utf-8')
      );

      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin.memory).toBeDefined();
    });
  });

  describe('skill structure', () => {
    it('should have SKILL.md', () => {
      expect(existsSync(join(pluginRoot, 'skills/memory/SKILL.md'))).toBe(true);
    });

    it('should have CLI entry point', () => {
      expect(existsSync(join(pluginRoot, 'skills/memory/src/cli.ts'))).toBe(true);
    });

    it('should have source directories', () => {
      const srcDirs = ['core', 'types', 'graph', 'search', 'quality', 'scope'];
      for (const dir of srcDirs) {
        const path = join(pluginRoot, `skills/memory/src/${dir}`);
        expect(existsSync(path)).toBe(true);
        expect(statSync(path).isDirectory()).toBe(true);
      }
    });
  });

  describe('command structure', () => {
    it('should have .md files with frontmatter', () => {
      const commandsDir = join(pluginRoot, 'commands');
      const commands = readdirSync(commandsDir).filter((f) => f.endsWith('.md'));

      expect(commands.length).toBeGreaterThan(0);

      for (const cmd of commands) {
        const content = readFileSync(join(commandsDir, cmd), 'utf-8');
        // Should have YAML frontmatter
        expect(content.startsWith('---')).toBe(true);
        expect(content.indexOf('---', 3)).toBeGreaterThan(3);
      }
    });
  });

  describe('agent structure', () => {
    it('should have .md files with frontmatter', () => {
      const agentsDir = join(pluginRoot, 'agents');
      const agents = readdirSync(agentsDir).filter((f) => f.endsWith('.md'));

      expect(agents.length).toBeGreaterThan(0);

      for (const agent of agents) {
        const content = readFileSync(join(agentsDir, agent), 'utf-8');
        // Should have YAML frontmatter
        expect(content.startsWith('---')).toBe(true);
        expect(content.indexOf('---', 3)).toBeGreaterThan(3);
      }
    });
  });

  describe('documentation', () => {
    it('should have README.md', () => {
      expect(existsSync(join(pluginRoot, 'README.md'))).toBe(true);
    });

    it('should have CHANGELOG.md', () => {
      expect(existsSync(join(pluginRoot, 'CHANGELOG.md'))).toBe(true);
    });

    it('README should document installation', () => {
      const readme = readFileSync(join(pluginRoot, 'README.md'), 'utf-8');
      expect(readme.toLowerCase()).toContain('install');
    });
  });
});
