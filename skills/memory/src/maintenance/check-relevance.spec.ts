/**
 * Tests for check-relevance.ts
 *
 * Covers all four scoring functions, confidence band classification,
 * JSON/table formatting, auto-move behaviour, filtering, and edge cases.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  scoreTypeMatch,
  scoreTagHeuristics,
  scoreGraphConnectivity,
  scoreContentAnalysis,
  classifyConfidenceBand,
  checkRelevance,
  formatTable,
  formatJson,
} from './check-relevance.js';
import type { CheckRelevanceOptions, RelevanceScore } from './check-relevance.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { MemoryGraph } from '../graph/structure.js';
import * as indexModule from '../core/index.js';
import * as structureModule from '../graph/structure.js';
import * as moveModule from './move.js';

// ============================================================================
// C-T1: scoreTypeMatch
// ============================================================================

describe('scoreTypeMatch', () => {
  // T029
  it('returns 30 for a decision in project scope (well-matched)', () => {
    expect(scoreTypeMatch(MemoryType.Decision, Scope.Project)).toBe(30);
  });

  it('returns 0 for a breadcrumb in global scope (type never associated with global)', () => {
    expect(scoreTypeMatch(MemoryType.Breadcrumb, Scope.Global)).toBe(0);
  });

  it('returns 30 for a learning in global scope (well-matched)', () => {
    expect(scoreTypeMatch(MemoryType.Learning, Scope.Global)).toBe(30);
  });

  it('returns 0 for a decision in global scope (type never associated with global)', () => {
    expect(scoreTypeMatch(MemoryType.Decision, Scope.Global)).toBe(0);
  });
});

// ============================================================================
// C-T2: scoreTagHeuristics
// ============================================================================

describe('scoreTagHeuristics', () => {
  // T030
  it('returns 25 for tags strongly suggesting the current scope', () => {
    const score = scoreTagHeuristics(['project-specific', 'architecture'], Scope.Project);
    expect(score).toBe(25);
  });

  it('returns 0 for tags exclusively associated with a different scope', () => {
    const score = scoreTagHeuristics(['global-pattern', 'best-practice'], Scope.Project);
    expect(score).toBe(0);
  });

  it('returns 25 for global-matching tags in global scope', () => {
    const score = scoreTagHeuristics(['best-practice', 'cross-project'], Scope.Global);
    expect(score).toBe(25);
  });

  it('returns 0 for empty tags array', () => {
    const score = scoreTagHeuristics([], Scope.Project);
    expect(score).toBe(0);
  });
});

// ============================================================================
// C-T3: scoreGraphConnectivity
// ============================================================================

describe('scoreGraphConnectivity', () => {
  // T031
  it('returns 25 when all edges connect to memories in the same scope', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'mem-a', type: 'decision', scope: Scope.Project },
        { id: 'mem-b', type: 'artifact', scope: Scope.Project },
        { id: 'mem-c', type: 'learning', scope: Scope.Project },
      ],
      edges: [
        { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
        { source: 'mem-a', target: 'mem-c', label: 'informs' },
      ],
    };
    expect(scoreGraphConnectivity('mem-a', graph, Scope.Project)).toBe(25);
  });

  it('returns 0 when all edges connect to memories in different scopes', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'mem-a', type: 'decision', scope: Scope.Project },
        { id: 'mem-b', type: 'learning', scope: Scope.Global },
        { id: 'mem-c', type: 'gotcha', scope: Scope.Global },
      ],
      edges: [
        { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
        { source: 'mem-a', target: 'mem-c', label: 'informs' },
      ],
    };
    expect(scoreGraphConnectivity('mem-a', graph, Scope.Project)).toBe(0);
  });
});

// ============================================================================
// C-T4: scoreContentAnalysis
// ============================================================================

describe('scoreContentAnalysis', () => {
  // T032
  it('returns 20 for content strongly matching project scope conventions', () => {
    const content = 'In this project we use src/ for all TypeScript files and package.json for deps.';
    expect(scoreContentAnalysis(content, Scope.Project)).toBe(20);
  });

  it('returns 0 for content with no matching signals for the scope', () => {
    const content = 'An abstract principle about software engineering methodology and theory.';
    expect(scoreContentAnalysis(content, Scope.Project)).toBe(0);
  });
});

// ============================================================================
// C-T5: Total score + confidence band boundaries
// ============================================================================

describe('classifyConfidenceBand', () => {
  // T033 — boundary cases
  it('classifies score 80 as High', () => {
    expect(classifyConfidenceBand(80)).toBe('High');
  });

  it('classifies score 79 as Medium', () => {
    expect(classifyConfidenceBand(79)).toBe('Medium');
  });

  it('classifies score 60 as Medium', () => {
    expect(classifyConfidenceBand(60)).toBe('Medium');
  });

  it('classifies score 59 as Low', () => {
    expect(classifyConfidenceBand(59)).toBe('Low');
  });

  it('classifies score 40 as Low', () => {
    expect(classifyConfidenceBand(40)).toBe('Low');
  });

  it('classifies score 39 as None', () => {
    expect(classifyConfidenceBand(39)).toBe('None');
  });

  it('classifies score 100 as High', () => {
    expect(classifyConfidenceBand(100)).toBe('High');
  });

  it('classifies score 0 as None', () => {
    expect(classifyConfidenceBand(0)).toBe('None');
  });
});

// ============================================================================
// C-T6: All-max score → High band
// ============================================================================

describe('scoring — High band memory not migration candidate', () => {
  // T034
  it('memory with all components at maximum returns score ≥ 80 (High band)', () => {
    // decision in project scope with project tags and project content, all same-scope edges
    const typeScore = scoreTypeMatch(MemoryType.Decision, Scope.Project);
    const tagScore = scoreTagHeuristics(['project-specific', 'architecture'], Scope.Project);
    const contentScore = scoreContentAnalysis(
      'In this project we use src/ for all TypeScript files.',
      Scope.Project
    );

    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'mem-x', type: 'decision', scope: Scope.Project },
        { id: 'mem-y', type: 'artifact', scope: Scope.Project },
      ],
      edges: [{ source: 'mem-x', target: 'mem-y', label: 'relates-to' }],
    };
    const connectivityScore = scoreGraphConnectivity('mem-x', graph, Scope.Project);

    const total = typeScore + tagScore + connectivityScore + contentScore;
    expect(total).toBeGreaterThanOrEqual(80);
    expect(classifyConfidenceBand(total)).toBe('High');
  });
});

// ============================================================================
// C-T7: All-zero score → None band with suggested scope
// ============================================================================

describe('scoring — None band memory has suggested scope', () => {
  // T035
  it('memory with all components scoring 0 returns score < 40 and None band', () => {
    // breadcrumb in global scope with cross-project tags — mismatched on all axes
    const typeScore = scoreTypeMatch(MemoryType.Breadcrumb, Scope.Global);
    const tagScore = scoreTagHeuristics(['project-specific', 'architecture'], Scope.Global);
    const contentScore = scoreContentAnalysis(
      'In this project we use src/ for all TypeScript files.',
      Scope.Global
    );

    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'mem-z', type: 'breadcrumb', scope: Scope.Global },
        { id: 'mem-w', type: 'artifact', scope: Scope.Project },
      ],
      edges: [{ source: 'mem-z', target: 'mem-w', label: 'relates-to' }],
    };
    const connectivityScore = scoreGraphConnectivity('mem-z', graph, Scope.Global);

    const total = typeScore + tagScore + connectivityScore + contentScore;
    expect(total).toBeLessThan(40);
    expect(classifyConfidenceBand(total)).toBe('None');
  });
});

// ============================================================================
// C-T8: formatJson — required fields
// ============================================================================

describe('formatJson', () => {
  // T036
  it('produces valid JSON with required fields for each result', () => {
    const results: RelevanceScore[] = [
      {
        id: 'some-memory',
        currentScope: Scope.Global,
        suggestedScope: Scope.Project,
        totalScore: 30,
        confidenceBand: 'None',
        components: {
          typeMatch: 0,
          tagHeuristics: 5,
          graphConnectivity: 0,
          contentAnalysis: 25,
        },
      },
    ];

    const output = formatJson(results);
    const parsed = JSON.parse(output);

    expect(parsed).toBeInstanceOf(Array);
    expect(parsed[0]).toHaveProperty('id', 'some-memory');
    expect(parsed[0]).toHaveProperty('currentScope', Scope.Global);
    expect(parsed[0]).toHaveProperty('suggestedScope', Scope.Project);
    expect(parsed[0]).toHaveProperty('totalScore', 30);
    expect(parsed[0]).toHaveProperty('confidenceBand', 'None');
  });
});

// ============================================================================
// C-T9: --auto-move without --confirm exits non-zero
// ============================================================================

describe('checkRelevance auto-move guard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T037
  it('throws when --auto-move is set without --confirm', async () => {
    const options: CheckRelevanceOptions = {
      basePath: '/fake/path',
      autoMove: true,
      confirm: false,
    };

    await expect(checkRelevance(options)).rejects.toThrow(/--confirm/i);
  });

  it('does not call moveMemory when --auto-move without --confirm', async () => {
    const moveSpy = vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({ status: 'success' } as any);

    await expect(checkRelevance({ basePath: '/fake/path', autoMove: true, confirm: false })).rejects.toThrow();

    expect(moveSpy).not.toHaveBeenCalled();
  });
});

// ============================================================================
// C-T10: --auto-move --confirm moves High-band memories only
// ============================================================================

describe('checkRelevance --auto-move --confirm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T038 — score < 40 (None band) = misplaced = moved; score ≥ 80 (High band) = well-placed = not moved
  it('moves only None-band memories (score < 40) by default', async () => {
    // misplaced-mem: Learning in Project with global tags, no edges → scores ~0 for Project
    // well-placed-mem: Decision in Project with project tags, same-scope edge → scores ~80 for Project
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: 'misplaced-mem' as any,
          type: MemoryType.Learning,
          title: 'Misplaced learning',
          tags: ['global-pattern', 'best-practice'],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Project,
          relativePath: 'misplaced-mem.md',
        },
        {
          id: 'well-placed-mem' as any,
          type: MemoryType.Decision,
          title: 'Well-placed decision',
          tags: ['project-specific', 'architecture'],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Project,
          relativePath: 'well-placed-mem.md',
        },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [
        { id: 'misplaced-mem', type: 'learning', scope: Scope.Project },
        { id: 'well-placed-mem', type: 'decision', scope: Scope.Project },
        { id: 'peer', type: 'artifact', scope: Scope.Project },
      ],
      edges: [
        { source: 'well-placed-mem', target: 'peer', label: 'relates-to' },
      ],
    });

    const moveSpy = vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({
      status: 'success',
      id: 'misplaced-mem',
      changes: {
        fileMoved: true,
        sourceGraphUpdated: true,
        targetGraphUpdated: true,
        sourceIndexUpdated: true,
        targetIndexUpdated: true,
        embeddingsTransferred: false,
      },
    } as any);

    const options: CheckRelevanceOptions = {
      basePath: '/fake/project',
      autoMove: true,
      confirm: true,
    };

    const result = await checkRelevance(options);

    // Only poorly-placed (None-band) memories should be moved
    expect(moveSpy).toHaveBeenCalled();
    const movedIds = moveSpy.mock.calls.map((call: any[]) => call[0].id);
    expect(movedIds).toContain('misplaced-mem');
    expect(movedIds).not.toContain('well-placed-mem');
    expect(result.movedCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// C-T11: --auto-move --confirm --threshold 60 moves Medium + High
// ============================================================================

describe('checkRelevance --threshold override', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T039 — threshold=60 moves memories scoring < 60; well-placed (≥80) stays put
  it('moves memories scoring < 60 when --threshold 60 is set', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: 'misplaced-mem' as any,
          type: MemoryType.Learning,
          title: 'Misplaced learning',
          tags: ['global-pattern', 'best-practice'],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Project,
          relativePath: 'misplaced-mem.md',
        },
        {
          id: 'high-mem' as any,
          type: MemoryType.Decision,
          title: 'Well-placed decision',
          tags: ['project-specific'],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Project,
          relativePath: 'high-mem.md',
        },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [
        { id: 'misplaced-mem', type: 'learning', scope: Scope.Project },
        { id: 'high-mem', type: 'decision', scope: Scope.Project },
        { id: 'peer', type: 'artifact', scope: Scope.Project },
      ],
      edges: [{ source: 'high-mem', target: 'peer', label: 'relates-to' }],
    });

    const moveSpy = vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({
      status: 'success',
      id: 'any',
      changes: {
        fileMoved: true,
        sourceGraphUpdated: true,
        targetGraphUpdated: true,
        sourceIndexUpdated: true,
        targetIndexUpdated: true,
        embeddingsTransferred: false,
      },
    } as any);

    await checkRelevance({
      basePath: '/fake/project',
      autoMove: true,
      confirm: true,
      threshold: 60,
    });

    const movedIds = moveSpy.mock.calls.map((call: any[]) => call[0].id);
    // high-mem is well-placed (score ≥ 80) — must NOT be moved even with threshold=60
    expect(movedIds).not.toContain('high-mem');
    // misplaced-mem scores near 0 (< 60) — must be moved
    expect(movedIds).toContain('misplaced-mem');
  });
});

// ============================================================================
// C-T12: --dry-run --auto-move leaves files unmodified
// ============================================================================

describe('checkRelevance --dry-run', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T040 — misplaced memory would normally be moved; dry-run prevents actual move
  it('does not call moveMemory when --dry-run is set', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: 'misplaced-mem' as any,
          type: MemoryType.Learning,
          title: 'Misplaced learning',
          tags: ['global-pattern', 'best-practice'],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Project,
          relativePath: 'misplaced-mem.md',
        },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [{ id: 'misplaced-mem', type: 'learning', scope: Scope.Project }],
      edges: [],
    });

    const moveSpy = vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({} as any);

    const result = await checkRelevance({
      basePath: '/fake/project',
      autoMove: true,
      confirm: true,
      dryRun: true,
    });

    expect(moveSpy).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
  });
});

// ============================================================================
// C-T13: --type learning restricts scoring
// ============================================================================

describe('checkRelevance --type filter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T041
  it('restricts scoring to the specified memory type only', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: 'learn-one' as any,
          type: MemoryType.Learning,
          title: 'A learning',
          tags: [],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Global,
          relativePath: 'learn-one.md',
        },
        {
          id: 'dec-one' as any,
          type: MemoryType.Decision,
          title: 'A decision',
          tags: [],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Global,
          relativePath: 'dec-one.md',
        },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    const options: CheckRelevanceOptions = {
      basePath: '/fake/global',
      typeFilter: MemoryType.Learning,
    };

    const result = await checkRelevance(options);

    const ids = result.results.map(r => r.id);
    expect(ids).toContain('learn-one');
    expect(ids).not.toContain('dec-one');
  });
});

// ============================================================================
// C-T13b: --agent restricts to named agent's namespace
// ============================================================================

describe('checkRelevance --agent filter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T041a
  it('restricts scoring to memories from the named agent only', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: 'ts-mem' as any,
          type: MemoryType.Learning,
          title: 'TS agent memory',
          tags: [],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.AgentProject,
          agent: 'typescript-expert',
          relativePath: 'ts-mem.md',
        },
        {
          id: 'rust-mem' as any,
          type: MemoryType.Learning,
          title: 'Rust agent memory',
          tags: [],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.AgentProject,
          agent: 'rust-expert',
          relativePath: 'rust-mem.md',
        },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    const options: CheckRelevanceOptions = {
      basePath: '/fake/.claude/agents/typescript-expert',
      agentFilter: 'typescript-expert',
    };

    const result = await checkRelevance(options);

    const ids = result.results.map(r => r.id);
    expect(ids).toContain('ts-mem');
    expect(ids).not.toContain('rust-mem');
  });
});

// ============================================================================
// C-T14: empty scope exits cleanly
// ============================================================================

describe('checkRelevance empty scope', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T042
  it('returns empty results without error when scope has no memories', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1',
      lastUpdated: new Date().toISOString(),
      memories: [],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [],
    });

    const options: CheckRelevanceOptions = {
      basePath: '/fake/empty',
    };

    const result = await checkRelevance(options);

    expect(result.results).toHaveLength(0);
    expect(result).not.toHaveProperty('error');
  });
});

// ============================================================================
// C-T16: --auto-move --confirm with no graph.json in target scope
// ============================================================================

describe('checkRelevance --auto-move with missing target structure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T042a — misplaced memory (score < 40) gets moved even when target dir has no graph.json
  it('still calls moveMemory even when target scope has no graph.json', async () => {
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: 'misplaced-mem' as any,
          type: MemoryType.Learning,
          title: 'Misplaced learning',
          tags: ['global-pattern', 'best-practice'],
          created: '2026-01-01',
          updated: '2026-01-01',
          scope: Scope.Project,
          relativePath: 'misplaced-mem.md',
        },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [{ id: 'misplaced-mem', type: 'learning', scope: Scope.Project }],
      edges: [],
    });

    // moveMemory handles dir creation itself — simulate success
    const moveSpy = vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({
      status: 'success',
      id: 'high-mem',
      changes: {
        fileMoved: true,
        sourceGraphUpdated: true,
        targetGraphUpdated: true,
        sourceIndexUpdated: true,
        targetIndexUpdated: true,
        embeddingsTransferred: false,
      },
    } as any);

    const options: CheckRelevanceOptions = {
      basePath: '/fake/project',
      autoMove: true,
      confirm: true,
    };

    await checkRelevance(options);

    // moveMemory is called — it handles non-existent target directories internally
    expect(moveSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// C-T15: pure scoring functions perform no file I/O
// ============================================================================

describe('scoring function I/O contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T043 — purity: functions return deterministic values with no file I/O
  it('scoreTypeMatch, scoreTagHeuristics, scoreGraphConnectivity return numbers from inputs alone', () => {
    const graph: MemoryGraph = {
      version: 1,
      nodes: [
        { id: 'mem-a', type: 'decision', scope: Scope.Project },
        { id: 'mem-b', type: 'artifact', scope: Scope.Project },
      ],
      edges: [{ source: 'mem-a', target: 'mem-b', label: 'relates-to' }],
    };

    expect(scoreTypeMatch(MemoryType.Decision, Scope.Project)).toBe(30);
    expect(scoreTagHeuristics(['project-specific'], Scope.Project)).toBe(25);
    expect(scoreGraphConnectivity('mem-a', graph, Scope.Project)).toBe(25);
  });
});

// ============================================================================
// formatTable smoke test
// ============================================================================

describe('formatTable', () => {
  it('returns a non-empty string for non-empty results', () => {
    const results: RelevanceScore[] = [
      {
        id: 'some-memory',
        currentScope: Scope.Global,
        suggestedScope: Scope.Project,
        totalScore: 30,
        confidenceBand: 'None',
        components: {
          typeMatch: 0,
          tagHeuristics: 5,
          graphConnectivity: 0,
          contentAnalysis: 25,
        },
      },
    ];

    const output = formatTable(results);
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
    expect(output).toContain('some-memory');
  });

  it('returns at least 80 columns wide', () => {
    const results: RelevanceScore[] = [
      {
        id: 'mem',
        currentScope: Scope.Project,
        totalScore: 90,
        confidenceBand: 'High',
        components: { typeMatch: 30, tagHeuristics: 25, graphConnectivity: 25, contentAnalysis: 10 },
      },
    ];

    const output = formatTable(results);
    const widestLine = Math.max(...output.split('\n').map(l => l.length));
    expect(widestLine).toBeGreaterThanOrEqual(80);
  });
});
