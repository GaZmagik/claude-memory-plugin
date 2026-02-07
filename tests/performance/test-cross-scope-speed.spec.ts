/**
 * Performance Tests for Cross-Scope Graph Operations (Phase G - T138)
 *
 * Verifies that graph operations spanning project and agent scopes
 * each complete within 500ms, including loading graphs from
 * multiple scopes and verifying isolation.
 *
 * Uses real filesystem temp directories (not mocks) to avoid
 * the saveGraph corruption gotcha.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { linkMemories } from '../../skills/memory/src/graph/link.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';
import { getAgentDirectoryPath } from '../../skills/memory/src/scope/get-agent-directory-path.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/** Helper: resolve the agent directory path for a given agent in a test dir */
function agentBasePath(testDir: string, agentName: string): string {
  return getAgentDirectoryPath({
    scope: Scope.AgentProject,
    agentName,
    projectRoot: testDir,
  });
}

describe('Cross-scope graph performance (<500ms per operation)', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-cross-scope-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(path.join(testDir, '.git'));
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Multi-scope graph loading', () => {
    it('should load project and agent graphs in <500ms', async () => {
      // Seed project-scope memories
      await writeMemory({
        id: 'decision-proj-graph',
        type: MemoryType.Decision,
        title: 'Project Decision',
        content: 'Project-scoped for graph loading test.',
        tags: ['performance'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      // Seed agent-scope memories
      await writeMemory({
        id: 'learning-agent-graph',
        type: MemoryType.Learning,
        title: 'Agent Learning',
        content: 'Agent-scoped for graph loading test.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'graph-agent',
        projectRoot: testDir,
      });

      const agentPath = agentBasePath(testDir, 'graph-agent');

      const start = performance.now();

      // Load both graphs
      const projectGraph = await loadGraph(memoryDir);
      const agentGraph = await loadGraph(agentPath);

      const duration = performance.now() - start;

      expect(projectGraph.nodes).toBeDefined();
      expect(agentGraph.nodes).toBeDefined();
      expect(duration).toBeLessThan(500);
    });

    it('should load graphs from three agents in <500ms', async () => {
      // Create three agents with memories
      for (const agent of ['alpha', 'beta', 'gamma']) {
        await writeMemory({
          id: `learning-${agent}-perf`,
          type: MemoryType.Learning,
          title: `${agent} Learning`,
          content: `Memory for agent ${agent}.`,
          tags: ['performance'],
          scope: Scope.AgentProject,
          agent,
          projectRoot: testDir,
        });
      }

      const start = performance.now();

      // Load all three agent graphs
      const graphs = await Promise.all(
        ['alpha', 'beta', 'gamma'].map(agent =>
          loadGraph(agentBasePath(testDir, agent))
        )
      );

      const duration = performance.now() - start;

      expect(graphs).toHaveLength(3);
      graphs.forEach(g => expect(g.nodes).toBeDefined());
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Cross-scope link + isolation verification', () => {
    it('should link within agent and verify project isolation in <500ms', async () => {
      // Seed both scopes
      await writeMemory({
        id: 'decision-cross-src',
        type: MemoryType.Decision,
        title: 'Cross Source',
        content: 'Source for cross-scope test.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'cross-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-cross-tgt',
        type: MemoryType.Learning,
        title: 'Cross Target',
        content: 'Target for cross-scope test.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'cross-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'decision-proj-bystander',
        type: MemoryType.Decision,
        title: 'Project Bystander',
        content: 'Should not be affected.',
        tags: ['performance'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      const agentPath = agentBasePath(testDir, 'cross-agent');

      const start = performance.now();

      // Link within agent scope
      const linkResult = await linkMemories({
        source: 'decision-cross-src',
        target: 'learning-cross-tgt',
        relation: 'led-to',
        basePath: agentPath,
      });
      expect(linkResult.status).toBe('success');

      // Verify isolation: project graph has no agent edges
      const projectGraph = await loadGraph(memoryDir);
      const leakedEdge = projectGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-cross-src' && e.target === 'learning-cross-tgt'
      );
      expect(leakedEdge).toBeUndefined();

      // Verify agent graph has the edge
      const agentGraph = await loadGraph(agentPath);
      const agentEdge = agentGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-cross-src' && e.target === 'learning-cross-tgt'
      );
      expect(agentEdge).toBeDefined();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Multi-agent link independence', () => {
    it('should link in two agents and verify independence in <500ms', async () => {
      // Seed two agents
      for (const agent of ['agent-x', 'agent-y']) {
        await writeMemory({
          id: `decision-${agent}-src`,
          type: MemoryType.Decision,
          title: `${agent} Source`,
          content: `Source for ${agent}.`,
          tags: ['performance'],
          scope: Scope.AgentProject,
          agent,
          projectRoot: testDir,
        });

        await writeMemory({
          id: `learning-${agent}-tgt`,
          type: MemoryType.Learning,
          title: `${agent} Target`,
          content: `Target for ${agent}.`,
          tags: ['performance'],
          scope: Scope.AgentProject,
          agent,
          projectRoot: testDir,
        });
      }

      const start = performance.now();

      // Link in both agents
      const xPath = agentBasePath(testDir, 'agent-x');
      const yPath = agentBasePath(testDir, 'agent-y');

      await linkMemories({
        source: 'decision-agent-x-src',
        target: 'learning-agent-x-tgt',
        relation: 'caused',
        basePath: xPath,
      });

      await linkMemories({
        source: 'decision-agent-y-src',
        target: 'learning-agent-y-tgt',
        relation: 'informed-by',
        basePath: yPath,
      });

      // Verify independence
      const xGraph = await loadGraph(xPath);
      const yGraph = await loadGraph(yPath);

      // X should not have Y's edge
      const xLeaked = xGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-agent-y-src'
      );
      expect(xLeaked).toBeUndefined();

      // Y should not have X's edge
      const yLeaked = yGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-agent-x-src'
      );
      expect(yLeaked).toBeUndefined();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });
});
