/**
 * Integration tests for plugin component registration
 * Validates that all components are properly discoverable and configured
 *
 * Note: Claude Code uses auto-discovery for components:
 * - skills/ -> SKILL.md files
 * - commands/ -> .md files
 * - agents/ -> .md files
 * - hooks/ -> hooks.json
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Component Registration', () => {
  const pluginRoot = join(import.meta.dir, '../..');
  let hooksJson: Record<string, unknown>;

  beforeAll(() => {
    hooksJson = JSON.parse(
      readFileSync(join(pluginRoot, 'hooks/hooks.json'), 'utf-8')
    );
  });

  describe('skill registration', () => {
    it('should have memory skill with SKILL.md', () => {
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

  describe('command auto-discovery', () => {
    const commandsDir = join(import.meta.dir, '../../commands');

    it('should have commands directory', () => {
      expect(existsSync(commandsDir)).toBe(true);
    });

    it('should have check-gotchas command', () => {
      const files = readdirSync(commandsDir);
      const hasCheckGotchas = files.some((f: string) => f.includes('check-gotchas'));
      expect(hasCheckGotchas).toBe(true);
    });

    it('should have check-health command', () => {
      const files = readdirSync(commandsDir);
      const hasCheckHealth = files.some((f: string) => f.includes('check-health'));
      expect(hasCheckHealth).toBe(true);
    });

    it('should have commit command', () => {
      const files = readdirSync(commandsDir);
      const hasCommit = files.some((f: string) => f.includes('commit'));
      expect(hasCommit).toBe(true);
    });

    it('should have valid command frontmatter', () => {
      const files = readdirSync(commandsDir).filter(f => f.endsWith('.md'));

      for (const cmdFile of files) {
        const fullPath = join(commandsDir, cmdFile);
        const content = readFileSync(fullPath, 'utf-8');

        // Commands use YAML frontmatter with description field
        expect(content.startsWith('---')).toBe(true);
        expect(content).toMatch(/^---[\s\S]*?description:/m);
      }
    });
  });

  describe('agent auto-discovery', () => {
    const agentsDir = join(import.meta.dir, '../../agents');

    it('should have agents directory', () => {
      expect(existsSync(agentsDir)).toBe(true);
    });

    it('should have recall agent', () => {
      const files = readdirSync(agentsDir);
      const hasRecall = files.some((f: string) => f.includes('recall'));
      expect(hasRecall).toBe(true);
    });

    it('should have curator agent', () => {
      const files = readdirSync(agentsDir);
      const hasCurator = files.some((f: string) => f.includes('curator'));
      expect(hasCurator).toBe(true);
    });

    it('should have valid agent frontmatter', () => {
      const files = readdirSync(agentsDir).filter(f => f.endsWith('.md'));

      for (const agentFile of files) {
        const fullPath = join(agentsDir, agentFile);
        const content = readFileSync(fullPath, 'utf-8');

        expect(content.startsWith('---')).toBe(true);
        expect(content).toMatch(/^---[\s\S]*?name:/m);
        expect(content).toMatch(/^---[\s\S]*?tools:/m);
      }
    });
  });

  describe('cross-component references', () => {
    it('should have commands that reference agents correctly', () => {
      const commandsDir = join(import.meta.dir, '../../commands');
      const agentsDir = join(import.meta.dir, '../../agents');
      const commands = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
      const agents = readdirSync(agentsDir).filter(f => f.endsWith('.md'));

      for (const cmdFile of commands) {
        const content = readFileSync(join(commandsDir, cmdFile), 'utf-8');

        if (content.includes('memory:recall')) {
          const hasRecallAgent = agents.some((a: string) => a.includes('recall'));
          expect(hasRecallAgent).toBe(true);
        }

        if (content.includes('memory:curator')) {
          const hasCuratorAgent = agents.some((a: string) => a.includes('curator'));
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
    it('should have all component directories exist', () => {
      expect(existsSync(join(pluginRoot, 'skills'))).toBe(true);
      expect(existsSync(join(pluginRoot, 'commands'))).toBe(true);
      expect(existsSync(join(pluginRoot, 'agents'))).toBe(true);
      expect(existsSync(join(pluginRoot, 'hooks'))).toBe(true);
    });

    it('should use consistent naming conventions', () => {
      const commandsDir = join(pluginRoot, 'commands');
      const agentsDir = join(pluginRoot, 'agents');
      const skillsDir = join(pluginRoot, 'skills/memory');

      // Commands should be .md files
      const commands = readdirSync(commandsDir).filter(f => !f.startsWith('.'));
      for (const cmd of commands) {
        expect(cmd.endsWith('.md')).toBe(true);
      }

      // Agents should be .md files
      const agents = readdirSync(agentsDir).filter(f => !f.startsWith('.'));
      for (const agent of agents) {
        expect(agent.endsWith('.md')).toBe(true);
      }

      // Skills should have SKILL.md
      expect(existsSync(join(skillsDir, 'SKILL.md'))).toBe(true);
    });
  });
});
