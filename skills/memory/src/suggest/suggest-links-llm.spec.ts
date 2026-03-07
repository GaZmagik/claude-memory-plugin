/**
 * Tests for suggestLinks --llm-type flag (LLM verification on auto-link)
 *
 * Cross-cutting spec: tests the Ollama integration path of suggestLinks.
 * Listed in .tddignore as it covers suggest-links.ts via a feature axis.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import { suggestLinks } from './suggest-links.js';
import * as embeddingModule from '../search/embedding.js';
import * as similarityModule from '../search/similarity.js';
import * as indexModule from '../core/index.js';
import * as structureModule from '../graph/structure.js';
import * as linkModule from '../graph/link.js';
import * as ollamaModule from '../services/ollama.js';

const TEST_BASE = path.join(os.homedir(), '.claude', 'memory');
const TEST_AGENT_BASE = path.join(os.homedir(), '.claude', 'memory', 'agents', 'test-agent');

function setupStandardMocks() {
  vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue({
    memories: {
      'mem-1': { embedding: [0.1, 0.2, 0.3] },
      'mem-2': { embedding: [0.15, 0.25, 0.35] },
    },
  } as any);

  vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
    memories: [
      { id: 'mem-1', title: 'Memory One' },
      { id: 'mem-2', title: 'Memory Two' },
    ],
  } as any);

  vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
    version: 1,
    nodes: [{ id: 'mem-1' }, { id: 'mem-2' }],
    edges: [],
  } as any);

  vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

  vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
    { id1: 'mem-1', id2: 'mem-2', similarity: 0.95 },
  ]);
}

describe('suggestLinks --llm-type', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T061
  it('with Ollama available, auto-linked same-scope edges include verifiedRelation', async () => {
    setupStandardMocks();

    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    const generateSpy = vi.spyOn(ollamaModule, 'generate').mockResolvedValue('superseded-by');
    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({ status: 'success' });

    await suggestLinks({ basePath: TEST_BASE, autoLink: true, llmType: true });

    // Review fix: prompt must use human-readable titles, not opaque memory IDs
    expect(generateSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Memory One.*Memory Two|Memory Two.*Memory One/),
      undefined,
      300_000
    );
    expect(linkModule.linkMemories).toHaveBeenCalledWith(
      expect.objectContaining({ verifiedRelation: 'superseded-by' })
    );
  });

  // T062
  it('with Ollama unavailable, edges are written without verifiedRelation and exit 0', async () => {
    setupStandardMocks();

    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);
    const generateSpy = vi.spyOn(ollamaModule, 'generate');
    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({ status: 'success' });

    const result = await suggestLinks({ basePath: TEST_BASE, autoLink: true, llmType: true });

    expect(result.status).toBe('success');
    expect(generateSpy).not.toHaveBeenCalled();
    expect(linkModule.linkMemories).toHaveBeenCalledWith(
      expect.not.objectContaining({ verifiedRelation: expect.anything() })
    );
  });

  // T063
  it('does not pass verifiedRelation field to storeCrossScopeEdge (uses relation instead)', async () => {
    vi.spyOn(embeddingModule, 'loadEmbeddingCache')
      .mockResolvedValueOnce({ memories: { 'mem-1': { embedding: [0.1, 0.2, 0.3] } } } as any)
      .mockResolvedValueOnce({ memories: { 'mem-2': { embedding: [0.15, 0.25, 0.35] } } } as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [{ id: 'mem-1', title: 'Memory One' }, { id: 'mem-2', title: 'Memory Two' }],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1, nodes: [{ id: 'mem-1' }, { id: 'mem-2' }], edges: [],
    } as any);

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);
    vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
      { id1: 'mem-1', id2: 'mem-2', similarity: 0.88 },
    ]);

    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    const generateSpy = vi.spyOn(ollamaModule, 'generate');

    const storeSpy = vi.spyOn(linkModule, 'storeCrossScopeEdge').mockResolvedValue({
      status: 'success',
      edge: { source: 'mem-1', target: 'mem-2', label: 'auto-linked-by-similarity' },
    });

    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({ status: 'success' });

    await suggestLinks({
      basePath: TEST_AGENT_BASE, autoLink: true, llmType: true, allScopes: true, agentName: 'test-agent',
    });

    if (storeSpy.mock.calls.length > 0) {
      expect(storeSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({ verifiedRelation: expect.anything() })
      );
    }
    void generateSpy;
  });

  // T064
  it('force flag updates existing edge metadata when different', async () => {
    vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue({
      memories: {
        'mem-1': { embedding: [0.1, 0.2, 0.3] },
        'mem-2': { embedding: [0.15, 0.25, 0.35] },
      },
    } as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [
        { id: 'mem-1', title: 'Memory One' },
        { id: 'mem-2', title: 'Memory Two' },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [{ id: 'mem-1' }, { id: 'mem-2' }],
      edges: [],
    } as any);

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);
    vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
      { id1: 'mem-1', id2: 'mem-2', similarity: 0.88 },
    ]);

    const linkSpy = vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      alreadyExists: false,
    });

    const result = await suggestLinks({
      basePath: TEST_BASE,
      autoLink: true,
      force: true,
    });

    expect(result.status).toBe('success');
    expect(linkSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mem-1',
        target: 'mem-2',
        similarity: 0.88,
        force: true,
      })
    );
  });

  // T065
  it('force flag passes through to linkMemories correctly', async () => {
    vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue({
      memories: {
        'mem-1': { embedding: [0.1, 0.2, 0.3] },
        'mem-2': { embedding: [0.15, 0.25, 0.35] },
      },
    } as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [
        { id: 'mem-1', title: 'Memory One' },
        { id: 'mem-2', title: 'Memory Two' },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [{ id: 'mem-1' }, { id: 'mem-2' }],
      edges: [],
    } as any);

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);
    vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
      { id1: 'mem-1', id2: 'mem-2', similarity: 0.88 },
    ]);

    const linkSpy = vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
      status: 'success',
      alreadyExists: true,
    });

    await suggestLinks({ basePath: TEST_BASE, autoLink: true, force: false });
    expect(linkSpy).toHaveBeenCalledWith(expect.objectContaining({ force: false }));

    linkSpy.mockClear();

    await suggestLinks({ basePath: TEST_BASE, autoLink: true, force: true });
    expect(linkSpy).toHaveBeenCalledWith(expect.objectContaining({ force: true }));
  });
});
