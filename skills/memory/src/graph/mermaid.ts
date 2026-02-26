/**
 * T072: Mermaid Diagram Generation
 *
 * Generate Mermaid flowchart diagrams from memory graphs.
 */

import type { MemoryGraph, GraphNode } from './structure.js';
import { MemoryType, Scope } from '../types/enums.js';

/**
 * Mermaid generation options
 */
export interface MermaidOptions {
  /** Graph direction: TB (top-bottom), LR (left-right), etc. */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  /** Starting node for subgraph extraction (hub mode) */
  fromNode?: string;
  /** Maximum depth from starting node */
  depth?: number;
  /** Filter by node type */
  filterType?: MemoryType;
  /** Filter by tag (requires node metadata) */
  filterTag?: string;
  /** Include node type in label */
  showType?: boolean;
  /** Show all nodes (default: hub-focused view) */
  showAll?: boolean;
  /** Abbreviate edge labels for compact output (default: true) */
  abbreviateLabels?: boolean;
  /** Filter to specific agent */
  agent?: string;
  /** Include shared (non-agent) memories when filtering by agent */
  includeShared?: boolean;
  /** Only include shared memories that are linked to agent nodes (requires includeShared) */
  filterLinked?: boolean;
  /** Include agent names in node labels */
  includeAgentNames?: boolean;
  /** Show scope indicators on node labels */
  showScope?: boolean;
  /** Show legend subgraph */
  legend?: boolean;
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
  rule: { open: '{{', close: '}}' },         // Hexagon (formal/authoritative)
  reminder: { open: '[(', close: ')]' },     // Cylinder (stored knowledge)
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
  rule: 'fill:#fff8e1,stroke:#f57f17',
  reminder: 'fill:#e0f7fa,stroke:#00838f',
  agentNode: 'fill:#e3f2fd,stroke:#1976d2,stroke-width:2px',
  agentNodeProject: 'fill:#e3f2fd,stroke:#1976d2,stroke-width:2px',
  agentNodeGlobal: 'fill:#bbdefb,stroke:#0d47a1,stroke-width:2px',
};

/**
 * Edge label abbreviations for compact mermaid output
 */
const EDGE_LABEL_ABBREVIATIONS: Record<string, string> = {
  'documents': 'doc',
  'relates-to': 'rel',
  'supersedes': 'sup',
  'depends-on': 'dep',
  'extends': 'ext',
  'implements': 'impl',
  'references': 'ref',
  'blocks': 'blk',
  'enables': 'enb',
  'validates': 'val',
  'contradicts': 'con',
  'derives-from': 'der',
  'parent-of': 'par',
  'child-of': 'chi',
  'informs': 'inf',
  'motivated-by': 'mot',
};

/**
 * Abbreviate edge label for compact output
 */
function abbreviateLabel(label: string | undefined): string {
  if (!label) return 'rel';
  return EDGE_LABEL_ABBREVIATIONS[label] || label.slice(0, 3);
}

/**
 * BFS traversal in both directions (bidirectional) from a starting node
 * Returns all node IDs reachable within maxDepth steps
 */
function getNodesAtDepth(
  graph: MemoryGraph,
  startId: string,
  maxDepth: number
): Set<string> {
  const visited = new Set<string>([startId]);
  let frontier = [startId];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const nextFrontier: string[] = [];
    for (const nodeId of frontier) {
      for (const edge of graph.edges) {
        // Follow edges in both directions
        if (edge.source === nodeId && !visited.has(edge.target)) {
          visited.add(edge.target);
          nextFrontier.push(edge.target);
        }
        if (edge.target === nodeId && !visited.has(edge.source)) {
          visited.add(edge.source);
          nextFrontier.push(edge.source);
        }
      }
    }
    frontier = nextFrontier;
  }

  return visited;
}

/**
 * Get all hub nodes (nodes with MemoryType.Hub)
 */
function getHubNodes(graph: MemoryGraph): GraphNode[] {
  return graph.nodes.filter(n => n.type === MemoryType.Hub);
}

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
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;'); // B3: Escape backticks for Mermaid
}

/**
 * Get node shape for type
 */
function getNodeShape(type: string): { open: string; close: string } {
  const shape = NODE_SHAPES[type];
  if (shape) {
    return shape;
  }
  return NODE_SHAPES.default!;
}

/**
 * Generate node ID for Mermaid (sanitise special characters)
 */
function sanitiseId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Abbreviate agent name for compact display
 */
function abbreviateAgentName(agentName: string): string {
  return agentName
    .split('-')
    .map(part => part.slice(0, Math.min(part.length, part.length <= 3 ? part.length : Math.max(2, 4))))
    .join('-');
}

/**
 * Check if node is agent-scoped
 */
function isAgentNode(node: GraphNode): boolean {
  return node.scope === Scope.AgentProject || node.scope === Scope.AgentGlobal;
}

/**
 * Generate Mermaid node definition
 */
function generateNode(node: GraphNode, options: MermaidOptions): string {
  const id = sanitiseId(node.id);

  // Prioritise external types over agent scope
  const isExternalType = node.type === MemoryType.Rule || node.type === MemoryType.Reminder;
  const shape = isExternalType
    ? getNodeShape(node.type)  // Use type-specific shape (hexagon/cylinder)
    : isAgentNode(node)
      ? { open: '[[', close: ']]' }
      : getNodeShape(node.type);

  let label = escapeLabel(node.id);

  // Add agent name to label if requested
  if (options.includeAgentNames && node.agent) {
    const agentLabel = options.abbreviateLabels
      ? abbreviateAgentName(node.agent)
      : node.agent;
    label = `${agentLabel}: ${label}`;
  }

  if (options.showType) {
    label = `${node.type}: ${label}`;
  }

  // Add scope indicator if requested
  if (options.showScope) {
    const scopeLabel = node.agent
      ? `[agent:${node.agent}]`
      : node.scope === Scope.Global || node.scope === Scope.AgentGlobal
        ? '[global]'
        : '[project]';
    label = `${label} ${scopeLabel}`;
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
  const hasAgentNodes = graph.nodes.some(n => isAgentNode(n));
  const hasAgentProject = graph.nodes.some(n => n.scope === Scope.AgentProject);
  const hasAgentGlobal = graph.nodes.some(n => n.scope === Scope.AgentGlobal);

  for (const node of graph.nodes) {
    if (!typesSeen.has(node.type) && NODE_STYLES[node.type]) {
      typesSeen.add(node.type);
    }
  }

  // Generate class definitions for standard types
  for (const type of typesSeen) {
    styles.push(`  classDef ${type} ${NODE_STYLES[type]}`);
  }

  // Generate agent node class definitions
  if (hasAgentNodes) {
    styles.push(`  classDef agentNode ${NODE_STYLES.agentNode}`);
  }
  if (hasAgentProject) {
    styles.push(`  classDef agentNodeProject ${NODE_STYLES.agentNodeProject}`);
  }
  if (hasAgentGlobal) {
    styles.push(`  classDef agentNodeGlobal ${NODE_STYLES.agentNodeGlobal}`);
  }

  // Apply classes to nodes
  for (const type of typesSeen) {
    const nodesOfType = graph.nodes
      .filter(n => n.type === type && !isAgentNode(n))
      .map(n => sanitiseId(n.id));

    if (nodesOfType.length > 0) {
      styles.push(`  class ${nodesOfType.join(',')} ${type}`);
    }
  }

  // Apply agent node classes
  const agentProjectNodes = graph.nodes
    .filter(n => n.scope === Scope.AgentProject)
    .map(n => sanitiseId(n.id));
  if (agentProjectNodes.length > 0) {
    styles.push(`  class ${agentProjectNodes.join(',')} agentNodeProject`);
  }

  const agentGlobalNodes = graph.nodes
    .filter(n => n.scope === Scope.AgentGlobal)
    .map(n => sanitiseId(n.id));
  if (agentGlobalNodes.length > 0) {
    styles.push(`  class ${agentGlobalNodes.join(',')} agentNodeGlobal`);
  }

  // Also apply general agentNode class to all agent nodes
  const allAgentNodes = graph.nodes
    .filter(n => isAgentNode(n))
    .map(n => sanitiseId(n.id));
  if (allAgentNodes.length > 0) {
    styles.push(`  class ${allAgentNodes.join(',')} agentNode`);
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
  const {
    direction = 'TB',
    fromNode,
    depth = 1,
    filterType,
    showType = false,
    showAll = false,
    abbreviateLabels = true,
    agent,
    includeShared = false,
    filterLinked = false,
    includeAgentNames = false,
    showScope = false,
    legend = false,
  } = options;

  let workingGraph = graph;

  // Filtering logic: hub-focused by default
  if (fromNode) {
    // Single hub mode: show hub + connections at specified depth (bidirectional)
    const reachable = getNodesAtDepth(graph, fromNode, depth);
    workingGraph = {
      ...graph,
      nodes: graph.nodes.filter(n => reachable.has(n.id)),
      edges: graph.edges.filter(e => reachable.has(e.source) && reachable.has(e.target)),
    };
  } else if (!showAll) {
    // Default: hub-focused view (all hubs + depth-1 connections)
    const hubs = getHubNodes(graph);
    if (hubs.length > 0) {
      const reachable = new Set<string>(hubs.map(h => h.id));
      for (const hub of hubs) {
        for (const nodeId of getNodesAtDepth(graph, hub.id, 1)) {
          reachable.add(nodeId);
        }
      }
      workingGraph = {
        ...graph,
        nodes: graph.nodes.filter(n => reachable.has(n.id)),
        edges: graph.edges.filter(e => reachable.has(e.source) && reachable.has(e.target)),
      };
    }
    // If no hubs, fall through to show all (showAll behaviour)
  }

  // Filter by agent if specified
  if (agent) {
    let filteredNodes = workingGraph.nodes.filter(n => n.agent === agent);

    // Include shared (non-agent) memories if requested
    if (includeShared) {
      const agentNodeIds = new Set(filteredNodes.map(n => n.id));
      const sharedNodes = workingGraph.nodes.filter(n => !isAgentNode(n));

      if (filterLinked) {
        // Only include shared nodes connected to agent nodes
        const connectedSharedIds = new Set<string>();
        for (const edge of workingGraph.edges) {
          if (agentNodeIds.has(edge.source)) {
            const targetNode = workingGraph.nodes.find(n => n.id === edge.target);
            if (targetNode && !isAgentNode(targetNode)) {
              connectedSharedIds.add(edge.target);
            }
          }
          if (agentNodeIds.has(edge.target)) {
            const sourceNode = workingGraph.nodes.find(n => n.id === edge.source);
            if (sourceNode && !isAgentNode(sourceNode)) {
              connectedSharedIds.add(edge.source);
            }
          }
        }
        const connectedShared = sharedNodes.filter(n => connectedSharedIds.has(n.id));
        filteredNodes = [...filteredNodes, ...connectedShared];
      } else {
        // Include ALL shared nodes
        filteredNodes = [...filteredNodes, ...sharedNodes];
      }
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    workingGraph = {
      ...workingGraph,
      nodes: filteredNodes,
      edges: workingGraph.edges.filter(e =>
        filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
      ),
    };
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
    lines.push(generateNode(node, { showType, includeAgentNames, abbreviateLabels, showScope }));
  }

  // Edges
  for (const edge of workingGraph.edges) {
    const label = abbreviateLabels ? abbreviateLabel(edge.label) : edge.label;
    lines.push(generateEdge(edge.source, edge.target, label));
  }

  // Styles
  const styles = generateStyles(workingGraph);
  if (styles.length > 0) {
    lines.push('');
    lines.push(...styles);
  }

  // Legend subgraph
  if (legend) {
    lines.push('');
    lines.push('  subgraph Legend');
    lines.push('    direction LR');
    lines.push('    legend_agent[["Agent Scope"]]');
    lines.push('    legend_project["Project Scope"]');
    lines.push('    legend_global["Global Scope"]');
    lines.push('  end');
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
    const sanitisedId = sanitiseId(node.id);
    const label = escapeLabel(node.id);
    lines.push(`  "${sanitisedId}" [label="${label}"];`);
  }

  lines.push('');

  for (const edge of graph.edges) {
    const fromId = sanitiseId(edge.source);
    const toId = sanitiseId(edge.target);
    const label = edge.label ? ` [label="${escapeLabel(edge.label)}"]` : '';
    lines.push(`  "${fromId}" -> "${toId}"${label};`);
  }

  lines.push('}');

  return lines.join('\n');
}
