/**
 * Tests for scoreEdges() — batch cosine similarity backfill
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { scoreEdges } from './score-edges.js';
import * as structureModule from './structure.js';
import * as ollamaModule from '../services/ollama.js';

// ============================================================================
// Helpers
// ============================================================================

function writeGraph(dir: string, nodes: any[], edges: any[]): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'graph.json'),
    JSON.stringify({ version: 1, nodes, edges }, null, 2)
  );
}

function readGraph(dir: string): any {
  return JSON.parse(fs.readFileSync(path.join(dir, 'graph.json'), 'utf-8'));
}

function writeEmbeddingCache(
  dir: string,
  memories: Record<string, { embedding: number[]; hash: string; timestamp: string }>
): void {
  fs.writeFileSync(
    path.join(dir, 'embeddings.json'),
    JSON.stringify({ version: 1, memories }, null, 2)
  );
}

// Unit vectors (pre-normalised, as required by cosine similarity tests)
const EMB_A = [1, 0];               // unit vector
const EMB_B = [0, 1];               // unit vector — cosine(EMB_A, EMB_B) = 0
const EMB_C = [0.6, 0.8];           // unit vector (0.36 + 0.64 = 1.0)

const NODES_AB = [
  { id: 'mem-a', type: 'decision' },
  { id: 'mem-b', type: 'learning' },
];

// ============================================================================
// Core scoring behaviour
// ============================================================================

describe('scoreEdges', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-edges-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // T1: scores edge when both embeddings present
  it('scores edge and writes similarity when both embeddings are present', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });

    const result = await scoreEdges({ basePath: testDir });

    expect(result.status).toBe('success');
    expect(result.scored).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.noEmbedding).toBe(0);
    const graph = readGraph(testDir);
    expect(typeof graph.edges[0].similarity).toBe('number');
  });

  // T2: skips when source embedding missing
  it('increments noEmbedding and skips when source embedding is missing', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });

    const result = await scoreEdges({ basePath: testDir });

    expect(result.noEmbedding).toBe(1);
    expect(result.scored).toBe(0);
    const graph = readGraph(testDir);
    expect(graph.edges[0].similarity).toBeUndefined();
  });

  // T3: skips when target embedding missing
  it('increments noEmbedding and skips when target embedding is missing', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
    });

    const result = await scoreEdges({ basePath: testDir });

    expect(result.noEmbedding).toBe(1);
    expect(result.scored).toBe(0);
    const graph = readGraph(testDir);
    expect(graph.edges[0].similarity).toBeUndefined();
  });

  // T4: skips already-scored edge without --force
  it('increments skipped for edges that already have similarity without --force', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to', similarity: 0.9 },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });

    const result = await scoreEdges({ basePath: testDir });

    expect(result.skipped).toBe(1);
    expect(result.scored).toBe(0);
    const graph = readGraph(testDir);
    expect(graph.edges[0].similarity).toBe(0.9);
  });

  // T5: re-scores already-scored edge with --force
  it('re-scores an already-scored edge when --force is set', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to', similarity: 0.9 },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_A, hash: 'h2', timestamp: '2024-01-01' }, // identical → similarity 1.0
    });

    const result = await scoreEdges({ basePath: testDir, force: true });

    expect(result.scored).toBe(1);
    expect(result.skipped).toBe(0);
    const graph = readGraph(testDir);
    expect(graph.edges[0].similarity).not.toBe(0.9);
    expect(graph.edges[0].similarity).toBeCloseTo(1.0);
  });

  // T6: --dry-run does not write graph
  it('returns counts but does not write graph in dry-run mode', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });

    const saveSpy = vi.spyOn(structureModule, 'saveGraph');

    const result = await scoreEdges({ basePath: testDir, dryRun: true });

    expect(result.scored).toBe(1);
    expect(saveSpy).not.toHaveBeenCalled();
    const graph = readGraph(testDir);
    expect(graph.edges[0].similarity).toBeUndefined();
  });

  // T13: empty graph returns all-zero response
  it('returns all-zero response when graph has no edges', async () => {
    writeGraph(testDir, [], []);
    writeEmbeddingCache(testDir, {});

    const result = await scoreEdges({ basePath: testDir });

    expect(result).toMatchObject({
      status: 'success',
      scored: 0,
      skipped: 0,
      noEmbedding: 0,
      verified: 0,
      applied: 0,
    });
  });

  // T14: returns error status when loadGraph throws
  it('returns error status with zero counts when loadGraph throws', async () => {
    writeEmbeddingCache(testDir, {}); // ensure loadEmbeddingCache doesn't race the mock rejection
    vi.spyOn(structureModule, 'loadGraph').mockRejectedValue(new Error('disk read failure'));

    const result = await scoreEdges({ basePath: testDir });

    expect(result.status).toBe('error');
    expect(result.error).toContain('disk read failure');
    expect(result.scored).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.noEmbedding).toBe(0);
    expect(result.verified).toBe(0);
    expect(result.applied).toBe(0);
  });
});

// ============================================================================
// --verify flag
// ============================================================================

describe('scoreEdges --verify', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-edges-verify-'));
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // T7: stores valid Ollama response in verifiedRelation
  it('stores valid Ollama response as verifiedRelation; leaves label unchanged', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('superseded-by');

    const result = await scoreEdges({ basePath: testDir, verify: true });

    expect(result.status).toBe('success');
    expect(result.scored).toBe(1);
    expect(result.verified).toBe(1);
    const graph = readGraph(testDir);
    expect(graph.edges[0].verifiedRelation).toBe('superseded-by');
    expect(graph.edges[0].label).toBe('relates-to');
  });

  // T8: invalid Ollama response is silently dropped
  it('silently drops invalid Ollama responses and leaves verifiedRelation unset', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('INVALID LABEL!!!');

    const result = await scoreEdges({ basePath: testDir, verify: true });

    expect(result.scored).toBe(1);
    expect(result.verified).toBe(0);
    const graph = readGraph(testDir);
    expect(graph.edges[0].verifiedRelation).toBeUndefined();
  });

  // T9: Ollama unavailable — skips verification, still scores similarity
  it('scores similarity even when Ollama is unavailable; verified remains 0', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);

    const result = await scoreEdges({ basePath: testDir, verify: true });

    expect(result.scored).toBe(1);
    expect(result.verified).toBe(0);
    const graph = readGraph(testDir);
    expect(typeof graph.edges[0].similarity).toBe('number');
    expect(graph.edges[0].verifiedRelation).toBeUndefined();
  });

  // T15: --verify + --dry-run never calls Ollama generate()
  it('does not invoke Ollama generate() when --verify and --dry-run are both set', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    const generateSpy = vi.spyOn(ollamaModule, 'generate').mockResolvedValue('relates-to');

    const result = await scoreEdges({ basePath: testDir, verify: true, dryRun: true });

    expect(result.scored).toBe(1);
    expect(generateSpy).not.toHaveBeenCalled();
  });
});

// ============================================================================
// --apply flag
// ============================================================================

describe('scoreEdges --apply', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-edges-apply-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // T10b: --apply promotes verifiedRelation on a pre-scored edge without --force
  it('promotes verifiedRelation on an already-scored edge without needing --force', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to', similarity: 0.5, verifiedRelation: 'superseded-by' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });

    const result = await scoreEdges({ basePath: testDir, apply: true });

    expect(result.skipped).toBe(1);   // not re-scored — similarity already present
    expect(result.applied).toBe(1);   // verifiedRelation promoted regardless
    const graph = readGraph(testDir);
    expect(graph.edges[0].label).toBe('superseded-by');
    expect(Object.prototype.hasOwnProperty.call(graph.edges[0], 'verifiedRelation')).toBe(false);
  });

  // T10: promotes existing verifiedRelation → label, clears field
  it('promotes existing verifiedRelation to label and removes the field', async () => {
    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to', verifiedRelation: 'superseded-by' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });

    const result = await scoreEdges({ basePath: testDir, apply: true });

    expect(result.scored).toBe(1);
    expect(result.applied).toBe(1);
    const graph = readGraph(testDir);
    expect(graph.edges[0].label).toBe('superseded-by');
    expect(Object.prototype.hasOwnProperty.call(graph.edges[0], 'verifiedRelation')).toBe(false);
  });

  // T11: --apply + --verify: new suggestion written then immediately promoted
  it('promotes freshly LLM-suggested verifiedRelation to label in a single pass', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('implements');

    writeGraph(testDir, NODES_AB, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
    });

    const result = await scoreEdges({ basePath: testDir, verify: true, apply: true });

    expect(result.scored).toBe(1);
    expect(result.verified).toBe(1);
    expect(result.applied).toBe(1);
    const graph = readGraph(testDir);
    expect(graph.edges[0].label).toBe('implements');
    expect(Object.prototype.hasOwnProperty.call(graph.edges[0], 'verifiedRelation')).toBe(false);
  });
});

// ============================================================================
// Graph write behaviour
// ============================================================================

describe('scoreEdges graph persistence', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-edges-persist-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // T12: saveGraph called exactly once regardless of edge count
  it('saves graph exactly once regardless of how many edges are scored', async () => {
    writeGraph(testDir,
      [
        { id: 'mem-a', type: 'decision' },
        { id: 'mem-b', type: 'learning' },
        { id: 'mem-c', type: 'learning' },
      ],
      [
        { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
        { source: 'mem-b', target: 'mem-c', label: 'relates-to' },
      ]
    );
    writeEmbeddingCache(testDir, {
      'mem-a': { embedding: EMB_A, hash: 'h1', timestamp: '2024-01-01' },
      'mem-b': { embedding: EMB_B, hash: 'h2', timestamp: '2024-01-01' },
      'mem-c': { embedding: EMB_C, hash: 'h3', timestamp: '2024-01-01' },
    });

    const saveSpy = vi.spyOn(structureModule, 'saveGraph');

    await scoreEdges({ basePath: testDir });

    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
