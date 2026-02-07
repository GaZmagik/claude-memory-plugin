/**
 * CLI Commands: Graph Operations
 *
 * Handlers for link, unlink, edges, graph, mermaid, remove-node commands.
 */

import * as path from 'node:path';
import type { ParsedArgs } from '../parser.js';
import { getFlagString, getFlagBool } from '../parser.js';
import type { CliResponse } from '../response.js';
import { error, wrapOperation } from '../response.js';
import { linkMemories, unlinkMemories } from '../../graph/link.js';
import { loadGraph, saveGraph, removeNode } from '../../graph/structure.js';
import { getInboundEdges, getOutboundEdges } from '../../graph/edges.js';
import { generateMermaid } from '../../graph/mermaid.js';
import { getResolvedScopePath, parseScope, resolveAgentScopePath, resolveSharedScopePaths } from '../helpers.js';

/**
 * link - Create a relationship between memories
 *
 * Usage: memory link <from> <to> [--relation <type>] [--scope <scope>] [--agent <name>] [--target-agent <name>]
 *
 * Cross-scope scenarios:
 *   --agent only:         source in agent scope, target in project scope
 *   --target-agent only:  source in project scope, target in agent scope
 *   --agent + --target-agent: source in agent scope, target in different agent scope
 */
export async function cmdLink(args: ParsedArgs): Promise<CliResponse> {
  const source = args.positional[0];
  const target = args.positional[1];

  if (!source || !target) {
    return error('Missing required arguments: <from> <to>');
  }

  const agentName = getFlagString(args.flags, 'agent');
  const targetAgentName = getFlagString(args.flags, 'target-agent');
  const scopeStr = getFlagString(args.flags, 'scope');
  const relation = getFlagString(args.flags, 'relation');

  // Detect cross-scope: --agent XOR --target-agent, or both with different values
  const isCrossScope = (agentName && !targetAgentName) ||
    (!agentName && targetAgentName) ||
    (agentName && targetAgentName && agentName !== targetAgentName);

  if (isCrossScope) {
    // Resolve source base path
    const sourceBasePath = agentName
      ? resolveAgentScopePath(agentName, scopeStr)
      : getResolvedScopePath(parseScope(scopeStr));

    // Resolve target base path
    const targetBasePath = targetAgentName
      ? resolveAgentScopePath(targetAgentName, scopeStr)
      : getResolvedScopePath(parseScope(scopeStr));

    const sourceScope = agentName ? 'agent-project' : 'project';
    const targetScope = targetAgentName ? 'agent-project' : 'project';

    return wrapOperation(
      async () => {
        const result = await linkMemories({
          source,
          target,
          relation,
          basePath: sourceBasePath,
          agent: agentName,
          targetAgent: targetAgentName,
          targetBasePath,
          sourceScope,
          targetScope,
          sourceAgent: agentName,
        });
        return result;
      },
      `Linked ${source} -> ${target} (cross-scope)`
    );
  }

  // Same-scope linking (existing behaviour)
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  return wrapOperation(
    async () => {
      const result = await linkMemories({ source, target, relation, basePath, agent: agentName });
      return result;
    },
    `Linked ${source} -> ${target}`
  );
}

/**
 * unlink - Remove a relationship between memories
 *
 * Usage: memory unlink <from> <to> [--scope <scope>] [--agent <name>] [--target-agent <name>]
 */
export async function cmdUnlink(args: ParsedArgs): Promise<CliResponse> {
  const source = args.positional[0];
  const target = args.positional[1];

  if (!source || !target) {
    return error('Missing required arguments: <from> <to>');
  }

  const agentName = getFlagString(args.flags, 'agent');
  const targetAgentName = getFlagString(args.flags, 'target-agent');
  const scopeStr = getFlagString(args.flags, 'scope');

  // Detect cross-scope
  const isCrossScope = (agentName && !targetAgentName) ||
    (!agentName && targetAgentName) ||
    (agentName && targetAgentName && agentName !== targetAgentName);

  if (isCrossScope) {
    const sourceBasePath = agentName
      ? resolveAgentScopePath(agentName, scopeStr)
      : getResolvedScopePath(parseScope(scopeStr));

    const targetBasePath = targetAgentName
      ? resolveAgentScopePath(targetAgentName, scopeStr)
      : getResolvedScopePath(parseScope(scopeStr));

    return wrapOperation(
      async () => {
        const result = await unlinkMemories({
          source,
          target,
          basePath: sourceBasePath,
          agent: agentName,
          targetAgent: targetAgentName,
          targetBasePath,
        });
        return result;
      },
      `Unlinked ${source} -> ${target} (cross-scope)`
    );
  }

  // Same-scope unlinking (existing behaviour)
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  return wrapOperation(
    async () => {
      const result = await unlinkMemories({ source, target, basePath, agent: agentName });
      return result;
    },
    `Unlinked ${source} -> ${target}`
  );
}

/**
 * edges - Show inbound and outbound edges for a node
 *
 * Usage: memory edges <id> [--scope <scope>]
 */
export async function cmdEdges(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const graph = await loadGraph(basePath);
      const inbound = getInboundEdges(graph, id);
      const outbound = getOutboundEdges(graph, id);
      return {
        id,
        inbound: inbound.map(e => ({ source: e.source, label: e.label })),
        outbound: outbound.map(e => ({ target: e.target, label: e.label })),
        totalInbound: inbound.length,
        totalOutbound: outbound.length,
      };
    },
    `Edges for ${id}`
  );
}

/**
 * graph - Output the memory graph as JSON
 *
 * Usage: memory graph [scope]
 */
export async function cmdGraph(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scope = parseScope(scopeArg ?? getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const graph = await loadGraph(basePath);
      return graph;
    },
    'Graph loaded'
  );
}

/**
 * mermaid - Generate Mermaid diagram of memory graph
 *
 * Usage: memory mermaid [scope] [--all] [--hub <id>] [--depth <n>] [--direction <TB|LR>] [--output <path>] [--agent <name>] [--include-shared]
 *
 * Options:
 *   --all            Show full graph (default: hub-focused view)
 *   --hub <id>       Filter to specific hub and its connections
 *   --depth <n>      Connection depth for hub views (default: 1)
 *   --direction      Layout direction: TB, TD, LR, RL (default: TB)
 *   --output <path>  Output file path (default: .claude/memory/graph.md)
 *   --show-type      Include node type in labels
 *   --agent <name>   Filter to specific agent's memories
 *   --include-shared Include shared memories (requires --agent)
 */
export async function cmdMermaid(args: ParsedArgs): Promise<CliResponse> {
  const scopeArg = args.positional[0];
  const scopeStr = scopeArg ?? getFlagString(args.flags, 'scope');

  // Parse agent flag
  const agentName = getFlagString(args.flags, 'agent');
  const includeShared = getFlagBool(args.flags, 'include-shared');

  // Validate --include-shared requires --agent
  if (includeShared && !agentName) {
    return { status: 'error', error: 'Error: --include-shared requires --agent flag' };
  }

  // Determine base path based on agent context
  const basePath = agentName
    ? resolveAgentScopePath(agentName, scopeStr)
    : getResolvedScopePath(parseScope(scopeStr));

  // Parse flags
  const directionRaw = getFlagString(args.flags, 'direction') ?? 'TB';
  const direction = directionRaw.toUpperCase().replace('TD', 'TB') as 'TB' | 'BT' | 'LR' | 'RL';
  const showType = getFlagBool(args.flags, 'show-type');
  const showAll = getFlagBool(args.flags, 'all');
  const hubId = getFlagString(args.flags, 'hub');
  const depthStr = getFlagString(args.flags, 'depth');
  const depth = depthStr ? parseInt(depthStr, 10) : 1;
  const outputPath = getFlagString(args.flags, 'output');

  // Validate direction
  if (!['TB', 'BT', 'LR', 'RL'].includes(direction)) {
    return { status: 'error', error: 'Invalid direction. Use TB, TD, BT, LR, or RL' };
  }

  return wrapOperation(
    async () => {
      let graph = await loadGraph(basePath);

      // When --include-shared, merge project/local graphs into the agent graph
      if (includeShared && agentName) {
        const sharedPaths = resolveSharedScopePaths(agentName, scopeStr);
        // sharedPaths[0] is the agent path (already loaded), rest are shared scopes
        for (const sharedPath of sharedPaths.slice(1)) {
          if (sharedPath !== basePath) {
            const sharedGraph = await loadGraph(sharedPath);
            const existingNodeIds = new Set(graph.nodes.map(n => n.id));
            const mergedNodes = [
              ...graph.nodes,
              ...sharedGraph.nodes.filter(n => !existingNodeIds.has(n.id)),
            ];
            const mergedNodeIds = new Set(mergedNodes.map(n => n.id));
            const existingEdgeKeys = new Set(
              graph.edges.map(e => `${e.source}->${e.target}`)
            );
            const mergedEdges = [
              ...graph.edges,
              ...sharedGraph.edges.filter(e =>
                !existingEdgeKeys.has(`${e.source}->${e.target}`) &&
                mergedNodeIds.has(e.source) && mergedNodeIds.has(e.target)
              ),
            ];
            graph = { ...graph, nodes: mergedNodes, edges: mergedEdges };
          }
        }
      }

      // Generate mermaid with new options
      const showAgentNames = getFlagBool(args.flags, 'show-agent-names');
      const filterLinked = getFlagBool(args.flags, 'filter-linked');
      const showScope = getFlagBool(args.flags, 'show-scope');
      const legend = getFlagBool(args.flags, 'legend');
      // abbreviateLabels defaults to true; only disable if --abbreviate false explicitly
      const abbreviateLabels = args.flags['abbreviate'] === false || args.flags['abbreviate'] === 'false'
        ? false
        : true;
      const mermaidContent = generateMermaid(graph, {
        direction,
        showType,
        showAll,
        fromNode: hubId,
        depth,
        abbreviateLabels,
        agent: agentName,
        includeShared,
        filterLinked,
        includeAgentNames: showAgentNames,
        showScope,
        legend,
      });

      // Wrap in markdown code fence
      const markdownOutput = `\`\`\`mermaid\n${mermaidContent}\n\`\`\`\n`;

      // Determine output path
      const finalPath = outputPath
        ? (outputPath.endsWith('.md') ? outputPath : `${outputPath}.md`)
        : path.join(basePath, 'graph.md');

      // Write to file (ensure directory exists)
      const fs = await import('node:fs');
      const outputDir = path.dirname(finalPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(finalPath, markdownOutput);

      return {
        diagram: markdownOutput,
        saved: finalPath,
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        filtered: !showAll,
      };
    },
    `Mermaid diagram saved`
  );
}

/**
 * remove-node - Remove a node from the graph (keeps file on disk)
 *
 * Usage: memory remove-node <id> [--scope <scope>]
 */
export async function cmdRemoveNode(args: ParsedArgs): Promise<CliResponse> {
  const id = args.positional[0];

  if (!id) {
    return error('Missing required argument: id');
  }

  const scope = parseScope(getFlagString(args.flags, 'scope'));
  const basePath = getResolvedScopePath(scope);

  return wrapOperation(
    async () => {
      const graph = await loadGraph(basePath);
      const updatedGraph = removeNode(graph, id);
      await saveGraph(basePath, updatedGraph);
      return {
        removed: id,
        remainingNodes: updatedGraph.nodes.length,
        remainingEdges: updatedGraph.edges.length,
      };
    },
    `Removed node ${id} from graph`
  );
}
