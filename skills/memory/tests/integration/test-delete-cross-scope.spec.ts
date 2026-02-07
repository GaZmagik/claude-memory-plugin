/**
 * TD17/TD18: Integration tests for cross-scope edge cleanup on delete
 *
 * Verifies that deleting a memory with cross-scope edges cleans up
 * the other scope's graph, and handles inaccessible graphs gracefully.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deleteMemory } from '../../src/core/delete.js';
import { writeMemory } from '../../src/core/write.js';
import { loadGraph, saveGraph, addNode } from '../../src/graph/structure.js';
import { addEdge } from '../../src/graph/edges.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Capture safe cwd before any test manipulation

describe('Delete with cross-scope edge cleanup', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'delete-cross-scope-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    // Create agent memory
    await writeMemory({
      id: 'learning-agent-mem',
      type: MemoryType.Learning,
      title: 'Agent Learning',
      content: 'Agent knowledge',
      tags: ['agent'],
      scope: Scope.AgentProject,
      agent: 'ts-expert',
      projectRoot: testDir,
    });

    // Create project memory
    await writeMemory({
      id: 'decision-project-mem',
      type: MemoryType.Decision,
      title: 'Project Decision',
      content: 'Project decision',
      tags: ['project'],
      scope: Scope.Project,
      basePath: path.join(testDir, '.claude', 'memory'),
    });

    // Manually create cross-scope edges in both graphs
    const agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');
    const projectBasePath = path.join(testDir, '.claude', 'memory');

    const crossEdgeMetadata = {
      sourceScope: 'agent-project',
      targetScope: 'project',
      sourceAgent: 'ts-expert',
    };

    // Add cross-scope edge to agent graph
    let agentGraph = await loadGraph(agentBasePath);
    if (!agentGraph.nodes.find(n => n.id === 'decision-project-mem')) {
      agentGraph = addNode(agentGraph, {
        id: 'decision-project-mem',
        type: 'decision',
        scope: 'project',
      });
    }
    agentGraph = addEdge(
      agentGraph, 'learning-agent-mem', 'decision-project-mem', 'informs',
      crossEdgeMetadata
    );
    await saveGraph(agentBasePath, agentGraph);

    // Add same cross-scope edge to project graph
    let projectGraph = await loadGraph(projectBasePath);
    if (!projectGraph.nodes.find(n => n.id === 'learning-agent-mem')) {
      projectGraph = addNode(projectGraph, {
        id: 'learning-agent-mem',
        type: 'learning',
        scope: 'agent-project',
        agent: 'ts-expert',
      });
    }
    projectGraph = addEdge(
      projectGraph, 'learning-agent-mem', 'decision-project-mem', 'informs',
      crossEdgeMetadata
    );
    await saveGraph(projectBasePath, projectGraph);
  });

  afterEach(() => {
    process.chdir(os.homedir());
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('TD17: Delete memory with cross-scope edges', () => {
    it('removes cross-scope edges from the other scope graph', async () => {
      const agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');
      const projectBasePath = path.join(testDir, '.claude', 'memory');

      // Verify cross-scope edge exists in project graph before deletion
      const projectGraphBefore = await loadGraph(projectBasePath);
      const edgeBefore = projectGraphBefore.edges.find(
        e => e.source === 'learning-agent-mem' && e.target === 'decision-project-mem'
      );
      expect(edgeBefore).toBeDefined();

      // Delete the agent memory
      const result = await deleteMemory({
        id: 'learning-agent-mem',
        scope: Scope.AgentProject,
        agent: 'ts-expert',
        basePath: agentBasePath,
      });

      expect(result.status).toBe('success');

      // Agent graph should have the edge removed (via removeNode)
      const agentGraphAfter = await loadGraph(agentBasePath);
      const agentEdgeAfter = agentGraphAfter.edges.find(
        e => e.source === 'learning-agent-mem' || e.target === 'learning-agent-mem'
      );
      expect(agentEdgeAfter).toBeUndefined();

      // Project graph should ALSO have the cross-scope edge removed
      const projectGraphAfter = await loadGraph(projectBasePath);
      const projectEdgeAfter = projectGraphAfter.edges.find(
        e => e.source === 'learning-agent-mem' || e.target === 'learning-agent-mem'
      );
      expect(projectEdgeAfter).toBeUndefined();
    });
  });

  describe('TD18: Delete when other graph is inaccessible', () => {
    it('deletes successfully even when other scope graph cannot be accessed', async () => {
      const agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');

      // Make the project graph directory read-only to simulate inaccessibility
      const projectBasePath = path.join(testDir, '.claude', 'memory');
      const graphPath = path.join(projectBasePath, 'graph.json');

      // Corrupt the project graph to simulate an error
      fs.writeFileSync(graphPath, '{ totally broken json {{{');

      // Delete should still succeed (best-effort cleanup)
      const result = await deleteMemory({
        id: 'learning-agent-mem',
        scope: Scope.AgentProject,
        agent: 'ts-expert',
        basePath: agentBasePath,
      });

      expect(result.status).toBe('success');
      expect(result.deletedId).toBe('learning-agent-mem');

      // Agent graph should still be cleaned up
      const agentGraphAfter = await loadGraph(agentBasePath);
      const agentEdgeAfter = agentGraphAfter.edges.find(
        e => e.source === 'learning-agent-mem' || e.target === 'learning-agent-mem'
      );
      expect(agentEdgeAfter).toBeUndefined();
    });
  });
});
