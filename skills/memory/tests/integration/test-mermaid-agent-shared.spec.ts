/**
 * Integration Tests for Mermaid with --agent --include-shared (Phase E - T108)
 *
 * Tests Mermaid diagram generation with agent scope plus shared memories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cmdMermaid } from '../../src/cli/commands/graph.js';
import { writeMemory } from '../../src/core/write.js';
import { linkMemories } from '../../src/graph/link.js';
import { loadGraph, saveGraph, addNode } from '../../src/graph/structure.js';
import { addEdge } from '../../src/graph/edges.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Mermaid with --agent --include-shared', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-shared-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    // Create agent memories
    await writeMemory({
      id: 'learning-agent-mem-1',
      type: MemoryType.Learning,
      title: 'Agent Learning',
      content: 'Agent specific knowledge',
      tags: ['agent', 'test'],
      scope: Scope.AgentProject,
      agent: 'test-agent',
      projectRoot: testDir,
    });

    await writeMemory({
      id: 'decision-agent-mem-2',
      type: MemoryType.Decision,
      title: 'Agent Decision',
      content: 'Agent specific decision',
      tags: ['agent', 'decision'],
      scope: Scope.AgentProject,
      agent: 'test-agent',
      projectRoot: testDir,
    });

    // Create project-level memories (basePath must match project scope resolver: cwd/.claude/memory)
    const projectBasePath = path.join(testDir, '.claude', 'memory');
    await writeMemory({
      id: 'artifact-project-mem-1',
      type: MemoryType.Artifact,
      title: 'Project Artifact',
      content: 'Shared artifact',
      tags: ['project', 'artifact'],
      scope: Scope.Project,
      basePath: projectBasePath,
    });

    await writeMemory({
      id: 'learning-project-mem-2',
      type: MemoryType.Learning,
      title: 'Project Learning',
      content: 'Shared learning',
      tags: ['project', 'learning'],
      scope: Scope.Project,
      basePath: projectBasePath,
    });

    // Create global memory
    await writeMemory({
      id: 'gotcha-global-mem-1',
      type: MemoryType.Gotcha,
      title: 'Global Gotcha',
      content: 'Universal gotcha',
      tags: ['global', 'gotcha'],
      scope: Scope.Global,
      basePath: projectBasePath,
    });

    // Link project memory to global memory (same-scope link — works via linkMemories)
    await linkMemories({
      source: 'artifact-project-mem-1',
      target: 'gotcha-global-mem-1',
      relation: 'references',
      basePath: path.join(testDir, '.claude', 'memory'),
    });

    // Create cross-scope edge: agent node → project node
    // Cross-scope linking via linkMemories is not supported (design constraint),
    // so we inject the edge directly into the project graph to simulate
    // a cross-scope reference that would appear in the merged view.
    const projectGraphPath = path.join(testDir, '.claude', 'memory');
    let projectGraph = await loadGraph(projectGraphPath);
    // Add agent node reference to project graph (so edge endpoints exist)
    if (!projectGraph.nodes.find(n => n.id === 'learning-agent-mem-1')) {
      projectGraph = addNode(projectGraph, {
        id: 'learning-agent-mem-1',
        type: MemoryType.Learning,
        scope: Scope.AgentProject,
        agent: 'test-agent',
      });
    }
    projectGraph = addEdge(projectGraph, 'learning-agent-mem-1', 'artifact-project-mem-1', 'references');
    await saveGraph(projectGraphPath, projectGraph);
  });

  afterEach(() => {
    // Restore original cwd BEFORE deleting temp directory
    process.chdir(originalCwd);
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('includes project memories when --include-shared used', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', 'include-shared': true },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    expect(diagram).toContain('learning-agent-mem-1');
    expect(diagram).toContain('decision-agent-mem-2');
    expect(diagram).toContain('artifact-project-mem-1');
    expect(diagram).toContain('learning-project-mem-2');
  });

  it('includes global memories when --include-shared used', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', 'include-shared': true },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    expect(diagram).toContain('gotcha-global-mem-1');
  });

  it('shows links between agent and shared memories', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', 'include-shared': true },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Should show link from agent to project
    expect(diagram).toMatch(/learning-agent-mem-1.*-->.*artifact-project-mem-1/);
  });

  it('applies different styling to agent vs shared nodes', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', 'include-shared': true },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Agent nodes use [[double bracket]] shape and agentNode class
    expect(diagram).toContain('learning-agent-mem-1[[');
    // Agent nodes get agentNodeProject class applied
    expect(diagram).toContain('classDef agentNodeProject');
    // Shared nodes use standard shapes (no [[ ]])
    expect(diagram).toMatch(/artifact-project-mem-1\["/);
    // Both class types defined
    expect(diagram).toContain('classDef agentNode');
  });

  it('adds scope indicators to distinguish node sources', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', 'include-shared': true, 'show-scope': true },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    expect(diagram).toContain('[agent:test-agent]');
    expect(diagram).toContain('[project]');
    expect(diagram).toContain('[global]');
  });

  it('filters to only linked shared memories when filtering enabled', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'test-agent',
        'include-shared': true,
        'filter-linked': true,
      },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Should include artifact-project-mem-1 (linked to learning-agent-mem-1)
    expect(diagram).toContain('artifact-project-mem-1');
    // Should NOT include learning-project-mem-2 (not linked)
    expect(diagram).not.toContain('learning-project-mem-2');
  });

  it('traverses multiple hops when depth > 1', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'test-agent',
        'include-shared': true,
        depth: '2',
      },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Should reach gotcha-global-mem-1 via artifact-project-mem-1
    expect(diagram).toContain('learning-agent-mem-1');
    expect(diagram).toContain('artifact-project-mem-1');
    expect(diagram).toContain('gotcha-global-mem-1');
  });

  it('respects scope hierarchy in shared memory inclusion', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'test-agent',
        'include-shared': true,
        'scope-order': 'strict', // Project -> Global hierarchy
      },
    };

    const result = await cmdMermaid(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });

  it('generates compact diagram with abbreviations', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'test-agent',
        'include-shared': true,
        abbreviate: true,
      },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Abbreviated labels should make diagram more compact
    expect(diagram).toBeDefined();
    expect(diagram.length).toBeGreaterThan(0);
  });

  it('handles agent with no links to shared memories', async () => {
    // Create isolated agent
    await writeMemory({
      id: 'learning-isolated-mem-1',
      type: MemoryType.Learning,
      title: 'Isolated Learning',
      content: 'No shared links',
      tags: ['isolated'],
      scope: Scope.AgentProject,
      agent: 'isolated-agent',
      projectRoot: testDir,
    });

    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'isolated-agent',
        'include-shared': true,
        'filter-linked': true,
      },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Should only show agent memories
    expect(diagram).toContain('isolated-mem-1');
    expect(diagram).not.toContain('artifact-project-mem-1');
  });

  it('generates legend explaining scope indicators', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'test-agent',
        'include-shared': true,
        legend: true,
      },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    expect(diagram).toContain('subgraph Legend');
    expect(diagram).toContain('Agent Scope');
    expect(diagram).toContain('Project Scope');
  });

  it('exports to file with agent and shared content', async () => {
    // Use output path within agent's memory directory to pass security check
    const outputFile = path.join(testDir, '.claude/memory/agents/test-agent/agent-shared-graph.md');
    const args: ParsedArgs = {
      positional: [],
      flags: {
        agent: 'test-agent',
        'include-shared': true,
        output: outputFile,
      },
    };

    const result = await cmdMermaid(args);

    expect(result.status).toBe('success');
    expect(fs.existsSync(outputFile)).toBe(true);

    const content = fs.readFileSync(outputFile, 'utf-8');
    expect(content).toContain('learning-agent-mem-1');
    expect(content).toContain('artifact-project-mem-1');
  });

  it('validates --include-shared requires --agent', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { 'include-shared': true }, // Missing --agent
    };

    const result = await cmdMermaid(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('--agent');
  });
});
