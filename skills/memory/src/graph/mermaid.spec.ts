/**
 * Tests for T072: Mermaid Diagram Generation
 */

import { describe, it, expect } from 'vitest';
import { MemoryType } from '../types/enums.js';
import {
  generateMermaid,
  generateTextGraph,
  generateDot,
} from './mermaid.js';
import type { MemoryGraph } from './structure.js';

describe('generateMermaid', () => {
  const emptyGraph: MemoryGraph = {
    version: 1,
    nodes: [],
    edges: [],
  };

  const simpleGraph: MemoryGraph = {
    version: 1,
    nodes: [
      { id: 'node-1', type: MemoryType.Decision },
      { id: 'node-2', type: MemoryType.Learning },
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
        nodes: [{ id: 'decision-node', type: MemoryType.Decision }],
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
        nodes: [{ id: 'artifact-node', type: MemoryType.Artifact }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Rectangle uses [] brackets - ID keeps original hyphens
      expect(result).toMatch(/artifact-node\[/);
    });

    it('should use stadium for learning nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'learning-node', type: MemoryType.Learning }],
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
        nodes: [{ id: 'hub-node', type: MemoryType.Hub }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Circle uses (()) brackets
      expect(result).toContain('((');
      expect(result).toContain('))');
    });

    it('should use hexagon for rule nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'rule-project-claude-md', type: MemoryType.Rule }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Hexagon uses {{}} brackets (same as decision)
      expect(result).toContain('{{');
      expect(result).toContain('}}');
    });

    it('should use cylinder for reminder nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'reminder-project-curator-memory', type: MemoryType.Reminder }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Cylinder uses [()] brackets
      expect(result).toContain('[(');
      expect(result).toContain(')]');
    });
  });

  describe('node styles', () => {
    it('should apply distinct style for rule nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'rule-project-claude-md', type: MemoryType.Rule }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Rule nodes should have a style definition
      expect(result).toContain('classDef rule');
    });

    it('should apply distinct style for reminder nodes', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'reminder-project-curator-memory', type: MemoryType.Reminder }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Reminder nodes should have a style definition
      expect(result).toContain('classDef reminder');
    });
  });

  describe('node labels', () => {
    it('should escape special characters in labels', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [{ id: 'node[with]special{chars}', type: MemoryType.Hub }],
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
        nodes: [{ id: 'node@with#special!chars', type: MemoryType.Hub }],
        edges: [],
      };

      const result = generateMermaid(graph);

      // Special characters should be replaced with underscores
      expect(result).toContain('node_with_special_chars');
    });
  });

  describe('edges', () => {
    it('should abbreviate edge labels by default', () => {
      const result = generateMermaid(simpleGraph);
      // "leads to" -> "lea" (truncated to 3 chars as it's not in abbreviation map)
      expect(result).toContain('|lea|');
    });

    it('should use full labels when abbreviateLabels is false', () => {
      const result = generateMermaid(simpleGraph, { abbreviateLabels: false, showAll: true });
      expect(result).toContain('leads to');
    });

    it('should use "rel" as default for edges without labels', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'a', type: MemoryType.Hub },
          { id: 'b', type: MemoryType.Hub },
        ],
        edges: [
          { source: 'a', target: 'b', label: '' },
        ],
      };

      const result = generateMermaid(graph);

      // Empty label becomes "rel" (default)
      expect(result).toContain('|rel|');
    });
  });

  describe('styles', () => {
    it('should generate style definitions for node types', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'node1', type: MemoryType.Decision },
          { id: 'node2', type: MemoryType.Artifact },
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
          { id: 'node1', type: MemoryType.Decision },
          { id: 'node2', type: MemoryType.Decision },
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
          { id: 'decision1', type: MemoryType.Decision },
          { id: 'learning1', type: MemoryType.Learning },
          { id: 'artifact1', type: MemoryType.Artifact },
        ],
        edges: [
          { source: 'decision1', target: 'learning1', label: '' },
          { source: 'learning1', target: 'artifact1', label: '' },
        ],
      };

      const result = generateMermaid(graph, { filterType: MemoryType.Decision });

      expect(result).toContain('decision1');
      expect(result).not.toContain('learning1');
      expect(result).not.toContain('artifact1');
    });

    it('should extract subgraph from starting node', () => {
      const graph: MemoryGraph = {
        version: 1,
        nodes: [
          { id: 'root', type: MemoryType.Hub },
          { id: 'child1', type: MemoryType.Hub },
          { id: 'child2', type: MemoryType.Hub },
          { id: 'grandchild', type: MemoryType.Hub },
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
        { id: 'node-1', type: MemoryType.Decision },
        { id: 'node-2', type: MemoryType.Learning },
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
      nodes: [{ id: 'a', type: MemoryType.Hub }, { id: 'b', type: MemoryType.Hub }],
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
        { id: 'node-1', type: MemoryType.Decision },
        { id: 'node-2', type: MemoryType.Learning },
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
      nodes: [{ id: 'node[with]brackets', type: MemoryType.Hub }],
      edges: [],
    };

    const result = generateDot(graph);

    // B3: Should sanitise node IDs and escape labels
    expect(result).toContain('"node_with_brackets"'); // Sanitised ID
    expect(result).toContain('[label="node(with)brackets"]'); // Escaped label
  });

  it('should include edge labels when present', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'a', type: MemoryType.Hub },
        { id: 'b', type: MemoryType.Hub },
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
