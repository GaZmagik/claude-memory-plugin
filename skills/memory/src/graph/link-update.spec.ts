/**
 * Tests for Phase B: updateEdgeMetadata — link-update.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { updateEdgeMetadata } from './link-update.js';
import * as structureModule from './structure.js';
import { Scope } from '../types/enums.js';
import * as ollamaModule from '../services/ollama.js';

// Helper: write a minimal graph.json to a temp dir
function writeGraph(dir: string, nodes: any[], edges: any[]): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'graph.json'),
    JSON.stringify({ version: 1, nodes, edges }, null, 2)
  );
}

// Helper: read graph.json from a dir
function readGraph(dir: string): any {
  return JSON.parse(fs.readFileSync(path.join(dir, 'graph.json'), 'utf-8'));
}

const NODES = [
  { id: 'mem-a', type: 'decision' },
  { id: 'mem-b', type: 'learning' },
];

describe('updateEdgeMetadata', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-update-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // T013 (B-T1): sets similarity on existing edge; other fields unchanged
  it('sets similarity on an existing edge without changing other fields', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to', sourceScope: Scope.Project },
    ]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      similarity: 0.75,
    });

    expect(result.status).toBe('success');
    const graph = readGraph(testDir);
    const edge = graph.edges[0];
    expect(edge.similarity).toBe(0.75);
    expect(edge.label).toBe('relates-to');
    expect(edge.sourceScope).toBe('project');
    expect(edge.source).toBe('mem-a');
    expect(edge.target).toBe('mem-b');
  });

  // T014 (B-T2): rejects similarity > 1 — strict rejection, not clamp
  it('rejects similarity above 1.0 with a validation error before writing', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      similarity: 1.5,
    });

    expect(result.status).toBe('error');
    expect(result.error).toBeDefined();
    // Graph must be untouched
    const graph = readGraph(testDir);
    expect(graph.edges[0].similarity).toBeUndefined();
  });

  // T015 (B-T3): rejects similarity NaN
  it('rejects similarity NaN with a validation error', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      similarity: NaN,
    });

    expect(result.status).toBe('error');
    expect(result.error).toBeDefined();
  });

  // T016 (B-T4): relation updates the edge label
  it('updates the edge label when relation is provided', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      relation: 'superseded-by',
    });

    expect(result.status).toBe('success');
    const graph = readGraph(testDir);
    expect(graph.edges[0].label).toBe('superseded-by');
  });

  // T017 (B-T5): --apply promotes verifiedRelation to label and removes verifiedRelation entirely
  it('promotes verifiedRelation to label and removes the field on --apply', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to', verifiedRelation: 'superseded-by' },
    ]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      apply: true,
    });

    expect(result.status).toBe('success');
    expect(result.applied).toBe(true);
    const graph = readGraph(testDir);
    const edge = graph.edges[0];
    expect(edge.label).toBe('superseded-by');
    expect(Object.prototype.hasOwnProperty.call(edge, 'verifiedRelation')).toBe(false);
  });

  // T018 (B-T6): --apply on edge with no verifiedRelation is a no-op; graph not written
  it('returns noOp when --apply finds no verifiedRelation; does not write graph', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);

    const saveSpy = vi.spyOn(structureModule, 'saveGraph');

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      apply: true,
    });

    expect(result.status).toBe('success');
    expect(result.noOp).toBe(true);
    expect(saveSpy).not.toHaveBeenCalled();
  });

  // T018a (B-T6b): --apply where verifiedRelation === label still promotes cleanly
  it('promotes verifiedRelation even when it equals the current label', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to', verifiedRelation: 'relates-to' },
    ]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      apply: true,
    });

    expect(result.status).toBe('success');
    expect(result.applied).toBe(true);
    const graph = readGraph(testDir);
    const edge = graph.edges[0];
    expect(edge.label).toBe('relates-to');
    expect(Object.prototype.hasOwnProperty.call(edge, 'verifiedRelation')).toBe(false);
  });

  // T019 (B-T7): cross-scope edge — updates in BOTH graph files
  it('updates a cross-scope edge in both source and target graph files', async () => {
    const sourceDir = path.join(testDir, 'source-scope');
    const targetDir = path.join(testDir, 'target-scope');

    const crossEdge = {
      source: 'mem-a',
      target: 'mem-b',
      label: 'auto-linked-by-similarity',
      sourceScope: Scope.Project,
      targetScope: Scope.Global,
    };

    writeGraph(sourceDir, NODES, [crossEdge]);
    writeGraph(targetDir, NODES, [crossEdge]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: sourceDir,
      crossScopeBasePaths: [targetDir],
      similarity: 0.88,
    });

    expect(result.status).toBe('success');

    const sourceGraph = readGraph(sourceDir);
    const targetGraph = readGraph(targetDir);
    expect(sourceGraph.edges[0].similarity).toBe(0.88);
    expect(targetGraph.edges[0].similarity).toBe(0.88);
  });

  // T020 (B-T8): sourceId not found returns error identifying the missing ID
  it('returns error when sourceId is not found in any scanned graph', async () => {
    writeGraph(testDir, NODES, [
      { source: 'mem-x', target: 'mem-y', label: 'relates-to' },
    ]);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      similarity: 0.5,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('mem-a');
    // Review fix: error message must also identify the target so users see the full edge pair
    expect(result.error).toContain('mem-b');
  });

  // T022a (B-T11): verify and apply together is rejected before any graph read/write
  it('rejects when both verify and apply are set (mutually exclusive)', async () => {
    const saveSpy = vi.spyOn(structureModule, 'saveGraph');
    const loadSpy = vi.spyOn(structureModule, 'loadGraph');

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      verify: true,
      apply: true,
    });

    expect(result.status).toBe('error');
    expect(result.error).toBeDefined();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(loadSpy).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Review fix: cross-scope edge not in graph[i] → silent dirty=false → log
// ============================================================================

describe('updateEdgeMetadata dirty=false stderr log', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-update-dirty-'));
    writeGraph(testDir, NODES, [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // T066 — edge found but dirty stays false (Ollama unavailable, no other fields) → additional stderr note
  it('logs a stderr note when the edge is found but dirty stays false after verify with no Ollama', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      verify: true,
    });

    const allMessages = stderrSpy.mock.calls.map((c: any) => String(c[0]));
    // One message for Ollama unavailable; an additional message for the graph not being written
    const hasNotWrittenLog = allMessages.some(m => /not written|no fields changed/i.test(m));
    expect(hasNotWrittenLog).toBe(true);
  });
});

// ============================================================================
// Phase D: --verify flag (LLM verification via Ollama)
// ============================================================================

describe('updateEdgeMetadata --verify', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-update-verify-'));
    writeGraph(testDir, [{ id: 'mem-a' }, { id: 'mem-b' }], [
      { source: 'mem-a', target: 'mem-b', label: 'relates-to' },
    ]);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // T064
  it('stores LLM result as verifiedRelation when Ollama is available', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('superseded-by');

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      verify: true,
    });

    expect(result.status).toBe('success');
    expect(ollamaModule.generate).toHaveBeenCalledWith(expect.any(String), undefined, 60_000);
    const graph = JSON.parse(fs.readFileSync(path.join(testDir, 'graph.json'), 'utf-8'));
    const edge = graph.edges.find((e: any) => e.source === 'mem-a' && e.target === 'mem-b');
    expect(edge).toBeDefined();
    expect(edge.verifiedRelation).toBe('superseded-by');
    expect(edge.label).toBe('relates-to'); // label is NOT changed by verify
  });

  // T065
  it('prints warning and does not modify verifiedRelation when Ollama is unavailable', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('');
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const result = await updateEdgeMetadata({
      sourceId: 'mem-a',
      targetId: 'mem-b',
      basePath: testDir,
      verify: true,
    });

    expect(result.status).toBe('success');
    const graph = JSON.parse(fs.readFileSync(path.join(testDir, 'graph.json'), 'utf-8'));
    const edge = graph.edges.find((e: any) => e.source === 'mem-a' && e.target === 'mem-b');
    expect(edge.verifiedRelation).toBeUndefined();
    expect(stderrSpy).toHaveBeenCalled();
  });

  // T064b — prompt uses node titles when available, not raw IDs
  it('passes node titles (not raw IDs) to the LLM prompt when nodes have title fields', async () => {
    // Rebuild the graph with titled nodes
    const titledDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-update-titled-'));
    writeGraph(titledDir,
      [
        { id: 'mem-a', type: 'decision', title: 'Authentication Decision' },
        { id: 'mem-b', type: 'learning', title: 'OAuth Best Practice' },
      ],
      [{ source: 'mem-a', target: 'mem-b', label: 'relates-to' }]
    );

    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    const generateSpy = vi.spyOn(ollamaModule, 'generate').mockResolvedValue('informs');

    await updateEdgeMetadata({ sourceId: 'mem-a', targetId: 'mem-b', basePath: titledDir, verify: true });

    const prompt = String(generateSpy.mock.calls[0]![0]);
    expect(prompt).toContain('Authentication Decision');
    expect(prompt).toContain('OAuth Best Practice');
    // Raw IDs must NOT appear in place of titles
    expect(prompt).not.toMatch(/"mem-a"/);
    expect(prompt).not.toMatch(/"mem-b"/);

    fs.rmSync(titledDir, { recursive: true, force: true });
  });

  // T064c — falls back to raw ID in the prompt when node has no title
  it('falls back to the raw ID in the prompt when nodes have no title field', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    const generateSpy = vi.spyOn(ollamaModule, 'generate').mockResolvedValue('depends-on');

    await updateEdgeMetadata({ sourceId: 'mem-a', targetId: 'mem-b', basePath: testDir, verify: true });

    const prompt = String(generateSpy.mock.calls[0]![0]);
    expect(prompt).toContain('mem-a');
    expect(prompt).toContain('mem-b');
  });

  // T065a — full --verify → --apply lifecycle
  it('full lifecycle: --verify stores verifiedRelation, --apply promotes to label and removes it', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('superseded-by');

    // Step 1: --verify
    await updateEdgeMetadata({ sourceId: 'mem-a', targetId: 'mem-b', basePath: testDir, verify: true });

    let graph = JSON.parse(fs.readFileSync(path.join(testDir, 'graph.json'), 'utf-8'));
    let edge = graph.edges.find((e: any) => e.source === 'mem-a' && e.target === 'mem-b');
    expect(edge.verifiedRelation).toBe('superseded-by');
    expect(edge.label).toBe('relates-to');

    // Step 2: --apply
    await updateEdgeMetadata({ sourceId: 'mem-a', targetId: 'mem-b', basePath: testDir, apply: true });

    graph = JSON.parse(fs.readFileSync(path.join(testDir, 'graph.json'), 'utf-8'));
    edge = graph.edges.find((e: any) => e.source === 'mem-a' && e.target === 'mem-b');
    expect(edge.label).toBe('superseded-by');
    expect(Object.prototype.hasOwnProperty.call(edge, 'verifiedRelation')).toBe(false);
  });
});
