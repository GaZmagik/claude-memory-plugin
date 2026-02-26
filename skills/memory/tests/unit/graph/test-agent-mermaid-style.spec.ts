/**
 * Tests for Agent Node Mermaid Styling (Phase E - T104)
 *
 * Tests visual styling for agent-scoped nodes in Mermaid diagrams.
 */

import { describe, it, expect } from 'vitest';
import { generateMermaid } from '../../../src/graph/mermaid.js';
import { MemoryType, Scope } from '../../../src/types/enums.js';
import type { MemoryGraph } from '../../../src/graph/structure.js';

describe('Agent Mermaid Styling', () => {
  it('applies agent node styling to agent-scoped memories', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'agent-mem-1', type: MemoryType.Learning, scope: Scope.AgentProject },
        { id: 'project-mem-1', type: MemoryType.Learning, scope: Scope.Project },
      ],
      edges: [],
    };

    const result = generateMermaid(graph);

    // Agent nodes should have distinct styling
    expect(result).toContain('agent-mem-1');
    expect(result).toContain('agentNode');
    expect(result).toContain('class agent-mem-1 agentNodeProject');
  });

  it('does not apply agent styling to non-agent nodes', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'project-mem-1', type: MemoryType.Learning, scope: Scope.Project },
        { id: 'global-mem-1', type: MemoryType.Decision, scope: Scope.Global },
      ],
      edges: [],
    };

    const result = generateMermaid(graph);

    expect(result).not.toContain('agentNode');
    expect(result).not.toContain('agentNodeProject');
    expect(result).not.toContain('agentNodeGlobal');
  });

  it('includes agent name in node label for agent-scoped memories', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        {
          id: 'agent-mem-1',
          type: MemoryType.Learning,
          scope: Scope.AgentProject,
          agent: 'typescript-pro',
        },
      ],
      edges: [],
    };

    const result = generateMermaid(graph, { includeAgentNames: true, abbreviateLabels: false });

    expect(result).toContain('typescript-pro');
  });

  it('uses different shapes for agent vs project nodes', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'agent-mem-1', type: MemoryType.Learning, scope: Scope.AgentProject },
        { id: 'project-mem-1', type: MemoryType.Learning, scope: Scope.Project },
      ],
      edges: [],
    };

    const result = generateMermaid(graph);

    // Agent nodes use double bracket [[text]]
    // Project nodes use stadium ([text]) for learning type
    expect(result).toMatch(/agent-mem-1\[\[.*\]\]/);
    expect(result).toMatch(/project-mem-1\(\[.*\]\)/);
  });

  it('applies color scheme for agent scope indicators', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'agent-mem-1', type: MemoryType.Learning, scope: Scope.AgentProject },
      ],
      edges: [],
    };

    const result = generateMermaid(graph);

    // Should include classDef for agentNode
    expect(result).toContain('classDef agentNode');
    expect(result).toContain('fill:#e3f2fd'); // Light blue for agent nodes
  });

  it('differentiates agent-project from agent-global nodes', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'agent-proj-1', type: MemoryType.Learning, scope: Scope.AgentProject },
        { id: 'agent-global-1', type: MemoryType.Learning, scope: Scope.AgentGlobal },
      ],
      edges: [],
    };

    const result = generateMermaid(graph);

    expect(result).toContain('class agent-proj-1 agentNodeProject');
    expect(result).toContain('class agent-global-1 agentNodeGlobal');
  });

  it('handles mixed scope graph with multiple agents', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'ts-mem-1', type: MemoryType.Learning, scope: Scope.AgentProject, agent: 'typescript-pro' },
        { id: 'rust-mem-1', type: MemoryType.Decision, scope: Scope.AgentProject, agent: 'rust-expert' },
        { id: 'proj-mem-1', type: MemoryType.Artifact, scope: Scope.Project },
      ],
      edges: [
        { source: 'ts-mem-1', target: 'proj-mem-1', label: 'references' },
        { source: 'rust-mem-1', target: 'proj-mem-1', label: 'uses' },
      ],
    };

    const result = generateMermaid(graph, { includeAgentNames: true, abbreviateLabels: false });

    expect(result).toContain('typescript-pro');
    expect(result).toContain('rust-expert');
    expect(result).toContain('agentNode');
  });

  it('abbreviates agent names when abbreviateLabels option enabled', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        {
          id: 'agent-mem-1',
          type: MemoryType.Learning,
          scope: Scope.AgentProject,
          agent: 'typescript-professional-advanced',
        },
      ],
      edges: [],
    };

    const result = generateMermaid(graph, { abbreviateLabels: true, includeAgentNames: true });

    // Should abbreviate long agent name (each part truncated to 4 chars max)
    expect(result).toContain('type-prof-adva');
  });

  it('filters to specific agent when agent context provided', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'ts-mem-1', type: MemoryType.Learning, scope: Scope.AgentProject, agent: 'typescript-pro' },
        { id: 'rust-mem-1', type: MemoryType.Decision, scope: Scope.AgentProject, agent: 'rust-expert' },
        { id: 'proj-mem-1', type: MemoryType.Artifact, scope: Scope.Project },
      ],
      edges: [],
    };

    const result = generateMermaid(graph, { agent: 'typescript-pro' });

    expect(result).toContain('ts-mem-1');
    expect(result).not.toContain('rust-mem-1');
  });

  it('includes shared memories when includeShared option enabled', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'ts-mem-1', type: MemoryType.Learning, scope: Scope.AgentProject, agent: 'typescript-pro' },
        { id: 'proj-mem-1', type: MemoryType.Artifact, scope: Scope.Project },
      ],
      edges: [
        { source: 'ts-mem-1', target: 'proj-mem-1', label: 'references' },
      ],
    };

    const result = generateMermaid(graph, { agent: 'typescript-pro', includeShared: true });

    expect(result).toContain('ts-mem-1');
    expect(result).toContain('proj-mem-1');
  });
});
