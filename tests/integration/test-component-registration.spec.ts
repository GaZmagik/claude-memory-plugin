/**
 * Integration tests for plugin component registration
 * Validates that all components are properly discoverable and configured
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Component Registration', () => {
  const pluginRoot = join(import.meta.dir, '../..');
  let pluginJson: Record<string, unknown>;
  let hooksJson: Record<string, unknown>;

  beforeAll(() => {
    pluginJson = JSON.parse(
      readFileSync(join(pluginRoot, '.claude-plugin/plugin.json'), 'utf-8')
    );
    hooksJson = JSON.parse(
      readFileSync(join(pluginRoot, 'hooks/hooks.json'), 'utf-8')
    );
  });

  describe('skill registration', () => {
    it('should register memory skill with SKILL.md', () => {
      const components = pluginJson.components as Record<string, string[]>;
      expect(components.skills).toContain('skills/memory/SKILL.md');

      const skillPath = join(pluginRoot, 'skills/memory/SKILL.md');
      expect(existsSync(skillPath)).toBe(true);

      const skillContent = readFileSync(skillPath, 'utf-8');
      // SKILL.md uses YAML frontmatter with name field
      expect(skillContent).toMatch(/name:\s*memory/);
    });

    it('should have CLI entry point for skill', () => {
      const cliPath = join(pluginRoot, 'skills/memory/src/cli.ts');
      expect(existsSync(cliPath)).toBe(true);

      const cliContent = readFileSync(cliPath, 'utf-8');
      // CLI uses dispatch function from cli/index.js
      expect(cliContent).toContain('dispatch');
    });
  });

  describe('hook registration', () => {
    it('should register all hooks in hooks.json', () => {
      expect(hooksJson.hooks).toBeDefined();
      const hooks = hooksJson.hooks as Record<string, unknown[]>;
      const eventTypes = Object.keys(hooks);
      expect(eventTypes.length).toBeGreaterThan(0);
    });

    it('should have PreToolUse hooks', () => {
      const hooks = hooksJson.hooks as Record<string, unknown[]>;
      expect(hooks.PreToolUse).toBeDefined();
      expect(Array.isArray(hooks.PreToolUse)).toBe(true);
      expect(hooks.PreToolUse.length).toBeGreaterThan(0);
    });

    it('should have PostToolUse hooks', () => {
      const hooks = hooksJson.hooks as Record<string, unknown[]>;
      expect(hooks.PostToolUse).toBeDefined();
      expect(Array.isArray(hooks.PostToolUse)).toBe(true);
      expect(hooks.PostToolUse.length).toBeGreaterThan(0);
    });

    it('should have UserPromptSubmit hooks', () => {
      const hooks = hooksJson.hooks as Record<string, unknown[]>;
      expect(hooks.UserPromptSubmit).toBeDefined();
      expect(Array.isArray(hooks.UserPromptSubmit)).toBe(true);
      expect(hooks.UserPromptSubmit.length).toBeGreaterThan(0);
    });

    it('should have SessionStart hooks', () => {
      const hooks = hooksJson.hooks as Record<string, unknown[]>;
      expect(hooks.SessionStart).toBeDefined();
      expect(Array.isArray(hooks.SessionStart)).toBe(true);
    });

    it('should have all hook files exist', () => {
      const hooks = hooksJson.hooks as Record<string, Array<{ hooks: Array<{ command: string }> }>>;

      for (const [_eventType, configs] of Object.entries(hooks)) {
        for (const config of configs) {
          for (const hook of config.hooks) {
            const match = hook.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s]+)/);
            if (match) {
              const hookPath = match[1];
              expect(existsSync(join(pluginRoot, hookPath))).toBe(true);
            }
          }
        }
      }
    });
  });

  describe('command registration', () => {
    it('should register all commands in plugin.json', () => {
      const components = pluginJson.components as Record<string, string[]>;
      expect(components.commands).toBeDefined();
      expect(Array.isArray(components.commands)).toBe(true);
      expect(components.commands.length).toBeGreaterThan(0);
    });

    it('should have check-gotchas command', () => {
      const components = pluginJson.components as Record<string, string[]>;
      const hasCheckGotchas = components.commands.some((cmd: string) =>
        cmd.includes('check-gotchas')
      );
      expect(hasCheckGotchas).toBe(true);
    });

    it('should have check-health command', () => {
      const components = pluginJson.components as Record<string, string[]>;
      const hasCheckHealth = components.commands.some((cmd: string) =>
        cmd.includes('check-health')
      );
      expect(hasCheckHealth).toBe(true);
    });

    it('should have commit command', () => {
      const components = pluginJson.components as Record<string, string[]>;
      const hasCommit = components.commands.some((cmd: string) =>
        cmd.includes('commit')
      );
      expect(hasCommit).toBe(true);
    });

    it('should have valid command frontmatter', () => {
      const components = pluginJson.components as Record<string, string[]>;

      for (const cmdPath of components.commands) {
        const fullPath = join(pluginRoot, cmdPath);
        const content = readFileSync(fullPath, 'utf-8');

        // Commands use YAML frontmatter with description field
        expect(content.startsWith('---')).toBe(true);
        expect(content).toMatch(/^---[\s\S]*?description:/m);
      }
    });
  });

  describe('agent registration', () => {
    it('should register all agents in plugin.json', () => {
      const components = pluginJson.components as Record<string, string[]>;
      expect(components.agents).toBeDefined();
      expect(Array.isArray(components.agents)).toBe(true);
      expect(components.agents.length).toBeGreaterThan(0);
    });

    it('should have recall agent', () => {
      const components = pluginJson.components as Record<string, string[]>;
      const hasRecall = components.agents.some((agent: string) =>
        agent.includes('recall')
      );
      expect(hasRecall).toBe(true);
    });

    it('should have curator agent', () => {
      const components = pluginJson.components as Record<string, string[]>;
      const hasCurator = components.agents.some((agent: string) =>
        agent.includes('curator')
      );
      expect(hasCurator).toBe(true);
    });

    it('should have valid agent frontmatter', () => {
      const components = pluginJson.components as Record<string, string[]>;

      for (const agentPath of components.agents) {
        const fullPath = join(pluginRoot, agentPath);
        const content = readFileSync(fullPath, 'utf-8');

        expect(content.startsWith('---')).toBe(true);
        expect(content).toMatch(/^---[\s\S]*?name:/m);
        expect(content).toMatch(/^---[\s\S]*?tools:/m);
      }
    });
  });

  describe('cross-component references', () => {
    it('should have commands that reference agents correctly', () => {
      const components = pluginJson.components as Record<string, string[]>;

      for (const cmdPath of components.commands) {
        const content = readFileSync(join(pluginRoot, cmdPath), 'utf-8');

        if (content.includes('memory:recall')) {
          const hasRecallAgent = components.agents.some((a: string) =>
            a.includes('recall')
          );
          expect(hasRecallAgent).toBe(true);
        }

        if (content.includes('memory:curator')) {
          const hasCuratorAgent = components.agents.some((a: string) =>
            a.includes('curator')
          );
          expect(hasCuratorAgent).toBe(true);
        }
      }
    });

    it('should have hooks that reference skill CLI correctly', () => {
      const hooks = hooksJson.hooks as Record<string, Array<{ hooks: Array<{ command: string }> }>>;

      let referencesMemoryCli = false;
      for (const configs of Object.values(hooks)) {
        for (const config of configs) {
          for (const hook of config.hooks) {
            if (hook.command.includes('memory')) {
              referencesMemoryCli = true;
            }
          }
        }
      }

      if (referencesMemoryCli) {
        expect(existsSync(join(pluginRoot, 'skills/memory/src/cli.ts'))).toBe(true);
      }
    });
  });

  describe('component discoverability', () => {
    it('should have all paths relative to plugin root', () => {
      const components = pluginJson.components as Record<string, string | string[]>;

      for (const skillPath of components.skills as string[]) {
        expect(skillPath.startsWith('/')).toBe(false);
        expect(skillPath.startsWith('./')).toBe(false);
      }

      for (const cmdPath of components.commands as string[]) {
        expect(cmdPath.startsWith('/')).toBe(false);
        expect(cmdPath.startsWith('./')).toBe(false);
      }

      for (const agentPath of components.agents as string[]) {
        expect(agentPath.startsWith('/')).toBe(false);
        expect(agentPath.startsWith('./')).toBe(false);
      }

      expect((components.hooks as string).startsWith('/')).toBe(false);
    });

    it('should use consistent naming conventions', () => {
      const components = pluginJson.components as Record<string, string[]>;

      for (const cmdPath of components.commands) {
        expect(cmdPath.endsWith('.md')).toBe(true);
      }

      for (const agentPath of components.agents) {
        expect(agentPath.endsWith('.md')).toBe(true);
      }

      for (const skillPath of components.skills) {
        expect(skillPath.endsWith('SKILL.md')).toBe(true);
      }
    });
  });
});
