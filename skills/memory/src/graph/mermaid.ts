/**
 * T072: Mermaid Diagram Generation
 *
 * Generate Mermaid flowchart diagrams from memory graphs.
 */

import type { MemoryGraph, GraphNode } from './structure.js';
import { getSubgraph } from './traversal.js';

/**
 * Mermaid generation options
 */
export interface MermaidOptions {
  /** Graph direction: TB (top-bottom), LR (left-right), etc. */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Starting node for subgraph extraction */
  fromNode?: string;
  /** Maximum depth from starting node */
  depth?: number;
  /** Filter by node type */
  filterType?: string;
  /** Filter by tag (requires node metadata) */
  filterTag?: string;
  /** Include node type in label */
  showType?: boolean;
}

/**
 * Node shape configuration by type
 */
const NODE_SHAPES: Record<string, { open: string; close: string }> = {
  decision: { open: '{{', close: '}}' },     // Hexagon
  artifact: { open: '[', close: ']' },       // Rectangle
  learning: { open: '([', close: '])' },     // Stadium
  hub: { open: '((', close: '))' },          // Circle
  session: { open: '[/', close: '/]' },      // Parallelogram
  default: { open: '[', close: ']' },
};

/**
 * Node style configuration by type
 */
const NODE_STYLES: Record<string, string> = {
  decision: 'fill:#e1f5fe,stroke:#0288d1',
  artifact: 'fill:#f3e5f5,stroke:#7b1fa2',
  learning: 'fill:#fff3e0,stroke:#f57c00',
  hub: 'fill:#e8f5e9,stroke:#388e3c,stroke-width:3px',
  session: 'fill:#fce4ec,stroke:#c2185b',
};

/**
 * Escape text for Mermaid labels
 */
function escapeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Get node shape for type
 */
function getNodeShape(type: string): { open: string; close: string } {
  return NODE_SHAPES[type] || NODE_SHAPES.default;
}

/**
 * Generate node ID for Mermaid (sanitise special characters)
 */
function sanitiseId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Generate Mermaid node definition
 */
function generateNode(node: GraphNode, options: MermaidOptions): string {
  const id = sanitiseId(node.id);
  const shape = getNodeShape(node.type);

  let label = escapeLabel(node.id);
  if (options.showType) {
    label = `${node.type}: ${label}`;
  }

  return `  ${id}${shape.open}"${label}"${shape.close}`;
}

/**
 * Generate Mermaid edge definition
 */
function generateEdge(
  source: string,
  target: string,
  label?: string
): string {
  const srcId = sanitiseId(source);
  const tgtId = sanitiseId(target);

  if (label) {
    return `  ${srcId} -->|${escapeLabel(label)}| ${tgtId}`;
  }
  return `  ${srcId} --> ${tgtId}`;
}

/**
 * Generate style definitions
 */
function generateStyles(graph: MemoryGraph): string[] {
  const styles: string[] = [];
  const typesSeen = new Set<string>();

  for (const node of graph.nodes) {
    if (!typesSeen.has(node.type) && NODE_STYLES[node.type]) {
      typesSeen.add(node.type);
    }
  }

  // Generate class definitions
  for (const type of typesSeen) {
    styles.push(`  classDef ${type} ${NODE_STYLES[type]}`);
  }

  // Apply classes to nodes
  for (const type of typesSeen) {
    const nodesOfType = graph.nodes
      .filter(n => n.type === type)
      .map(n => sanitiseId(n.id));

    if (nodesOfType.length > 0) {
      styles.push(`  class ${nodesOfType.join(',')} ${type}`);
    }
  }

  return styles;
}

/**
 * Generate Mermaid flowchart from graph
 */
export function generateMermaid(
  graph: MemoryGraph,
  options: MermaidOptions = {}
): string {
  const { direction = 'TB', fromNode, depth, filterType, showType = false } = options;

  // Extract subgraph if starting node specified
  let workingGraph = graph;
  if (fromNode && depth !== undefined) {
    workingGraph = getSubgraph(graph, fromNode, depth);
  }

  // Filter by type if specified
  if (filterType) {
    const filteredNodes = workingGraph.nodes.filter(n => n.type === filterType);
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    workingGraph = {
      ...workingGraph,
      nodes: filteredNodes,
      edges: workingGraph.edges.filter(e =>
        filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
      ),
    };
  }

  const lines: string[] = [];

  // Header
  lines.push(`flowchart ${direction}`);

  // Nodes
  for (const node of workingGraph.nodes) {
    lines.push(generateNode(node, { showType }));
  }

  // Edges
  for (const edge of workingGraph.edges) {
    lines.push(generateEdge(edge.source, edge.target, edge.label));
  }

  // Styles
  const styles = generateStyles(workingGraph);
  if (styles.length > 0) {
    lines.push('');
    lines.push(...styles);
  }

  return lines.join('\n');
}

/**
 * Generate simple text representation of graph
 */
export function generateTextGraph(graph: MemoryGraph): string {
  const lines: string[] = [];

  lines.push(`Nodes: ${graph.nodes.length}`);
  lines.push(`Edges: ${graph.edges.length}`);
  lines.push('');

  for (const node of graph.nodes) {
    lines.push(`[${node.type}] ${node.id}`);
  }

  lines.push('');

  for (const edge of graph.edges) {
    lines.push(`${edge.source} --${edge.label}--> ${edge.target}`);
  }

  return lines.join('\n');
}

/**
 * Generate DOT format (Graphviz) from graph
 */
export function generateDot(graph: MemoryGraph): string {
  const lines: string[] = [];

  lines.push('digraph MemoryGraph {');
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box];');
  lines.push('');

  for (const node of graph.nodes) {
    const label = escapeLabel(node.id);
    lines.push(`  "${node.id}" [label="${label}"];`);
  }

  lines.push('');

  for (const edge of graph.edges) {
    const label = edge.label ? ` [label="${escapeLabel(edge.label)}"]` : '';
    lines.push(`  "${edge.source}" -> "${edge.target}"${label};`);
  }

  lines.push('}');

  return lines.join('\n');
}
