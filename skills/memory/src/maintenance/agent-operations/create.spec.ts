/**
 * Tests for create.ts - Agent creation operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAgent } from './create.js';
import type { CreateAgentRequest } from './types.js';
import { Scope } from '../../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('createAgent', () => {
  let tempDir: string;
  let projectRoot: string;
  let globalRoot: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-create-test-'));
    projectRoot = path.join(tempDir, 'project');
    globalRoot = path.join(tempDir, 'global', '.claude', 'memory');

    fs.mkdirSync(projectRoot, { recursive: true });
    fs.mkdirSync(globalRoot, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validation', () => {
    it('creates agent with valid alphanumeric name', async () => {
      const request: CreateAgentRequest = {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await createAgent(request);

      expect(result.status).toBe('success');
      expect(result.agent.name).toBe('typescript-expert');
      expect(result.agent.scope).toBe(Scope.AgentProject);
      expect(result.dryRun).toBe(false);
    });

    it('accepts hyphens in agent name', async () => {
      const request: CreateAgentRequest = {
        name: 'rust-memory-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await createAgent(request);

      expect(result.status).toBe('success');
      expect(result.agent.name).toBe('rust-memory-expert');
    });

    it('rejects agent name with special characters', async () => {
      const invalidNames = ['invalid@name', 'bad!agent', 'no spaces', 'under_score'];

      for (const name of invalidNames) {
        const request: CreateAgentRequest = {
          name,
          scope: Scope.AgentProject,
          projectRoot,
          globalRoot,
        };

        await expect(createAgent(request)).rejects.toThrow();
      }
    });

    it('rejects reserved agent names', async () => {
      const reservedNames = ['project', 'global', 'local', 'enterprise'];

      for (const name of reservedNames) {
        const request: CreateAgentRequest = {
          name,
          scope: Scope.AgentProject,
          projectRoot,
          globalRoot,
        };

        await expect(createAgent(request)).rejects.toThrow('reserved');
      }
    });

    it('rejects agent name exceeding 64 characters', async () => {
      const request: CreateAgentRequest = {
        name: 'a'.repeat(65),
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(createAgent(request)).rejects.toThrow('too long');
    });

    it('accepts agent name at 64 character limit', async () => {
      const request: CreateAgentRequest = {
        name: 'a'.repeat(64),
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await createAgent(request);

      expect(result.status).toBe('success');
    });

    it('rejects empty agent name', async () => {
      const request: CreateAgentRequest = {
        name: '',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(createAgent(request)).rejects.toThrow('Invalid agent name');
    });

    it('sanitises agent name to lowercase', async () => {
      const request: CreateAgentRequest = {
        name: 'TypeScript-Expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await createAgent(request);

      expect(result.agent.name).toBe('typescript-expert');
    });

    it('trims whitespace from agent name', async () => {
      const request: CreateAgentRequest = {
        name: '  python-expert  ',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await createAgent(request);

      expect(result.agent.name).toBe('python-expert');
    });
  });

  describe('directory structure', () => {
    it('creates agent directory in project scope', async () => {
      const request: CreateAgentRequest = {
        name: 'rust-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const result = await createAgent(request);

      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'rust-expert');
      expect(fs.existsSync(agentPath)).toBe(true);
      expect(result.agent.path).toBe(agentPath);
    });

    it('creates agent directory in global scope', async () => {
      const request: CreateAgentRequest = {
        name: 'python-expert',
        scope: Scope.AgentGlobal,
        projectRoot,
        globalRoot,
      };

      const result = await createAgent(request);

      const agentPath = path.join(globalRoot, 'agents', 'python-expert');
      expect(fs.existsSync(agentPath)).toBe(true);
      expect(result.agent.path).toBe(agentPath);
    });

    it('creates permanent subdirectory', async () => {
      const request: CreateAgentRequest = {
        name: 'go-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await createAgent(request);

      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'go-expert');
      expect(fs.existsSync(path.join(agentPath, 'permanent'))).toBe(true);
    });

    it('creates temporary subdirectory', async () => {
      const request: CreateAgentRequest = {
        name: 'java-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await createAgent(request);

      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'java-expert');
      expect(fs.existsSync(path.join(agentPath, 'temporary'))).toBe(true);
    });

    it('initialises index.json with correct structure', async () => {
      const request: CreateAgentRequest = {
        name: 'kotlin-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await createAgent(request);

      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'kotlin-expert');
      const indexPath = path.join(agentPath, 'index.json');

      expect(fs.existsSync(indexPath)).toBe(true);

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(index).toHaveProperty('version');
      expect(index.version).toBe('1.0.0');
      expect(index).toHaveProperty('lastUpdated');
      expect(index).toHaveProperty('memories');
      expect(index.memories).toEqual([]);
    });

    it('initialises graph.json with empty graph', async () => {
      const request: CreateAgentRequest = {
        name: 'ruby-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await createAgent(request);

      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'ruby-expert');
      const graphPath = path.join(agentPath, 'graph.json');

      expect(fs.existsSync(graphPath)).toBe(true);

      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(graph.nodes).toEqual([]);
      expect(graph.edges).toEqual([]);
    });

    it('uses valid ISO timestamp in index.json', async () => {
      const request: CreateAgentRequest = {
        name: 'swift-expert',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await createAgent(request);

      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'swift-expert');
      const indexPath = path.join(agentPath, 'index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

      // Verify timestamp is valid ISO format
      expect(() => new Date(index.lastUpdated)).not.toThrow();
      expect(new Date(index.lastUpdated).toISOString()).toBe(index.lastUpdated);
    });
  });

  describe('error handling', () => {
    it('throws error when agent already exists', async () => {
      const request: CreateAgentRequest = {
        name: 'existing-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      // Create agent first time
      await createAgent(request);

      // Attempt to create again
      await expect(createAgent(request)).rejects.toThrow('Agent already exists');
    });

    it('detects existing directory even without index.json', async () => {
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'partial-agent');
      fs.mkdirSync(agentPath, { recursive: true });

      const request: CreateAgentRequest = {
        name: 'partial-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(createAgent(request)).rejects.toThrow('Agent already exists');
    });

    it('provides clear error message for invalid characters', async () => {
      const request: CreateAgentRequest = {
        name: 'invalid@name',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(createAgent(request)).rejects.toThrow(/alphanumeric|hyphen/i);
    });

    it('provides clear error message for reserved names', async () => {
      const request: CreateAgentRequest = {
        name: 'project',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await expect(createAgent(request)).rejects.toThrow(/reserved/i);
    });
  });

  describe('dry-run mode', () => {
    it('previews creation without creating directories', async () => {
      const request: CreateAgentRequest = {
        name: 'preview-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await createAgent(request);

      expect(result.status).toBe('success');
      expect(result.dryRun).toBe(true);
      expect(result.agent.name).toBe('preview-agent');
      expect(result.agent.scope).toBe(Scope.AgentProject);

      // Verify nothing was created
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preview-agent');
      expect(fs.existsSync(agentPath)).toBe(false);
    });

    it('validates agent name even in dry-run', async () => {
      const request: CreateAgentRequest = {
        name: 'invalid@name',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      await expect(createAgent(request)).rejects.toThrow();
    });

    it('detects existing agent in dry-run mode', async () => {
      // Create agent normally
      await createAgent({
        name: 'existing-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      });

      // Try dry-run with same name
      const request: CreateAgentRequest = {
        name: 'existing-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      await expect(createAgent(request)).rejects.toThrow('Agent already exists');
    });

    it('returns expected path in dry-run mode', async () => {
      const request: CreateAgentRequest = {
        name: 'preview-path',
        scope: Scope.AgentGlobal,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await createAgent(request);

      const expectedPath = path.join(globalRoot, 'agents', 'preview-path');
      expect(result.agent.path).toBe(expectedPath);
    });
  });

  describe('scope handling', () => {
    it('creates agent in project agents directory', async () => {
      const request: CreateAgentRequest = {
        name: 'project-scoped',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      await createAgent(request);

      const projectAgentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'project-scoped');
      expect(fs.existsSync(projectAgentPath)).toBe(true);

      // Verify not in global
      const globalAgentPath = path.join(globalRoot, 'agents', 'project-scoped');
      expect(fs.existsSync(globalAgentPath)).toBe(false);
    });

    it('creates agent in global agents directory', async () => {
      const request: CreateAgentRequest = {
        name: 'global-scoped',
        scope: Scope.AgentGlobal,
        projectRoot,
        globalRoot,
      };

      await createAgent(request);

      const globalAgentPath = path.join(globalRoot, 'agents', 'global-scoped');
      expect(fs.existsSync(globalAgentPath)).toBe(true);

      // Verify not in project
      const projectAgentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'global-scoped');
      expect(fs.existsSync(projectAgentPath)).toBe(false);
    });

    it('allows same agent name in different scopes', async () => {
      const projectRequest: CreateAgentRequest = {
        name: 'shared-name',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
      };

      const globalRequest: CreateAgentRequest = {
        name: 'shared-name',
        scope: Scope.AgentGlobal,
        projectRoot,
        globalRoot,
      };

      await createAgent(projectRequest);
      await createAgent(globalRequest);

      // Both should exist
      expect(fs.existsSync(path.join(projectRoot, '.claude', 'memory', 'agents', 'shared-name'))).toBe(true);
      expect(fs.existsSync(path.join(globalRoot, 'agents', 'shared-name'))).toBe(true);
    });
  });
});
