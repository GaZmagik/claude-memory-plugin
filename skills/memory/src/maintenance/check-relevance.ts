/**
 * Check Relevance — Scope optimisation analysis
 *
 * Scans memories and suggests scope optimisations using multi-factor scoring.
 * Four pure scoring functions produce a 0–100 relevance score for the current scope.
 * High score (≥80) = well-placed. Low score (<40) = migration candidate.
 */

import { loadIndex } from '../core/index.js';
import { loadGraph } from '../graph/structure.js';
import { getInboundEdges, getOutboundEdges } from '../graph/edges.js';
import { moveMemory } from './move.js';
import { getScopePath } from '../scope/resolver.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { MemoryGraph } from '../graph/structure.js';

// ============================================================================
// Public types
// ============================================================================

export type ConfidenceBand = 'High' | 'Medium' | 'Low' | 'None';

export interface RelevanceScore {
  id: string;
  currentScope: string;
  suggestedScope?: string;
  totalScore: number;
  confidenceBand: ConfidenceBand;
  components: {
    typeMatch: number;
    tagHeuristics: number;
    graphConnectivity: number;
    contentAnalysis: number;
  };
}

export interface CheckRelevanceOptions {
  basePath: string;
  pattern?: string;
  typeFilter?: MemoryType;
  tagFilter?: string[];
  agentFilter?: string;
  /** Auto-move threshold: move memories scoring below this value (default: 40) */
  threshold?: number;
  autoMove?: boolean;
  confirm?: boolean;
  dryRun?: boolean;
  format?: 'table' | 'json' | 'detailed';
}

export interface CheckRelevanceResult {
  results: RelevanceScore[];
  movedCount?: number;
  dryRun?: boolean;
}

// ============================================================================
// Scoring tables
// ============================================================================

const TYPE_SCOPE_SCORES: Record<string, Partial<Record<string, number>>> = {
  [MemoryType.Decision]: {
    [Scope.Project]: 30,
    [Scope.Local]: 30,
  },
  [MemoryType.Learning]: {
    [Scope.Global]: 30,
    [Scope.AgentGlobal]: 30,
    [Scope.AgentProject]: 30,
    [Scope.Project]: 10,
  },
  [MemoryType.Artifact]: {
    [Scope.Project]: 30,
    [Scope.Global]: 30,
    [Scope.AgentProject]: 30,
    [Scope.Local]: 15,
  },
  [MemoryType.Gotcha]: {
    [Scope.Global]: 30,
    [Scope.AgentProject]: 30,
    [Scope.AgentGlobal]: 30,
    [Scope.Project]: 15,
  },
  [MemoryType.Hub]: {
    [Scope.Project]: 20,
    [Scope.Global]: 20,
  },
  [MemoryType.Breadcrumb]: {},
};

const PROJECT_TAGS = new Set([
  'project-specific', 'architecture', 'team-convention', 'codebase',
  'local', 'project', 'repo', 'monorepo',
]);
const GLOBAL_TAGS = new Set([
  'global-pattern', 'best-practice', 'cross-project', 'general',
  'universal', 'principle', 'best-practices',
]);
const AGENT_TAGS = new Set(['agent-specific', 'agent-knowledge', 'agent-pattern']);

const PROJECT_CONTENT_SIGNALS = [
  'this project', 'this codebase', 'src/', 'package.json',
  'tsconfig', 'node_modules', 'our project', 'this repo',
];
const GLOBAL_CONTENT_SIGNALS = [
  'generally', 'in any', 'across projects', 'best practice',
  'universal pattern', 'abstract principle',
];

// ============================================================================
// Pure scoring functions (T044–T048)
// ============================================================================

/**
 * Score how well a memory type matches a scope. Returns 0–30.
 */
export function scoreTypeMatch(type: MemoryType, scope: string): number {
  return TYPE_SCOPE_SCORES[type]?.[scope] ?? 0;
}

/**
 * Score how well a memory's tags suggest its current scope. Returns 0–25.
 */
export function scoreTagHeuristics(tags: string[], scope: string): number {
  if (tags.length === 0) return 0;

  const currentSet = isProjectLike(scope) ? PROJECT_TAGS
    : isGlobalLike(scope) ? GLOBAL_TAGS
    : AGENT_TAGS;
  const otherSet = isProjectLike(scope) ? GLOBAL_TAGS : PROJECT_TAGS;

  const matchCurrent = tags.filter(t => currentSet.has(t)).length;
  const matchOther = tags.filter(t => otherSet.has(t)).length;

  if (matchCurrent === 0) return 0;
  if (matchOther === 0) return 25;
  return Math.round(25 * matchCurrent / (matchCurrent + matchOther));
}

/**
 * Score how well a memory's graph connections fit its scope. Returns 0–25.
 * Returns 0 when the memory has no edges (no connectivity signal).
 */
export function scoreGraphConnectivity(
  memoryId: string,
  graph: MemoryGraph,
  scope: string
): number {
  const inbound = getInboundEdges(graph, memoryId);
  const outbound = getOutboundEdges(graph, memoryId);
  const connected = [
    ...inbound.map(e => e.source),
    ...outbound.map(e => e.target),
  ];

  if (connected.length === 0) return 0;

  const sameScope = connected.filter(nodeId => {
    const node = graph.nodes.find(n => n.id === nodeId);
    return node?.scope === scope;
  }).length;

  return Math.round(25 * sameScope / connected.length);
}

/**
 * Score how well a memory's content signals its current scope. Returns 0–20.
 * Pure function — performs no file I/O.
 */
export function scoreContentAnalysis(content: string, scope: string): number {
  const lower = content.toLowerCase();

  const currentSignals = isProjectLike(scope)
    ? PROJECT_CONTENT_SIGNALS
    : GLOBAL_CONTENT_SIGNALS;
  const otherSignals = isProjectLike(scope)
    ? GLOBAL_CONTENT_SIGNALS
    : PROJECT_CONTENT_SIGNALS;

  const matchCurrent = currentSignals.filter(s => lower.includes(s)).length;
  const matchOther = otherSignals.filter(s => lower.includes(s)).length;

  if (matchCurrent === 0) return 0;
  if (matchOther === 0) return 20;
  return Math.round(20 * matchCurrent / (matchCurrent + matchOther));
}

/**
 * Classify a total score into a confidence band.
 * ≥80 → High, 60–79 → Medium, 40–59 → Low, <40 → None.
 */
export function classifyConfidenceBand(score: number): ConfidenceBand {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  if (score >= 40) return 'Low';
  return 'None';
}

// ============================================================================
// Internal helpers
// ============================================================================

function isProjectLike(scope: string): boolean {
  return scope === Scope.Project || scope === Scope.Local || scope === Scope.Enterprise;
}

function isGlobalLike(scope: string): boolean {
  return scope === Scope.Global || scope === Scope.AgentGlobal;
}

function suggestBestScope(type: MemoryType, currentScope: string): string | undefined {
  const affinities = TYPE_SCOPE_SCORES[type];
  if (!affinities) return undefined;
  let bestScope: string | undefined;
  let bestScore = 0;
  for (const [scope, score] of Object.entries(affinities)) {
    if (scope !== currentScope && (score ?? 0) > bestScore) {
      bestScore = score ?? 0;
      bestScope = scope;
    }
  }
  return bestScope;
}

// ============================================================================
// Orchestrator (T049, T052)
// ============================================================================

/**
 * Analyse memories in a scope for relevance and optionally move misplaced ones.
 * Memories scoring below `threshold` (default: 40) are migration candidates.
 */
export async function checkRelevance(
  options: CheckRelevanceOptions
): Promise<CheckRelevanceResult> {
  const {
    basePath,
    autoMove = false,
    confirm = false,
    dryRun = false,
    threshold = 40,
    typeFilter,
    agentFilter,
    format,
  } = options;

  if (autoMove && !confirm) {
    throw new Error(
      '--auto-move requires --confirm to prevent accidental scope changes. ' +
      'Re-run with --confirm to proceed.'
    );
  }

  const [index, graph] = await Promise.all([
    loadIndex({ basePath }),
    loadGraph(basePath),
  ]);

  let entries = index.memories;
  if (typeFilter) entries = entries.filter(e => e.type === typeFilter);
  if (agentFilter) entries = entries.filter(e => e.agent === agentFilter);

  const results: RelevanceScore[] = [];

  for (const entry of entries) {
    const currentScope = (entry.scope as string) ?? Scope.Project;
    const typeScore = scoreTypeMatch(entry.type, currentScope);
    const tagScore = scoreTagHeuristics(entry.tags, currentScope);
    const connectivityScore = scoreGraphConnectivity(entry.id as string, graph, currentScope);
    // Content analysis only loaded for --format detailed (performance constraint SC-004)
    const contentScore = format === 'detailed'
      ? scoreContentAnalysis('', currentScope) // placeholder — real impl reads file
      : 0;

    const total = typeScore + tagScore + connectivityScore + contentScore;
    const band = classifyConfidenceBand(total);
    const suggestedScope = total < threshold
      ? suggestBestScope(entry.type, currentScope)
      : undefined;

    results.push({
      id: entry.id as string,
      currentScope,
      suggestedScope,
      totalScore: total,
      confidenceBand: band,
      components: {
        typeMatch: typeScore,
        tagHeuristics: tagScore,
        graphConnectivity: connectivityScore,
        contentAnalysis: contentScore,
      },
    });
  }

  let movedCount = 0;
  if (autoMove && confirm && !dryRun) {
    const globalPath = getScopePath(Scope.Global, process.cwd(), '');
    for (const result of results) {
      if (result.totalScore < threshold && result.suggestedScope) {
        const targetScope = result.suggestedScope as Scope;
        const targetBasePath = getScopePath(targetScope, process.cwd(), globalPath);
        await moveMemory({
          id: result.id,
          sourceBasePath: basePath,
          targetBasePath,
          targetScope,
        });
        movedCount++;
      }
    }
  }

  return {
    results,
    movedCount: autoMove ? movedCount : undefined,
    dryRun: dryRun ? true : undefined,
  };
}

// ============================================================================
// Formatters (T050–T051)
// ============================================================================

const MIN_WIDTH = 80;

function col(s: string, w: number): string {
  return s.substring(0, w).padEnd(w);
}

/**
 * Format results as a human-readable table (minimum 80 columns wide).
 */
export function formatTable(results: RelevanceScore[]): string {
  const hr = '─'.repeat(MIN_WIDTH);
  const header = `  ${'Memory ID'.padEnd(28)} ${'Scope'.padEnd(14)} ${'Score'.padStart(5)}  ${'Band'.padEnd(8)}  ${'Suggestion'.padEnd(18)}`;

  const rows = results.map(r => {
    const suggested = r.suggestedScope ? `→ ${r.suggestedScope}` : '';
    return `  ${col(r.id, 28)} ${col(r.currentScope, 14)} ${String(r.totalScore).padStart(5)}  ${col(r.confidenceBand, 8)}  ${col(suggested, 18)}`;
  });

  return [hr, 'Memory Relevance Report'.padEnd(MIN_WIDTH), hr, header, hr, ...rows, hr].join('\n');
}

/**
 * Format results as valid JSON.
 */
export function formatJson(results: RelevanceScore[]): string {
  return JSON.stringify(results, null, 2);
}
