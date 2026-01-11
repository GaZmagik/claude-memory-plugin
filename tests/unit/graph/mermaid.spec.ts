/**
 * Tests for T072: Mermaid Diagram Generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateMermaid,
  generateTextGraph,
  generateDot,
} from '../../../skills/memory/src/graph/mermaid.js';
import type { MemoryGraph } from '../../../skills/memory/src/graph/structure.js';

describe('generateMermaid', () => {
  const emptyGraph: MemoryGraph = {
    version: 1,
    nodes: [],
    edges: [],
  };

  const simpleGraph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'node-1', type: 'decision' },
      { id: 'node-2', type: 'learning' },
    ],
    edges: [
      { source: 'node-1', target: 'node-2', label: 'leads to' },
    ],
  };

  describe('basic generation', () => {
    it('should generate empty flowchart for empty graph', () => {
      const result = generateMermaid(emptyGraph);
      expect(result).toContain('flowchart TB');
    });

    it('should generate nodes and edges', () => {
      const result = generateMermaid(simpleGraph);
      expect(result).toContain('flowchart TB');
      expect(result).toContain('node-1');
      expect(result).toContain('node-2');
      expect(result).toContain('-->');
    });

    it('should use default direction TB', () => {
      const result = generateMermaid(simpleGraph);
      expect(result).toContain('flowchart TB');
    });

    it('should support custom direction', () => {
      const result = generateMermaid(simpleGraph, { direction: 'LR' });
      expect(result).toContain('flowchart LR');
    });
  });

  describe('node shapes', () => {
    it('should use hexagon for decision nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'decision-node', type: 'decision' }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Hexagon uses {{}} brackets
      expect(result).toContain('{{');
      expect(result).toContain('}}');
    });

    it('should use rectangle for artifact nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'artifact-node', type: 'artifact' }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Rectangle uses [] brackets - ID keeps original hyphens
      expect(result).toMatch(/artifact-node\[/);
    });

    it('should use stadium for learning nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'learning-node', type: 'learning' }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Stadium uses ([]) brackets
      expect(result).toContain('([');
      expect(result).toContain('])');
    });

    it('should use circle for hub nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'hub-node', type: 'hub' }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Circle uses (()) brackets
      expect(result).toContain('((');
      expect(result).toContain('))');
    });
  });

  describe('node labels', () => {
    it('should escape special characters in labels', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node[with]special{chars}', type: 'hub' }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Should escape brackets and braces
      expect(result).toContain('(');
      expect(result).toContain(')');
      expect(result).not.toContain('[with]');
      expect(result).not.toContain('{chars}');
    });

    it('should show type when showType option enabled', () => {
      const result = generateMermaid(simpleGraph, { showType: true });
      expect(result).toContain('decision:');
      expect(result).toContain('learning:');
    });

    it('should sanitise node IDs', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node@with#special!chars', type: 'hub' }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Special characters should be replaced with underscores
      expect(result).toContain('node_with_special_chars');
    });
  });

  describe('edges', () => {
    it('should include edge labels', () => {
      const result = generateMermaid(simpleGraph);
      expect(result).toContain('leads to');
    });

    it('should handle edges without labels', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'a', type: 'hub' },
          { id: 'b', type: 'hub' },
        ],
        edges: [
          { source: 'a', target: 'b', label: '' },
        ],
      };

      const result = generateMermaid(graph);

      // Should have arrow without label
      expect(result).toContain('a --> b');
    });
  });

  describe('styles', () => {
    it('should generate style definitions for node types', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node1', type: 'decision' },
          { id: 'node2', type: 'artifact' },
        ],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Should contain classDef declarations
      expect(result).toContain('classDef decision');
      expect(result).toContain('classDef artifact');
    });

    it('should apply classes to nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node1', type: 'decision' },
          { id: 'node2', type: 'decision' },
        ],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Should apply class to nodes
      expect(result).toContain('class node1,node2 decision');
    });
  });

  describe('filtering', () => {
    it('should filter by type', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'decision1', type: 'decision' },
          { id: 'learning1', type: 'learning' },
          { id: 'artifact1', type: 'artifact' },
        ],
        edges: [
          { source: 'decision1', target: 'learning1', label: '' },
          { source: 'learning1', target: 'artifact1', label: '' },
        ],
      };

      const result = generateMermaid(graph, { filterType: 'decision' });

      expect(result).toContain('decision1');
      expect(result).not.toContain('learning1');
      expect(result).not.toContain('artifact1');
    });

    it('should extract subgraph from starting node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'root', type: 'hub' },
          { id: 'child1', type: 'hub' },
          { id: 'child2', type: 'hub' },
          { id: 'grandchild', type: 'hub' },
        ],
        edges: [
          { source: 'root', target: 'child1', label: '' },
          { source: 'root', target: 'child2', label: '' },
          { source: 'child1', target: 'grandchild', label: '' },
        ],
      };

      const result = generateMermaid(graph, { fromNode: 'root', depth: 1 });

      expect(result).toContain('root');
      expect(result).toContain('child1');
      expect(result).toContain('child2');
      expect(result).not.toContain('grandchild');
    });
  });
});

describe('generateTextGraph', () => {
  it('should generate text representation of graph', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'node-1', type: 'decision' },
        { id: 'node-2', type: 'learning' },
      ],
      edges: [
        { source: 'node-1', target: 'node-2', label: 'leads to' },
      ],
    };

    const result = generateTextGraph(graph);
    expect(result).toContain('Nodes: 2');
    expect(result).toContain('Edges: 1');
    expect(result).toContain('[decision] node-1');
    expect(result).toContain('[learning] node-2');
  });

  it('should show edge labels in text format', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [{ id: 'a', type: 'hub' }, { id: 'b', type: 'hub' }],
      edges: [{ source: 'a', target: 'b', label: 'connects' }],
    };

    const result = generateTextGraph(graph);
    expect(result).toContain('a --connects--> b');
  });
});

describe('generateDot', () => {
  it('should generate DOT format for Graphviz', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'node-1', type: 'decision' },
        { id: 'node-2', type: 'learning' },
      ],
      edges: [
        { source: 'node-1', target: 'node-2', label: 'leads to' },
      ],
    };

    const result = generateDot(graph);
    expect(result).toContain('digraph MemoryGraph {');
    expect(result).toContain('"node-1"');
    expect(result).toContain('"node-2"');
    expect(result).toContain('->');
    expect(result).toContain('}');
  });

  it('should escape labels in DOT format', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [{ id: 'node[with]brackets', type: 'hub' }],
      edges: [],
    };

    const result = generateDot(graph);

    // Should escape special characters in labels
    expect(result).toContain('"node[with]brackets"');
    expect(result).toContain('[label=');
  });

  it('should include edge labels when present', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: 'hub' },
        { id: 'b', type: 'hub' },
      ],
      edges: [
        { source: 'a', target: 'b', label: 'connects to' },
      ],
    };

    const result = generateDot(graph);

    expect(result).toContain('->');
    expect(result).toContain('[label="connects to"]');
  });
});
