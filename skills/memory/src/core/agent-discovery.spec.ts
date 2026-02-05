/**
 * T026: Unit tests for Agent Discovery
 *
 * Tests agent discovery, listing, and statistics functionality for Phase E.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { discoverAgents } from './agent-discovery.js';
import { Scope, MemoryType } from '../types/enums.js';
import type { AgentSummary } from '../types/api.js';
import type { MemoryIndex } from '../types/memory.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { memoryId } from '../test-utils/branded-helpers.js';

describe('Agent Discovery', () => {
  let projectRoot: string;
  let globalRoot: string;

  beforeEach(() => {
    // Create temporary directories for project and global scopes
    projectRoot = fs.mkdtempSync(path.join(tmpdir(), 'memory-project-'));
    globalRoot = fs.mkdtempSync(path.join(tmpdir(), 'memory-global-'));
  });

  afterEach(() => {
    // Clean up temporary directories
    fs.rmSync(projectRoot, { recursive: true, force: true });
    fs.rmSync(globalRoot, { recursive: true, force: true });
  });

  describe('discoverAgents', () => {
    it('should return empty array when no agents exist', async () => {
      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toEqual([]);
    });

    it('should discover project-scoped agents', async () => {
      // Create project agent directory
      const agentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'typescript-expert');
      fs.mkdirSync(agentDir, { recursive: true });

      // Create minimal index.json
      const index: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T12:00:00Z',
        memories: [
          {
            id: memoryId('test-memory'),
            type: MemoryType.Learning,
            title: 'Test Learning',
            tags: ['test'],
            created: '2026-02-04T12:00:00Z',
            updated: '2026-02-04T12:00:00Z',
            scope: Scope.AgentProject,
            relativePath: 'learning-test-memory.md',
          },
        ],
      };
      fs.writeFileSync(path.join(agentDir, 'index.json'), JSON.stringify(index, null, 2));

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        memoryCount: 1,
      });
    });

    it('should discover global-scoped agents', async () => {
      // Create global agent directory
      const agentDir = path.join(globalRoot, 'agents', 'rust-expert');
      fs.mkdirSync(agentDir, { recursive: true });

      // Create minimal index.json
      const index: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T13:00:00Z',
        memories: [
          {
            id: memoryId('rust-pattern'),
            type: MemoryType.Artifact,
            title: 'Rust Pattern',
            tags: ['rust'],
            created: '2026-02-04T13:00:00Z',
            updated: '2026-02-04T13:00:00Z',
            scope: Scope.AgentGlobal,
            relativePath: 'artifact-rust-pattern.md',
          },
        ],
      };
      fs.writeFileSync(path.join(agentDir, 'index.json'), JSON.stringify(index, null, 2));

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        name: 'rust-expert',
        scope: Scope.AgentGlobal,
        memoryCount: 1,
      });
    });

    it('should discover agents from both scopes', async () => {
      // Create project agent
      const projectAgentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'typescript-expert');
      fs.mkdirSync(projectAgentDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectAgentDir, 'index.json'),
        JSON.stringify({ version: '1.0.0', lastUpdated: '2026-02-04T12:00:00Z', memories: [] }, null, 2)
      );

      // Create global agent
      const globalAgentDir = path.join(globalRoot, 'agents', 'python-expert');
      fs.mkdirSync(globalAgentDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalAgentDir, 'index.json'),
        JSON.stringify({ version: '1.0.0', lastUpdated: '2026-02-04T12:00:00Z', memories: [] }, null, 2)
      );

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toHaveLength(2);
      expect(agents.map((a: AgentSummary) => a.name).sort()).toEqual(['python-expert', 'typescript-expert']);
    });

    it('should deduplicate agents with project taking precedence', async () => {
      // Create same agent name in both scopes
      const projectAgentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'typescript-expert');
      fs.mkdirSync(projectAgentDir, { recursive: true });
      const projectIndex: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T12:00:00Z',
        memories: [
          {
            id: memoryId('project-memory'),
            type: MemoryType.Decision,
            title: 'Project Decision',
            tags: ['project'],
            created: '2026-02-04T12:00:00Z',
            updated: '2026-02-04T12:00:00Z',
            scope: Scope.AgentProject,
            relativePath: 'decision-project-memory.md',
          },
        ],
      };
      fs.writeFileSync(path.join(projectAgentDir, 'index.json'), JSON.stringify(projectIndex, null, 2));

      const globalAgentDir = path.join(globalRoot, 'agents', 'typescript-expert');
      fs.mkdirSync(globalAgentDir, { recursive: true });
      const globalIndex: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T11:00:00Z',
        memories: [
          {
            id: memoryId('global-memory'),
            type: MemoryType.Learning,
            title: 'Global Learning',
            tags: ['global'],
            created: '2026-02-04T11:00:00Z',
            updated: '2026-02-04T11:00:00Z',
            scope: Scope.AgentGlobal,
            relativePath: 'learning-global-memory.md',
          },
        ],
      };
      fs.writeFileSync(path.join(globalAgentDir, 'index.json'), JSON.stringify(globalIndex, null, 2));

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      // Should only have one agent (project takes precedence)
      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        memoryCount: 1,
      });
    });

    it('should filter by project scope only', async () => {
      // Create agents in both scopes
      const projectAgentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'typescript-expert');
      fs.mkdirSync(projectAgentDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectAgentDir, 'index.json'),
        JSON.stringify({ version: '1.0.0', lastUpdated: '2026-02-04T12:00:00Z', memories: [] }, null, 2)
      );

      const globalAgentDir = path.join(globalRoot, 'agents', 'rust-expert');
      fs.mkdirSync(globalAgentDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalAgentDir, 'index.json'),
        JSON.stringify({ version: '1.0.0', lastUpdated: '2026-02-04T12:00:00Z', memories: [] }, null, 2)
      );

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
        scope: Scope.AgentProject,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]!.name).toBe('typescript-expert');
      expect(agents[0]!.scope).toBe(Scope.AgentProject);
    });

    it('should filter by global scope only', async () => {
      // Create agents in both scopes
      const projectAgentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'typescript-expert');
      fs.mkdirSync(projectAgentDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectAgentDir, 'index.json'),
        JSON.stringify({ version: '1.0.0', lastUpdated: '2026-02-04T12:00:00Z', memories: [] }, null, 2)
      );

      const globalAgentDir = path.join(globalRoot, 'agents', 'rust-expert');
      fs.mkdirSync(globalAgentDir, { recursive: true });
      fs.writeFileSync(
        path.join(globalAgentDir, 'index.json'),
        JSON.stringify({ version: '1.0.0', lastUpdated: '2026-02-04T12:00:00Z', memories: [] }, null, 2)
      );

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
        scope: Scope.AgentGlobal,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]!.name).toBe('rust-expert');
      expect(agents[0]!.scope).toBe(Scope.AgentGlobal);
    });

    it('should handle missing agent directories gracefully', async () => {
      // Don't create any agent directories
      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toEqual([]);
    });

    it('should ignore non-directory entries in agents folder', async () => {
      // Create agents directory with a file (not directory)
      const agentsDir = path.join(projectRoot, '.claude', 'memory', 'agents');
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.writeFileSync(path.join(agentsDir, 'not-a-directory.txt'), 'ignore me');

      // Create one valid agent
      const agentDir = path.join(agentsDir, 'valid-agent');
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'index.json'),
        JSON.stringify({ version: '1.0.0', lastUpdated: '2026-02-04T12:00:00Z', memories: [] }, null, 2)
      );

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]!.name).toBe('valid-agent');
    });
  });

  describe('getAgentSummary', () => {
    it('should extract basic agent summary from index.json', async () => {
      const agentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'test-agent');
      fs.mkdirSync(agentDir, { recursive: true });

      const index: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T15:00:00Z',
        memories: [
          {
            id: memoryId('memory-1'),
            type: MemoryType.Learning,
            title: 'Memory 1',
            tags: ['tag1'],
            created: '2026-02-04T12:00:00Z',
            updated: '2026-02-04T15:00:00Z',
            scope: Scope.AgentProject,
            relativePath: 'learning-memory-1.md',
          },
          {
            id: memoryId('memory-2'),
            type: MemoryType.Decision,
            title: 'Memory 2',
            tags: ['tag2'],
            created: '2026-02-04T13:00:00Z',
            updated: '2026-02-04T14:00:00Z',
            scope: Scope.AgentProject,
            relativePath: 'decision-memory-2.md',
          },
        ],
      };
      fs.writeFileSync(path.join(agentDir, 'index.json'), JSON.stringify(index, null, 2));

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        name: 'test-agent',
        scope: Scope.AgentProject,
        memoryCount: 2,
        lastUpdated: '2026-02-04T15:00:00.000Z', // Most recent update (ISO format with milliseconds)
      });
    });

    it('should include detailed stats when includeStats is true', async () => {
      const agentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'stats-agent');
      fs.mkdirSync(agentDir, { recursive: true });

      const index: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T15:00:00Z',
        memories: [
          {
            id: memoryId('learning-1'),
            type: MemoryType.Learning,
            title: 'Learning 1',
            tags: ['typescript', 'patterns'],
            created: '2026-02-04T12:00:00Z',
            updated: '2026-02-04T15:00:00Z',
            scope: Scope.AgentProject,
            relativePath: 'learning-learning-1.md',
          },
          {
            id: memoryId('learning-2'),
            type: MemoryType.Learning,
            title: 'Learning 2',
            tags: ['api', 'patterns'],
            created: '2026-02-04T13:00:00Z',
            updated: '2026-02-04T14:00:00Z',
            scope: Scope.AgentProject,
            relativePath: 'learning-learning-2.md',
          },
          {
            id: memoryId('decision-1'),
            type: MemoryType.Decision,
            title: 'Decision 1',
            tags: ['architecture'],
            created: '2026-02-04T11:00:00Z',
            updated: '2026-02-04T11:30:00Z',
            scope: Scope.AgentProject,
            relativePath: 'decision-decision-1.md',
          },
        ],
      };
      fs.writeFileSync(path.join(agentDir, 'index.json'), JSON.stringify(index, null, 2));

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
        includeStats: true,
      });

      expect(agents).toHaveLength(1);
      const agent = agents[0]!;

      expect(agent.memoryCount).toBe(3);
      expect(agent.memoryTypes).toEqual({
        [MemoryType.Learning]: 2,
        [MemoryType.Decision]: 1,
      });
      expect(agent.tags).toEqual(['api', 'architecture', 'patterns', 'typescript']);
    });

    it('should handle agent with no index.json', async () => {
      const agentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'empty-agent');
      fs.mkdirSync(agentDir, { recursive: true });
      // No index.json created

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        name: 'empty-agent',
        scope: Scope.AgentProject,
        memoryCount: 0,
      });
    });

    it('should handle empty memories array', async () => {
      const agentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'no-memories');
      fs.mkdirSync(agentDir, { recursive: true });

      const index: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T12:00:00Z',
        memories: [],
      };
      fs.writeFileSync(path.join(agentDir, 'index.json'), JSON.stringify(index, null, 2));

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        name: 'no-memories',
        scope: Scope.AgentProject,
        memoryCount: 0,
      });
      expect(agents[0]!.lastUpdated).toBeUndefined();
    });

    it('should calculate lastUpdated from most recent memory', async () => {
      const agentDir = path.join(projectRoot, '.claude', 'memory', 'agents', 'time-agent');
      fs.mkdirSync(agentDir, { recursive: true });

      const index: MemoryIndex = {
        version: '1.0.0',
        lastUpdated: '2026-02-04T10:00:00Z', // Index updated time (older)
        memories: [
          {
            id: memoryId('old-memory'),
            type: MemoryType.Learning,
            title: 'Old Memory',
            tags: [],
            created: '2026-02-04T08:00:00Z',
            updated: '2026-02-04T09:00:00Z',
            scope: Scope.AgentProject,
            relativePath: 'learning-old-memory.md',
          },
          {
            id: memoryId('new-memory'),
            type: MemoryType.Learning,
            title: 'New Memory',
            tags: [],
            created: '2026-02-04T11:00:00Z',
            updated: '2026-02-04T16:00:00Z', // Most recent
            scope: Scope.AgentProject,
            relativePath: 'learning-new-memory.md',
          },
        ],
      };
      fs.writeFileSync(path.join(agentDir, 'index.json'), JSON.stringify(index, null, 2));

      const agents = await discoverAgents({
        projectRoot,
        globalRoot,
      });

      expect(agents[0]!.lastUpdated).toBe('2026-02-04T16:00:00.000Z');
    });
  });
});
