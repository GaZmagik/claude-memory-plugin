/**
 * Tests for delete.ts - Agent deletion operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteAgent } from './delete.js';
import type { DeleteAgentRequest } from './types.js';
import { Scope } from '../../types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('deleteAgent', () => {
  let tempDir: string;
  let projectRoot: string;
  let globalRoot: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-delete-test-'));
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

  describe('basic deletion', () => {
    it('deletes agent with no memories using --force flag', async () => {
      // Create empty agent
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'empty-agent');
      fs.mkdirSync(agentPath, { recursive: true });
      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [],
        })
      );

      const request: DeleteAgentRequest = {
        name: 'empty-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      const result = await deleteAgent(request);

      expect(result.status).toBe('success');
      expect(result.agent).toBe('empty-agent');
      expect(result.memoriesDeleted).toBe(0);
      expect(result.deleted).toEqual([]);
      expect(fs.existsSync(agentPath)).toBe(false);
    });

    it('deletes agent with memories using --force flag', async () => {
      // Create agent with memories
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'populated-agent');
      const permanentPath = path.join(agentPath, 'permanent');
      fs.mkdirSync(permanentPath, { recursive: true });

      // Create memory files
      fs.writeFileSync(
        path.join(permanentPath, 'learning-one.md'),
        `---
type: learning
title: Learning One
created: 2026-01-01T00:00:00.000Z
updated: 2026-01-01T00:00:00.000Z
tags: []
scope: agent-project
agent: populated-agent
---
Content one`
      );

      fs.writeFileSync(
        path.join(permanentPath, 'decision-two.md'),
        `---
type: decision
title: Decision Two
created: 2026-01-02T00:00:00.000Z
updated: 2026-01-02T00:00:00.000Z
tags: []
scope: agent-project
agent: populated-agent
---
Content two`
      );

      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            {
              id: 'learning-one',
              type: 'learning',
              title: 'Learning One',
              relativePath: 'permanent/learning-one.md',
            },
            {
              id: 'decision-two',
              type: 'decision',
              title: 'Decision Two',
              relativePath: 'permanent/decision-two.md',
            },
          ],
        })
      );

      fs.writeFileSync(
        path.join(agentPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: DeleteAgentRequest = {
        name: 'populated-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      const result = await deleteAgent(request);

      expect(result.status).toBe('success');
      expect(result.memoriesDeleted).toBe(2);
      expect(result.deleted).toContain('learning-one');
      expect(result.deleted).toContain('decision-two');
      expect(fs.existsSync(agentPath)).toBe(false);
    });

    it('deletes graph.json along with agent', async () => {
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'graph-agent');
      fs.mkdirSync(agentPath, { recursive: true });

      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );
      fs.writeFileSync(
        path.join(agentPath, 'graph.json'),
        JSON.stringify({ nodes: [], edges: [] })
      );

      const request: DeleteAgentRequest = {
        name: 'graph-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      await deleteAgent(request);

      expect(fs.existsSync(agentPath)).toBe(false);
    });
  });

  describe('confirmation flow', () => {
    it('requires confirmation when --force not provided', async () => {
      // Create agent
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'confirm-agent');
      fs.mkdirSync(agentPath, { recursive: true });
      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [],
        })
      );

      const request: DeleteAgentRequest = {
        name: 'confirm-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: false,
        confirmationCallback: async () => false, // User declines
      };

      const result = await deleteAgent(request);

      expect(result.status).toBe('cancelled');
      expect(fs.existsSync(agentPath)).toBe(true); // Still exists
    });

    it('proceeds when user confirms interactively', async () => {
      // Create agent
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'confirm-delete');
      fs.mkdirSync(agentPath, { recursive: true });
      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [],
        })
      );

      const request: DeleteAgentRequest = {
        name: 'confirm-delete',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: false,
        confirmationCallback: async () => true, // User confirms
      };

      const result = await deleteAgent(request);

      expect(result.status).toBe('success');
      expect(fs.existsSync(agentPath)).toBe(false); // Deleted
    });

    it('passes agent name and memory count to confirmation callback', async () => {
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'callback-test');
      const permanentPath = path.join(agentPath, 'permanent');
      fs.mkdirSync(permanentPath, { recursive: true });

      fs.writeFileSync(
        path.join(permanentPath, 'test.md'),
        `---
type: learning
---
Content`
      );

      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{ id: 'test', relativePath: 'permanent/test.md' }],
        })
      );

      let capturedName: string | undefined;
      let capturedCount: number | undefined;

      const request: DeleteAgentRequest = {
        name: 'callback-test',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: false,
        confirmationCallback: async (name: string, count: number) => {
          capturedName = name;
          capturedCount = count;
          return true;
        },
      };

      await deleteAgent(request);

      expect(capturedName).toBe('callback-test');
      expect(capturedCount).toBe(1);
    });
  });

  describe('error handling', () => {
    it('throws error when agent not found', async () => {
      const request: DeleteAgentRequest = {
        name: 'nonexistent-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      await expect(deleteAgent(request)).rejects.toThrow('Agent not found');
    });

    it('handles missing index.json gracefully', async () => {
      // Create agent directory without index
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'broken-agent');
      fs.mkdirSync(agentPath, { recursive: true });

      const request: DeleteAgentRequest = {
        name: 'broken-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      // Should handle missing index by assuming 0 memories
      const result = await deleteAgent(request);
      expect(result.status).toBe('success');
      expect(result.memoriesDeleted).toBe(0);
      expect(fs.existsSync(agentPath)).toBe(false);
    });

    it('handles corrupted index.json gracefully', async () => {
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'corrupt-agent');
      fs.mkdirSync(agentPath, { recursive: true });
      fs.writeFileSync(path.join(agentPath, 'index.json'), '{invalid json}');

      const request: DeleteAgentRequest = {
        name: 'corrupt-agent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      // Should still delete the directory
      const result = await deleteAgent(request);
      expect(result.status).toBe('success');
      expect(fs.existsSync(agentPath)).toBe(false);
    });

    it('provides clear error for agent not found', async () => {
      const request: DeleteAgentRequest = {
        name: 'missing',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      await expect(deleteAgent(request)).rejects.toThrow(/not found/i);
    });
  });

  describe('dry-run mode', () => {
    it('previews deletion without deleting files', async () => {
      // Create agent
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'preview-delete');
      fs.mkdirSync(agentPath, { recursive: true });
      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [
            { id: 'test-memory', type: 'learning', relativePath: 'permanent/test.md' },
          ],
        })
      );

      const request: DeleteAgentRequest = {
        name: 'preview-delete',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await deleteAgent(request);

      expect(result.status).toBe('success');
      expect(result.dryRun).toBe(true);
      expect(result.memoriesDeleted).toBe(1);
      expect(fs.existsSync(agentPath)).toBe(true); // Still exists
    });

    it('skips confirmation in dry-run mode', async () => {
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'dry-confirm');
      fs.mkdirSync(agentPath, { recursive: true });
      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: DeleteAgentRequest = {
        name: 'dry-confirm',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: false, // No --force
        dryRun: true,
        confirmationCallback: async () => {
          throw new Error('Should not call confirmation in dry-run');
        },
      };

      // Should not throw - confirmation bypassed
      const result = await deleteAgent(request);
      expect(result.status).toBe('success');
      expect(result.dryRun).toBe(true);
    });

    it('validates agent exists even in dry-run', async () => {
      const request: DeleteAgentRequest = {
        name: 'nonexistent',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      await expect(deleteAgent(request)).rejects.toThrow('Agent not found');
    });

    it('returns empty deleted list in dry-run', async () => {
      const agentPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'dry-list');
      fs.mkdirSync(agentPath, { recursive: true });
      fs.writeFileSync(
        path.join(agentPath, 'index.json'),
        JSON.stringify({
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          memories: [{ id: 'test', relativePath: 'permanent/test.md' }],
        })
      );

      const request: DeleteAgentRequest = {
        name: 'dry-list',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        dryRun: true,
      };

      const result = await deleteAgent(request);

      expect(result.deleted).toEqual([]);
      expect(result.memoriesDeleted).toBe(1);
    });
  });

  describe('scope handling', () => {
    it('deletes agent from project scope', async () => {
      const projectPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'project-delete');
      fs.mkdirSync(projectPath, { recursive: true });
      fs.writeFileSync(
        path.join(projectPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: DeleteAgentRequest = {
        name: 'project-delete',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      };

      await deleteAgent(request);

      expect(fs.existsSync(projectPath)).toBe(false);
    });

    it('deletes agent from global scope', async () => {
      const globalPath = path.join(globalRoot, 'agents', 'global-delete');
      fs.mkdirSync(globalPath, { recursive: true });
      fs.writeFileSync(
        path.join(globalPath, 'index.json'),
        JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] })
      );

      const request: DeleteAgentRequest = {
        name: 'global-delete',
        scope: Scope.AgentGlobal,
        projectRoot,
        globalRoot,
        force: true,
      };

      await deleteAgent(request);

      expect(fs.existsSync(globalPath)).toBe(false);
    });

    it('operates on correct scope when same agent name exists in both', async () => {
      // Create agents in both scopes
      const projectPath = path.join(projectRoot, '.claude', 'memory', 'agents', 'shared-name');
      const globalPath = path.join(globalRoot, 'agents', 'shared-name');

      fs.mkdirSync(projectPath, { recursive: true });
      fs.mkdirSync(globalPath, { recursive: true });

      fs.writeFileSync(path.join(projectPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));
      fs.writeFileSync(path.join(globalPath, 'index.json'), JSON.stringify({ version: '1.0', lastUpdated: new Date().toISOString(), memories: [] }));

      // Delete only project version
      await deleteAgent({
        name: 'shared-name',
        scope: Scope.AgentProject,
        projectRoot,
        globalRoot,
        force: true,
      });

      // Verify only project deleted
      expect(fs.existsSync(projectPath)).toBe(false);
      expect(fs.existsSync(globalPath)).toBe(true);
    });
  });
});
