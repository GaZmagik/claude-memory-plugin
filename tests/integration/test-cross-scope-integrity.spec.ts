/**
 * Integration Tests for Cross-Scope Link Bidirectional Integrity (Phase G - T136)
 *
 * Verifies that links between memories are isolated per scope,
 * graph.json files are independent, and link operations
 * within one scope do not affect another.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { linkMemories, unlinkMemories } from '../../skills/memory/src/graph/link.js';
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

describe('Cross-scope link bidirectional integrity', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-scope-test-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(path.join(testDir, '.git'));
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Agent graph isolation', () => {
    it('should maintain separate graph.json for each agent', async () => {
      // Write memories to two different agents
      await writeMemory({
        id: 'decision-alpha-1',
        type: MemoryType.Decision,
        title: 'Alpha Decision',
        content: 'Agent alpha decision.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-alpha',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-alpha-1',
        type: MemoryType.Learning,
        title: 'Alpha Learning',
        content: 'Agent alpha learning.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-alpha',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'decision-beta-1',
        type: MemoryType.Decision,
        title: 'Beta Decision',
        content: 'Agent beta decision.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-beta',
        projectRoot: testDir,
      });

      // Link within alpha
      const alphaPath = agentBasePath(testDir, 'agent-alpha');
      const linkResult = await linkMemories({
        source: 'decision-alpha-1',
        target: 'learning-alpha-1',
        relation: 'led-to',
        basePath: alphaPath,
      });
      expect(linkResult.status).toBe('success');

      // Alpha's graph should have the edge
      const alphaGraph = await loadGraph(alphaPath);
      const alphaEdge = alphaGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-alpha-1' && e.target === 'learning-alpha-1'
      );
      expect(alphaEdge).toBeDefined();

      // Beta's graph should NOT have the edge
      const betaPath = agentBasePath(testDir, 'agent-beta');
      const betaGraph = await loadGraph(betaPath);
      const betaEdge = betaGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-alpha-1' && e.target === 'learning-alpha-1'
      );
      expect(betaEdge).toBeUndefined();
    });

    it('should not leak links from agent scope to project scope', async () => {
      // Write agent-scoped memories and link them
      await writeMemory({
        id: 'decision-agent-link',
        type: MemoryType.Decision,
        title: 'Agent Link Source',
        content: 'Source for agent link.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'link-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-agent-link',
        type: MemoryType.Learning,
        title: 'Agent Link Target',
        content: 'Target for agent link.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'link-agent',
        projectRoot: testDir,
      });

      const agentPath = agentBasePath(testDir, 'link-agent');
      await linkMemories({
        source: 'decision-agent-link',
        target: 'learning-agent-link',
        relation: 'informed-by',
        basePath: agentPath,
      });

      // Project graph should not contain agent edges
      const projectGraph = await loadGraph(memoryDir);
      const leakedEdge = projectGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-agent-link' && e.target === 'learning-agent-link'
      );
      expect(leakedEdge).toBeUndefined();
    });

    it('should not leak links from project scope to agent scope', async () => {
      // Write project-scoped memories and link them
      await writeMemory({
        id: 'decision-project-link',
        type: MemoryType.Decision,
        title: 'Project Link Source',
        content: 'Source for project link.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      await writeMemory({
        id: 'learning-project-link',
        type: MemoryType.Learning,
        title: 'Project Link Target',
        content: 'Target for project link.',
        tags: ['testing'],
        scope: Scope.Project,
        basePath: memoryDir,
      });

      await linkMemories({
        source: 'decision-project-link',
        target: 'learning-project-link',
        relation: 'relates-to',
        basePath: memoryDir,
      });

      // Write an agent memory so the agent dir exists
      await writeMemory({
        id: 'learning-bystander',
        type: MemoryType.Learning,
        title: 'Bystander',
        content: 'Just here so the agent dir exists.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'bystander-agent',
        projectRoot: testDir,
      });

      // Agent graph should not contain project edges
      const agentPath = agentBasePath(testDir, 'bystander-agent');
      const agentGraph = await loadGraph(agentPath);
      const leakedEdge = agentGraph.edges.find(
        (e: { source: string; target: string }) =>
          e.source === 'decision-project-link' && e.target === 'learning-project-link'
      );
      expect(leakedEdge).toBeUndefined();
    });
  });

  describe('Link bidirectionality within scope', () => {
    it('should store edge with correct source and target', async () => {
      await writeMemory({
        id: 'decision-bidir-src',
        type: MemoryType.Decision,
        title: 'Bidirectional Source',
        content: 'Source memory.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'bidir-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-bidir-tgt',
        type: MemoryType.Learning,
        title: 'Bidirectional Target',
        content: 'Target memory.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'bidir-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'bidir-agent');
      await linkMemories({
        source: 'decision-bidir-src',
        target: 'learning-bidir-tgt',
        relation: 'caused',
        basePath,
      });

      const graph = await loadGraph(basePath);

      // Forward edge: src → tgt
      const forwardEdge = graph.edges.find(
        (e: { source: string; target: string; label: string }) =>
          e.source === 'decision-bidir-src' &&
          e.target === 'learning-bidir-tgt' &&
          e.label === 'caused'
      );
      expect(forwardEdge).toBeDefined();
    });

    it('should support duplicate-safe link creation', async () => {
      await writeMemory({
        id: 'decision-dupe-src',
        type: MemoryType.Decision,
        title: 'Dupe Source',
        content: 'Source.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'dupe-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-dupe-tgt',
        type: MemoryType.Learning,
        title: 'Dupe Target',
        content: 'Target.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'dupe-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'dupe-agent');

      // Link twice
      const first = await linkMemories({
        source: 'decision-dupe-src',
        target: 'learning-dupe-tgt',
        relation: 'relates-to',
        basePath,
      });
      expect(first.status).toBe('success');
      expect(first.alreadyExists).toBe(false);

      const second = await linkMemories({
        source: 'decision-dupe-src',
        target: 'learning-dupe-tgt',
        relation: 'relates-to',
        basePath,
      });
      expect(second.status).toBe('success');
      expect(second.alreadyExists).toBe(true);

      // Should only have one edge
      const graph = await loadGraph(basePath);
      const matchingEdges = graph.edges.filter(
        (e: { source: string; target: string }) =>
          e.source === 'decision-dupe-src' && e.target === 'learning-dupe-tgt'
      );
      expect(matchingEdges.length).toBe(1);
    });
  });

  describe('Unlink within agent scope', () => {
    it('should remove a link without affecting other links', async () => {
      const agent = 'unlink-agent';
      const basePath = agentBasePath(testDir, agent);

      // Write three memories
      for (const [id, type, title] of [
        ['decision-unlink-a', MemoryType.Decision, 'Unlink A'],
        ['learning-unlink-b', MemoryType.Learning, 'Unlink B'],
        ['gotcha-unlink-c', MemoryType.Gotcha, 'Unlink C'],
      ] as const) {
        await writeMemory({
          id,
          type,
          title,
          content: `Memory ${title}.`,
          tags: ['testing'],
          scope: Scope.AgentProject,
          agent,
          projectRoot: testDir,
        });
      }

      // Create two links: A→B and A→C
      await linkMemories({
        source: 'decision-unlink-a',
        target: 'learning-unlink-b',
        relation: 'led-to',
        basePath,
      });

      await linkMemories({
        source: 'decision-unlink-a',
        target: 'gotcha-unlink-c',
        relation: 'caused',
        basePath,
      });

      // Verify both exist
      let graph = await loadGraph(basePath);
      expect(graph.edges.length).toBe(2);

      // Unlink A→B
      const unlinkResult = await unlinkMemories({
        source: 'decision-unlink-a',
        target: 'learning-unlink-b',
        basePath,
      });
      expect(unlinkResult.status).toBe('success');

      // A→C should still exist, A→B should be gone
      graph = await loadGraph(basePath);
      expect(graph.edges.length).toBe(1);

      const remainingEdge = graph.edges[0];
      expect(remainingEdge.source).toBe('decision-unlink-a');
      expect(remainingEdge.target).toBe('gotcha-unlink-c');
    });
  });
});
