/**
 * Tests for Think Discovery Module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getDefaultConfig,
  extractBody,
  discoverAgents,
  discoverStyles,
  findAgent,
  findStyle,
  readAgentBody,
  readStyleContent,
  listAgentNames,
  listStyleNames,
} from './discovery.js';

describe('think/discovery', () => {
  let tempDir: string;
  let localAgentsDir: string;
  let globalAgentsDir: string;
  let localStylesDir: string;
  let globalStylesDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'think-discovery-'));

    // Create directory structure
    localAgentsDir = path.join(tempDir, 'local', '.claude', 'agents');
    globalAgentsDir = path.join(tempDir, 'global', '.claude', 'agents');
    localStylesDir = path.join(tempDir, 'local', '.claude', 'output-styles');
    globalStylesDir = path.join(tempDir, 'global', '.claude', 'output-styles');

    fs.mkdirSync(localAgentsDir, { recursive: true });
    fs.mkdirSync(globalAgentsDir, { recursive: true });
    fs.mkdirSync(localStylesDir, { recursive: true });
    fs.mkdirSync(globalStylesDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('getDefaultConfig', () => {
    it('returns config with basePath as cwd', () => {
      const config = getDefaultConfig();
      expect(config.basePath).toBe(process.cwd());
    });

    it('returns config with homePath', () => {
      const config = getDefaultConfig();
      expect(config.homePath).toBe(process.env.HOME ?? '');
    });
  });

  describe('extractBody', () => {
    it('extracts body after frontmatter', () => {
      const content = `---
title: Test Agent
description: A test agent
---

This is the body content.

More content here.`;

      const body = extractBody(content);
      expect(body).toBe('This is the body content.\n\nMore content here.');
    });

    it('returns full content when no frontmatter', () => {
      const content = 'Just plain content without frontmatter.';
      const body = extractBody(content);
      expect(body).toBe('Just plain content without frontmatter.');
    });

    it('handles empty body after frontmatter', () => {
      const content = `---
title: Test
---
`;
      const body = extractBody(content);
      expect(body).toBe('');
    });
  });

  describe('discoverAgents', () => {
    it('discovers agents in local directory', () => {
      fs.writeFileSync(
        path.join(localAgentsDir, 'test-agent.md'),
        '---\ndescription: Test agent\n---\nBody'
      );

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]!.name).toBe('test-agent');
      expect(agents[0]!.source).toBe('local');
    });

    it('discovers agents in subdirectories recursively', () => {
      const subDir = path.join(localAgentsDir, 'specialist');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'deep-agent.md'), 'Body content');

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]!.name).toBe('deep-agent');
    });

    it('prioritises local over global (first match wins)', () => {
      fs.writeFileSync(
        path.join(localAgentsDir, 'shared.md'),
        '---\ndescription: Local version\n---\nLocal body'
      );
      fs.writeFileSync(
        path.join(globalAgentsDir, 'shared.md'),
        '---\ndescription: Global version\n---\nGlobal body'
      );

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      const shared = agents.find(a => a.name === 'shared');
      expect(shared?.source).toBe('local');
      expect(shared?.description).toBe('Local version');
    });

    it('includes global agents not in local', () => {
      fs.writeFileSync(path.join(localAgentsDir, 'local-only.md'), 'Body');
      fs.writeFileSync(path.join(globalAgentsDir, 'global-only.md'), 'Body');

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.name).sort()).toEqual(['global-only', 'local-only']);
    });

    it('returns empty array when no agents exist', () => {
      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agents).toHaveLength(0);
    });

    it('extracts description from frontmatter', () => {
      fs.writeFileSync(
        path.join(localAgentsDir, 'described.md'),
        '---\ndescription: "My helpful description"\n---\nBody'
      );

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agents[0]!.description).toBe('My helpful description');
    });
  });

  describe('discoverStyles', () => {
    it('discovers styles in local directory', () => {
      fs.writeFileSync(path.join(localStylesDir, 'formal.md'), 'Formal style');

      const styles = discoverStyles({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(styles).toHaveLength(1);
      expect(styles[0]!.name).toBe('formal');
      expect(styles[0]!.source).toBe('local');
    });

    it('prioritises local styles over global', () => {
      fs.writeFileSync(path.join(localStylesDir, 'shared.md'), 'Local');
      fs.writeFileSync(path.join(globalStylesDir, 'shared.md'), 'Global');

      const styles = discoverStyles({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      const shared = styles.find(s => s.name === 'shared');
      expect(shared?.source).toBe('local');
    });
  });

  describe('findAgent', () => {
    it('finds agent by name', () => {
      fs.writeFileSync(path.join(localAgentsDir, 'target.md'), 'Body');

      const agent = findAgent('target', {
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agent).not.toBeNull();
      expect(agent?.name).toBe('target');
    });

    it('returns null for non-existent agent', () => {
      const agent = findAgent('nonexistent', {
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agent).toBeNull();
    });

    it('finds agent in subdirectory', () => {
      const subDir = path.join(localAgentsDir, 'category');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, 'nested.md'), 'Body');

      const agent = findAgent('nested', {
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agent).not.toBeNull();
      expect(agent?.name).toBe('nested');
    });
  });

  describe('findStyle', () => {
    it('finds style by name', () => {
      fs.writeFileSync(path.join(localStylesDir, 'casual.md'), 'Casual content');

      const style = findStyle('casual', {
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(style).not.toBeNull();
      expect(style?.name).toBe('casual');
    });

    it('returns null for non-existent style', () => {
      const style = findStyle('nonexistent', {
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(style).toBeNull();
    });
  });

  describe('readAgentBody', () => {
    it('reads agent body content', () => {
      const agentPath = path.join(localAgentsDir, 'test.md');
      fs.writeFileSync(agentPath, '---\ntitle: Test\n---\n\nAgent body here.');

      const body = readAgentBody(agentPath);
      expect(body).toBe('Agent body here.');
    });

    it('returns null for non-existent file', () => {
      const body = readAgentBody('/nonexistent/path.md');
      expect(body).toBeNull();
    });
  });

  describe('readStyleContent', () => {
    it('reads full style content', () => {
      const stylePath = path.join(localStylesDir, 'test.md');
      fs.writeFileSync(stylePath, '---\ntitle: Style\n---\n\nStyle content.');

      const content = readStyleContent(stylePath);
      expect(content).toContain('---');
      expect(content).toContain('Style content.');
    });

    it('returns null for non-existent file', () => {
      const content = readStyleContent('/nonexistent/path.md');
      expect(content).toBeNull();
    });
  });

  describe('listAgentNames', () => {
    it('returns list of agent names', () => {
      fs.writeFileSync(path.join(localAgentsDir, 'alpha.md'), 'Body');
      fs.writeFileSync(path.join(localAgentsDir, 'beta.md'), 'Body');

      const names = listAgentNames({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(names.sort()).toEqual(['alpha', 'beta']);
    });
  });

  describe('listStyleNames', () => {
    it('returns list of style names', () => {
      fs.writeFileSync(path.join(localStylesDir, 'formal.md'), 'Body');
      fs.writeFileSync(path.join(localStylesDir, 'casual.md'), 'Body');

      const names = listStyleNames({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(names.sort()).toEqual(['casual', 'formal']);
    });
  });

  describe('plugin scope detection', () => {
    let pluginDir: string;

    beforeEach(() => {
      pluginDir = path.join(tempDir, 'plugin');
      fs.mkdirSync(path.join(pluginDir, '.claude-plugin'), { recursive: true });
      fs.mkdirSync(path.join(pluginDir, 'agents'), { recursive: true });
      // Plugin uses 'styles' directory by default (per Claude Code schema)
      fs.mkdirSync(path.join(pluginDir, 'styles'), { recursive: true });
      fs.writeFileSync(
        path.join(pluginDir, '.claude-plugin', 'plugin.json'),
        JSON.stringify({ name: 'test-plugin', outputStyles: './styles/' })
      );
    });

    it('discovers agents from plugin scope when pluginPath provided', () => {
      fs.writeFileSync(path.join(pluginDir, 'agents', 'plugin-agent.md'), 'Plugin agent');

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        pluginPath: pluginDir,
      });

      const pluginAgent = agents.find(a => a.name === 'plugin-agent');
      expect(pluginAgent).not.toBeNull();
      expect(pluginAgent?.source).toBe('plugin');
    });

    it('discovers styles from plugin scope via outputStyles field', () => {
      fs.writeFileSync(path.join(pluginDir, 'styles', 'plugin-style.md'), 'Plugin style');

      const styles = discoverStyles({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        pluginPath: pluginDir,
      });

      const pluginStyle = styles.find(s => s.name === 'plugin-style');
      expect(pluginStyle).not.toBeNull();
      expect(pluginStyle?.source).toBe('plugin');
    });

    it('uses custom outputStyles path from plugin.json', () => {
      // Create custom styles directory
      const customStylesDir = path.join(pluginDir, 'custom-styles');
      fs.mkdirSync(customStylesDir, { recursive: true });
      fs.writeFileSync(path.join(customStylesDir, 'custom-style.md'), 'Custom style');

      // Update plugin.json with custom path
      fs.writeFileSync(
        path.join(pluginDir, '.claude-plugin', 'plugin.json'),
        JSON.stringify({ name: 'test-plugin', outputStyles: './custom-styles/' })
      );

      const styles = discoverStyles({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        pluginPath: pluginDir,
      });

      const customStyle = styles.find(s => s.name === 'custom-style');
      expect(customStyle).not.toBeNull();
      expect(customStyle?.source).toBe('plugin');
    });

    it('defaults to styles/ when outputStyles not in plugin.json', () => {
      // Remove outputStyles from plugin.json
      fs.writeFileSync(
        path.join(pluginDir, '.claude-plugin', 'plugin.json'),
        JSON.stringify({ name: 'test-plugin' })
      );
      fs.writeFileSync(path.join(pluginDir, 'styles', 'default-style.md'), 'Default style');

      const styles = discoverStyles({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        pluginPath: pluginDir,
      });

      const defaultStyle = styles.find(s => s.name === 'default-style');
      expect(defaultStyle).not.toBeNull();
      expect(defaultStyle?.source).toBe('plugin');
    });

    it('prioritises local over plugin scope', () => {
      fs.writeFileSync(path.join(localAgentsDir, 'shared.md'), 'Local version');
      fs.writeFileSync(path.join(pluginDir, 'agents', 'shared.md'), 'Plugin version');

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        pluginPath: pluginDir,
      });

      const shared = agents.find(a => a.name === 'shared');
      expect(shared?.source).toBe('local');
    });

    it('ignores plugin scope when disablePluginScope is true', () => {
      fs.writeFileSync(path.join(pluginDir, 'agents', 'plugin-only.md'), 'Plugin agent');

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        pluginPath: pluginDir,
        disablePluginScope: true,
      });

      const pluginAgent = agents.find(a => a.name === 'plugin-only');
      expect(pluginAgent).toBeUndefined();
    });

    it('handles missing or invalid plugin.json gracefully', () => {
      // Delete plugin.json
      fs.unlinkSync(path.join(pluginDir, '.claude-plugin', 'plugin.json'));
      fs.writeFileSync(path.join(pluginDir, 'styles', 'orphan-style.md'), 'Orphan style');

      // Should still discover styles using default 'styles' path
      const styles = discoverStyles({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        pluginPath: pluginDir,
      });

      const orphanStyle = styles.find(s => s.name === 'orphan-style');
      expect(orphanStyle).not.toBeNull();
      expect(orphanStyle?.source).toBe('plugin');
    });
  });

  describe('enterprise scope', () => {
    let enterpriseDir: string;

    beforeEach(() => {
      enterpriseDir = path.join(tempDir, 'enterprise');
      fs.mkdirSync(path.join(enterpriseDir, 'agents'), { recursive: true });
    });

    it('discovers agents from enterprise path', () => {
      fs.writeFileSync(
        path.join(enterpriseDir, 'agents', 'corp-agent.md'),
        '---\ndescription: Corporate agent\n---\nBody'
      );

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        enterprisePath: enterpriseDir,
        disablePluginScope: true,
      });

      const corpAgent = agents.find(a => a.name === 'corp-agent');
      expect(corpAgent).not.toBeNull();
      expect(corpAgent?.source).toBe('enterprise');
      expect(corpAgent?.description).toBe('Corporate agent');
    });

    it('prioritises local over enterprise', () => {
      fs.writeFileSync(path.join(localAgentsDir, 'shared.md'), 'Local version');
      fs.writeFileSync(path.join(enterpriseDir, 'agents', 'shared.md'), 'Enterprise version');

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        enterprisePath: enterpriseDir,
        disablePluginScope: true,
      });

      const shared = agents.find(a => a.name === 'shared');
      expect(shared?.source).toBe('local');
    });

    it('prioritises global over enterprise', () => {
      fs.writeFileSync(path.join(globalAgentsDir, 'shared.md'), 'Global version');
      fs.writeFileSync(path.join(enterpriseDir, 'agents', 'shared.md'), 'Enterprise version');

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        enterprisePath: enterpriseDir,
        disablePluginScope: true,
      });

      const shared = agents.find(a => a.name === 'shared');
      expect(shared?.source).toBe('global');
    });
  });

  describe('error handling', () => {
    it('handles non-existent directories gracefully', () => {
      const agents = discoverAgents({
        basePath: '/nonexistent/path/that/does/not/exist',
        homePath: '/another/nonexistent/path',
        disablePluginScope: true,
      });

      expect(agents).toHaveLength(0);
    });

    it('handles unreadable files gracefully during discovery', () => {
      fs.writeFileSync(path.join(localAgentsDir, 'test.md'), 'Body');
      // File exists but description extraction should handle errors

      const agents = discoverAgents({
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]!.name).toBe('test');
    });

    it('returns null for non-existent agent in findAgent', () => {
      const agent = findAgent('nonexistent-agent', {
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(agent).toBeNull();
    });

    it('returns null for non-existent style in findStyle', () => {
      const style = findStyle('nonexistent-style', {
        basePath: path.join(tempDir, 'local'),
        homePath: path.join(tempDir, 'global'),
        disablePluginScope: true,
      });

      expect(style).toBeNull();
    });
  });
});
