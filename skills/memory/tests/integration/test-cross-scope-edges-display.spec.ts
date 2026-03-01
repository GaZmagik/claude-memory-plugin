/**
 * TD22: Integration tests for cmdEdges with --agent --include-shared
 *
 * Verifies that the edges command shows scope indicators on cross-scope
 * edges when --include-shared flag is used with --agent.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../src/core/write.js';
import { loadGraph, saveGraph, addNode } from '../../src/graph/structure.js';
import { addEdge } from '../../src/graph/edges.js';
import { cmdEdges } from '../../src/cli/commands/graph.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Capture safe cwd before any test manipulation

describe('TD22: cmdEdges with --agent --include-shared', () => {
  let testDir: string;
  let agentBasePath: string;
  let projectBasePath: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edges-cross-scope-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');
    projectBasePath = path.join(testDir, '.claude', 'memory');

    // Create agent memory (ID must match type prefix)
    await writeMemory({
      id: 'learning-agent-mem',
      type: MemoryType.Learning,
      title: 'Agent Memory',
      content: 'Agent knowledge',
      tags: ['agent'],
      scope: Scope.AgentProject,
      agent: 'ts-expert',
      projectRoot: testDir,
    });

    // Create project memory (ID must match type prefix)
    await writeMemory({
      id: 'decision-project-mem',
      type: MemoryType.Decision,
      title: 'Project Memory',
      content: 'Project decision',
      tags: ['project'],
      scope: Scope.Project,
      basePath: projectBasePath,
    });

    // Set up cross-scope edge in both graphs
    const crossEdgeMeta = {
      sourceScope: 'agent-project',
      targetScope: 'project',
      sourceAgent: 'ts-expert',
    };

    // Add to agent graph
    let agentGraph = await loadGraph(agentBasePath);
    if (!agentGraph.nodes.find(n => n.id === 'decision-project-mem')) {
      agentGraph = addNode(agentGraph, {
        id: 'decision-project-mem',
        type: MemoryType.Decision,
        scope: Scope.Project,
      });
    }
    agentGraph = addEdge(agentGraph, 'learning-agent-mem', 'decision-project-mem', 'informs', crossEdgeMeta);
    await saveGraph(agentBasePath, agentGraph);

    // Add to project graph
    let projectGraph = await loadGraph(projectBasePath);
    if (!projectGraph.nodes.find(n => n.id === 'learning-agent-mem')) {
      projectGraph = addNode(projectGraph, {
        id: 'learning-agent-mem',
        type: MemoryType.Learning,
        scope: Scope.AgentProject,
        agent: 'ts-expert',
      });
    }
    projectGraph = addEdge(projectGraph, 'learning-agent-mem', 'decision-project-mem', 'informs', crossEdgeMeta);
    await saveGraph(projectBasePath, projectGraph);
  });

  afterEach(() => {
    process.chdir(os.homedir());
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('shows cross-scope edges when --include-shared is used', async () => {
    const args: ParsedArgs = {
      positional: ['learning-agent-mem'],
      flags: {
        agent: 'ts-expert',
        'include-shared': true,
      },
    };

    const result = await cmdEdges(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();

    // Should have outbound edge to decision-project-mem
    const outbound = (result.data as any).outbound;
    expect(outbound.length).toBeGreaterThanOrEqual(1);

    // The cross-scope edge should be present
    const crossEdge = outbound.find((e: any) => e.target === 'decision-project-mem');
    expect(crossEdge).toBeDefined();
  });

  it('shows edges from project scope for cross-scope target node', async () => {
    const args: ParsedArgs = {
      positional: ['decision-project-mem'],
      flags: {
        agent: 'ts-expert',
        'include-shared': true,
      },
    };

    const result = await cmdEdges(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();

    // Should have inbound edge from learning-agent-mem
    const inbound = (result.data as any).inbound;
    expect(inbound.length).toBeGreaterThanOrEqual(1);

    const crossEdge = inbound.find((e: any) => e.source === 'learning-agent-mem');
    expect(crossEdge).toBeDefined();
  });

  it('rejects --include-shared without --agent', async () => {
    const args: ParsedArgs = {
      positional: ['some-id'],
      flags: {
        'include-shared': true,
      },
    };

    const result = await cmdEdges(args);

    expect(result.status).toBe('error');
    expect(result.error).toBeDefined();
  });
});
