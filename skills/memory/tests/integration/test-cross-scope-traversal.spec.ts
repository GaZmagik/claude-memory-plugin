/**
 * TD20/TD21: Integration tests for cross-scope traversal operations
 *
 * Verifies that calculateImpact() and findOrphanedNodes() work correctly
 * on merged multi-scope graphs containing cross-scope edges.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../src/core/write.js';
import { loadGraph, saveGraph, addNode } from '../../src/graph/structure.js';
import { addEdge } from '../../src/graph/edges.js';
import { calculateImpact } from '../../src/graph/traversal.js';
import { findOrphanedNodes } from '../../src/graph/edges.js';
import { loadMergedGraph } from '../../src/graph/structure.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Capture safe cwd before any test manipulation

describe('Cross-scope traversal on merged graphs', () => {
  let testDir: string;
  let agentBasePath: string;
  let projectBasePath: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-scope-traversal-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');
    projectBasePath = path.join(testDir, '.claude', 'memory');

    // Create agent memories (IDs must match type prefix)
    await writeMemory({
      id: 'learning-agent-1',
      type: MemoryType.Learning,
      title: 'Agent Learning One',
      content: 'First agent learning',
      tags: ['agent'],
      scope: Scope.AgentProject,
      agent: 'ts-expert',
      projectRoot: testDir,
    });

    await writeMemory({
      id: 'learning-agent-2',
      type: MemoryType.Learning,
      title: 'Agent Learning Two',
      content: 'Second agent learning',
      tags: ['agent'],
      scope: Scope.AgentProject,
      agent: 'ts-expert',
      projectRoot: testDir,
    });

    // Create project memories (IDs must match type prefix)
    await writeMemory({
      id: 'decision-project-1',
      type: MemoryType.Decision,
      title: 'Project Decision One',
      content: 'Project decision',
      tags: ['project'],
      scope: Scope.Project,
      basePath: projectBasePath,
    });

    await writeMemory({
      id: 'decision-project-2',
      type: MemoryType.Decision,
      title: 'Project Decision Two',
      content: 'Another project decision',
      tags: ['project'],
      scope: Scope.Project,
      basePath: projectBasePath,
    });

    // Set up intra-scope edges in agent graph
    let agentGraph = await loadGraph(agentBasePath);
    agentGraph = addEdge(agentGraph, 'learning-agent-1', 'learning-agent-2', 'informs');
    await saveGraph(agentBasePath, agentGraph);

    // Set up intra-scope edges in project graph
    let projectGraph = await loadGraph(projectBasePath);
    projectGraph = addEdge(projectGraph, 'decision-project-1', 'decision-project-2', 'supersedes');
    await saveGraph(projectBasePath, projectGraph);

    // Add cross-scope edge: learning-agent-1 --informs--> decision-project-1
    // Mirror in both graphs
    const crossEdgeMeta = {
      sourceScope: 'agent-project',
      targetScope: 'project',
      sourceAgent: 'ts-expert',
    };

    agentGraph = await loadGraph(agentBasePath);
    if (!agentGraph.nodes.find(n => n.id === 'decision-project-1')) {
      agentGraph = addNode(agentGraph, {
        id: 'decision-project-1',
        type: 'decision',
        scope: 'project',
      });
    }
    agentGraph = addEdge(agentGraph, 'learning-agent-1', 'decision-project-1', 'informs', crossEdgeMeta);
    await saveGraph(agentBasePath, agentGraph);

    projectGraph = await loadGraph(projectBasePath);
    if (!projectGraph.nodes.find(n => n.id === 'learning-agent-1')) {
      projectGraph = addNode(projectGraph, {
        id: 'learning-agent-1',
        type: 'learning',
        scope: 'agent-project',
        agent: 'ts-expert',
      });
    }
    projectGraph = addEdge(projectGraph, 'learning-agent-1', 'decision-project-1', 'informs', crossEdgeMeta);
    await saveGraph(projectBasePath, projectGraph);
  });

  afterEach(() => {
    process.chdir(os.homedir());
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('TD20: calculateImpact() on merged graph', () => {
    it('identifies cross-scope dependents in merged graph', async () => {
      // Merge both graphs
      const mergedGraph = await loadMergedGraph([agentBasePath, projectBasePath]);

      // Calculate impact of removing learning-agent-1
      const impact = calculateImpact(mergedGraph, 'learning-agent-1');

      // learning-agent-2 depends on learning-agent-1 (intra-scope)
      // decision-project-1 also depends on learning-agent-1 (cross-scope)
      // Both should show as orphaned if learning-agent-1 is removed
      expect(impact.orphanedNodes).toContain('learning-agent-2');
      expect(impact.orphanedNodes).toContain('decision-project-1');

      // Broken edges: learning-agent-1 -> learning-agent-2 (intra)
      //               learning-agent-1 -> decision-project-1 (cross)
      expect(impact.brokenEdges).toBeGreaterThanOrEqual(2);
    });

    it('does not mark nodes with alternative inbound edges as orphaned', async () => {
      // Add an additional intra-project edge to decision-project-1
      // so it has an alternative path that doesn't go through learning-agent-1
      let projectGraph = await loadGraph(projectBasePath);
      projectGraph = addEdge(projectGraph, 'decision-project-2', 'decision-project-1', 'relates-to');
      await saveGraph(projectBasePath, projectGraph);

      const mergedGraph = await loadMergedGraph([agentBasePath, projectBasePath]);

      const impact = calculateImpact(mergedGraph, 'learning-agent-1');

      // decision-project-1 now has an alternative inbound edge from decision-project-2
      // so it should NOT be orphaned
      expect(impact.orphanedNodes).not.toContain('decision-project-1');

      // learning-agent-2 still only has one inbound edge (from learning-agent-1)
      expect(impact.orphanedNodes).toContain('learning-agent-2');
    });
  });

  describe('TD21: findOrphanedNodes() with cross-scope edges', () => {
    it('does not falsely report node as orphaned when it has cross-scope inbound edges', async () => {
      const mergedGraph = await loadMergedGraph([agentBasePath, projectBasePath]);

      const orphans = findOrphanedNodes(mergedGraph);

      // decision-project-1 has an inbound cross-scope edge from learning-agent-1
      // and an intra-scope outbound to decision-project-2
      // It should NOT be orphaned in the merged view
      expect(orphans).not.toContain('decision-project-1');

      // learning-agent-1 has outbound edges — it IS connected, so not orphaned
      expect(orphans).not.toContain('learning-agent-1');
    });

    it('correctly identifies truly orphaned nodes in merged graph', async () => {
      // Add an isolated node to the agent graph
      let agentGraph = await loadGraph(agentBasePath);
      agentGraph = addNode(agentGraph, { id: 'isolated-node', type: 'learning' });
      await saveGraph(agentBasePath, agentGraph);

      const mergedGraph = await loadMergedGraph([agentBasePath, projectBasePath]);

      const orphans = findOrphanedNodes(mergedGraph);

      // The isolated node has no edges at all — it IS orphaned
      expect(orphans).toContain('isolated-node');
    });

    it('single-scope view might show node as orphaned but merged view does not', async () => {
      // Add a node to project graph that only has a cross-scope inbound edge
      let projectGraph = await loadGraph(projectBasePath);
      projectGraph = addNode(projectGraph, { id: 'lonely-project-node', type: 'artifact' });
      await saveGraph(projectBasePath, projectGraph);

      // In the project-only view, lonely-project-node is orphaned
      const projectOnlyGraph = await loadGraph(projectBasePath);
      const projectOrphans = findOrphanedNodes(projectOnlyGraph);
      expect(projectOrphans).toContain('lonely-project-node');

      // Now add a cross-scope edge in the agent graph pointing to it
      let agentGraph = await loadGraph(agentBasePath);
      agentGraph = addNode(agentGraph, { id: 'lonely-project-node', type: 'artifact', scope: 'project' });
      agentGraph = addEdge(agentGraph, 'learning-agent-1', 'lonely-project-node', 'documents', {
        sourceScope: 'agent-project',
        targetScope: 'project',
        sourceAgent: 'ts-expert',
      });
      await saveGraph(agentBasePath, agentGraph);

      // In the merged view, lonely-project-node has an inbound edge
      const mergedGraph = await loadMergedGraph([agentBasePath, projectBasePath]);
      const mergedOrphans = findOrphanedNodes(mergedGraph);
      expect(mergedOrphans).not.toContain('lonely-project-node');
    });
  });
});
