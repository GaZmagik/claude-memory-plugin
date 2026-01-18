/**
 * Tests for Suggest Links
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { suggestLinks } from './suggest-links.js';
import * as embeddingModule from '../search/embedding.js';
import * as similarityModule from '../search/similarity.js';
import * as indexModule from '../core/index.js';
import * as structureModule from '../graph/structure.js';
import * as linkModule from '../graph/link.js';

describe('suggestLinks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when no embeddings cache', async () => {
    vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockRejectedValue(
      new Error('No cache')
    );

    const result = await suggestLinks({ basePath: '/test' });

    expect(result.status).toBe('error');
    expect(result.error).toContain('No embeddings cache');
  });

  it('returns empty suggestions when cache is empty', async () => {
    vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue({
      memories: {},
    } as any);

    const result = await suggestLinks({ basePath: '/test' });

    expect(result.status).toBe('success');
    expect(result.suggestions).toHaveLength(0);
  });

  it('returns empty suggestions when only one memory', async () => {
    vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue({
      memories: {
        'only-one': { embedding: [0.1, 0.2, 0.3] },
      },
    } as any);

    const result = await suggestLinks({ basePath: '/test' });

    expect(result.status).toBe('success');
    expect(result.suggestions).toHaveLength(0);
  });

  it('finds similar memories', async () => {
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

    vi.spyOn(similarityModule, 'findSimilarMemories').mockReturnValue([
      { id: 'mem-2', similarity: 0.95 },
    ]);

    const result = await suggestLinks({ basePath: '/test', threshold: 0.7 });

    expect(result.status).toBe('success');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]!.source).toBe('mem-1');
    expect(result.suggestions[0]!.target).toBe('mem-2');
    expect(result.suggestions[0]!.similarity).toBe(0.95);
  });

  it('skips already linked memories', async () => {
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
      edges: [{ source: 'mem-1', target: 'mem-2', label: 'related' }],
    } as any);

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

    vi.spyOn(similarityModule, 'findSimilarMemories').mockReturnValue([
      { id: 'mem-2', similarity: 0.95 },
    ]);

    const result = await suggestLinks({ basePath: '/test' });

    expect(result.status).toBe('success');
    expect(result.suggestions).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it('respects limit parameter', async () => {
    vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue({
      memories: {
        'mem-1': { embedding: [0.1, 0.2, 0.3] },
        'mem-2': { embedding: [0.15, 0.25, 0.35] },
        'mem-3': { embedding: [0.12, 0.22, 0.32] },
      },
    } as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      memories: [
        { id: 'mem-1', title: 'Memory One' },
        { id: 'mem-2', title: 'Memory Two' },
        { id: 'mem-3', title: 'Memory Three' },
      ],
    } as any);

    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [{ id: 'mem-1' }, { id: 'mem-2' }, { id: 'mem-3' }],
      edges: [],
    } as any);

    vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

    vi.spyOn(similarityModule, 'findSimilarMemories').mockReturnValue([
      { id: 'mem-2', similarity: 0.95 },
      { id: 'mem-3', similarity: 0.85 },
    ]);

    const result = await suggestLinks({ basePath: '/test', limit: 1 });

    expect(result.suggestions.length).toBeLessThanOrEqual(1);
  });

  it('auto-links when requested', async () => {
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

    vi.spyOn(similarityModule, 'findSimilarMemories').mockReturnValue([
      { id: 'mem-2', similarity: 0.95 },
    ]);

    vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({ status: 'success' });

    const result = await suggestLinks({ basePath: '/test', autoLink: true });

    expect(result.status).toBe('success');
    expect(result.created).toBe(1);
    expect(linkModule.linkMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mem-1',
        target: 'mem-2',
        relation: 'auto-linked-by-similarity',
      })
    );
  });
});
