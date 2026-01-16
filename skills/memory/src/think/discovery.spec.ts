/**
 * Tests for Think Discovery Module
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
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
      expect(agents[0].name).toBe('test-agent');
      expect(agents[0].source).toBe('local');
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
      expect(agents[0].name).toBe('deep-agent');
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

      expect(agents[0].description).toBe('My helpful description');
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
      expect(styles[0].name).toBe('formal');
      expect(styles[0].source).toBe('local');
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
});
