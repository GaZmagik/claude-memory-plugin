/**
 * Tests for Cross-Scope Auto-Linking in Suggest Links (v1.4.0)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import { suggestLinks } from './suggest-links.js';
import * as embeddingModule from '../search/embedding.js';
import * as similarityModule from '../search/similarity.js';
// Note: suggest-links.ts uses findPotentialDuplicates, not findSimilarMemories
import * as indexModule from '../core/index.js';
import * as structureModule from '../graph/structure.js';
import * as linkModule from '../graph/link.js';
import * as resolverModule from '../scope/resolver.js';
import * as ollamaModule from '../services/ollama.js';

const TEST_BASE = path.join(os.homedir(), '.claude', 'memory');
const TEST_AGENT_BASE = path.join(os.homedir(), '.claude', 'memory', 'agents', 'test-agent');

describe('suggestLinks - Cross-Scope Auto-Linking (v1.4.0)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Metadata Tracking', () => {
    it('tracks metadata for primary scope memories', async () => {
      const mockCache = {
        memories: {
          'learning-typescript': { embedding: [0.1, 0.2, 0.3] },
          'learning-rust': { embedding: [0.15, 0.25, 0.35] },
        },
      };

      const mockIndex = {
        memories: [
          { id: 'learning-typescript', type: 'learning', title: 'TypeScript basics' },
          { id: 'learning-rust', type: 'learning', title: 'Rust ownership' },
        ],
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue(mockCache as any);
      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex as any);
      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);
      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);
      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'learning-typescript', id2: 'learning-rust', similarity: 0.85 },
      ]);
      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      const result = await suggestLinks({
        basePath: TEST_AGENT_BASE,
        threshold: 0.7,
        agentName: 'typescript-expert',
      });

      expect(result.status).toBe('success');
      expect(result.suggestions).toHaveLength(1);
      const suggestion = result.suggestions[0]!;
      expect(suggestion.sourceMetadata).toBeDefined();
      expect(suggestion.sourceMetadata?.basePath).toBe(TEST_AGENT_BASE);
      expect(suggestion.sourceMetadata?.agent).toBe('typescript-expert');
    });

    it('tracks metadata for shared scope memories', async () => {
      const primaryCache = {
        memories: {
          'agent-memory': { embedding: [0.1, 0.2, 0.3] },
        },
      };

      const sharedCache = {
        memories: {
          'project-memory': { embedding: [0.15, 0.25, 0.35] },
        },
      };

      const primaryIndex = {
        memories: [
          { id: 'agent-memory', type: 'learning', title: 'Agent learning' },
        ],
      };

      const sharedIndex = {
        memories: [
          { id: 'project-memory', type: 'decision', title: 'Project decision' },
        ],
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockImplementation(async (cachePath) => {
        if (cachePath.includes(path.join('agents', 'test-agent'))) return primaryCache as any;
        if (cachePath === path.join(TEST_BASE, 'embeddings.json')) return sharedCache as any;
        throw new Error('no embeddings');
      });

      vi.spyOn(indexModule, 'loadIndex').mockImplementation(async ({ basePath }: any) => {
        if (basePath === TEST_AGENT_BASE) return primaryIndex as any;
        return sharedIndex as any;
      });

      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);

      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'agent-memory', id2: 'project-memory', similarity: 0.88 },
      ]);

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      const result = await suggestLinks({
        basePath: TEST_AGENT_BASE,
        threshold: 0.7,
        allScopes: true,
        agentName: 'test-agent',
      });

      expect(result.status).toBe('success');
      expect(result.suggestions).toHaveLength(1);
      const suggestion = result.suggestions[0]!;
      expect(suggestion.sourceMetadata).toBeDefined();
      expect(suggestion.targetMetadata).toBeDefined();
      expect(suggestion.sourceMetadata?.basePath).toBe(TEST_AGENT_BASE);
      expect(suggestion.targetMetadata?.basePath).toBe(TEST_BASE);
    });
  });

  describe('Cross-Scope Detection', () => {
    it('marks suggestions as cross-scope when basePaths differ', async () => {
      const primaryCache = {
        memories: {
          'agent-learning': { embedding: [0.1, 0.2, 0.3] },
        },
      };

      const sharedCache = {
        memories: {
          'project-decision': { embedding: [0.12, 0.22, 0.32] },
        },
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockImplementation(async (cachePath) => {
        if (cachePath.includes(path.join('agents', 'test-agent'))) return primaryCache as any;
        if (cachePath === path.join(TEST_BASE, 'embeddings.json')) return sharedCache as any;
        throw new Error('no embeddings');
      });

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        memories: [
          { id: 'agent-learning', type: 'learning', title: 'Agent learning' },
          { id: 'project-decision', type: 'decision', title: 'Project decision' },
        ],
      } as any);

      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);

      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'agent-learning', id2: 'project-decision', similarity: 0.92 },
      ]);

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      const result = await suggestLinks({
        basePath: TEST_AGENT_BASE,
        threshold: 0.7,
        allScopes: true,
        agentName: 'test-agent',
      });

      expect(result.status).toBe('success');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]!.isCrossScope).toBe(true);
    });

    it('does not mark same-scope suggestions as cross-scope', async () => {
      const mockCache = {
        memories: {
          'mem-1': { embedding: [0.1, 0.2, 0.3] },
          'mem-2': { embedding: [0.11, 0.21, 0.31] },
        },
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue(mockCache as any);

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        memories: [
          { id: 'mem-1', type: 'learning', title: 'Memory 1' },
          { id: 'mem-2', type: 'learning', title: 'Memory 2' },
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

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      const result = await suggestLinks({
        basePath: TEST_BASE,
        threshold: 0.7,
      });

      expect(result.status).toBe('success');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0]!.isCrossScope).toBe(false);
    });
  });

  describe('Cross-Scope Auto-Linking', () => {
    it('routes cross-scope suggestions to storeCrossScopeEdge', async () => {
      const primaryCache = {
        memories: {
          'agent-mem': { embedding: [0.1, 0.2, 0.3] },
        },
      };

      const sharedCache = {
        memories: {
          'project-mem': { embedding: [0.12, 0.22, 0.32] },
        },
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockImplementation(async (cachePath) => {
        if (cachePath.includes(path.join('agents', 'test-agent'))) return primaryCache as any;
        if (cachePath === path.join(TEST_BASE, 'embeddings.json')) return sharedCache as any;
        throw new Error('no embeddings');
      });

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        memories: [
          { id: 'agent-mem', type: 'learning', title: 'Agent memory' },
          { id: 'project-mem', type: 'decision', title: 'Project memory' },
        ],
      } as any);

      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);

      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'agent-mem', id2: 'project-mem', similarity: 0.88 },
      ]);

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      const storeCrossScopeEdgeSpy = vi.spyOn(linkModule, 'storeCrossScopeEdge').mockResolvedValue({
        status: 'success',
        edge: { source: 'agent-mem', target: 'project-mem', label: 'auto-linked-by-similarity' },
      });

      const result = await suggestLinks({
        basePath: TEST_AGENT_BASE,
        threshold: 0.7,
        autoLink: true,
        allScopes: true,
        agentName: 'test-agent',
      });

      expect(result.status).toBe('success');
      expect(storeCrossScopeEdgeSpy).toHaveBeenCalledTimes(1);
      expect(storeCrossScopeEdgeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'agent-mem',
          targetId: 'project-mem',
          relation: 'auto-linked-by-similarity',
          sourceBasePath: TEST_AGENT_BASE,
          targetBasePath: TEST_BASE,
        })
      );
    });

    it('routes same-scope suggestions to linkMemories', async () => {
      const mockCache = {
        memories: {
          'mem-1': { embedding: [0.1, 0.2, 0.3] },
          'mem-2': { embedding: [0.11, 0.21, 0.31] },
        },
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue(mockCache as any);

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        memories: [
          { id: 'mem-1', type: 'learning', title: 'Memory 1' },
          { id: 'mem-2', type: 'learning', title: 'Memory 2' },
        ],
      } as any);

      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);

      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'mem-1', id2: 'mem-2', similarity: 0.95 },
      ]);

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      const linkMemoriesSpy = vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
        status: 'success',
        edge: { source: 'mem-1', target: 'mem-2', label: 'auto-linked-by-similarity' },
        alreadyExists: false,
      });

      const result = await suggestLinks({
        basePath: TEST_BASE,
        threshold: 0.7,
        autoLink: true,
      });

      expect(result.status).toBe('success');
      expect(linkMemoriesSpy).toHaveBeenCalledTimes(1);
      expect(linkMemoriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'mem-1',
          target: 'mem-2',
          relation: 'auto-linked-by-similarity',
          basePath: TEST_BASE,
        })
      );
    });

    it('tracks separate counts for same-scope and cross-scope links', async () => {
      const primaryCache = {
        memories: {
          'agent-mem-1': { embedding: [0.1, 0.2, 0.3] },
          'agent-mem-2': { embedding: [0.11, 0.21, 0.31] },
        },
      };

      const sharedCache = {
        memories: {
          'project-mem': { embedding: [0.12, 0.22, 0.32] },
        },
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockImplementation(async (cachePath) => {
        if (cachePath.includes(path.join('agents', 'test-agent'))) return primaryCache as any;
        if (cachePath === path.join(TEST_BASE, 'embeddings.json')) return sharedCache as any;
        throw new Error('no embeddings');
      });

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        memories: [
          { id: 'agent-mem-1', type: 'learning', title: 'Agent memory 1' },
          { id: 'agent-mem-2', type: 'learning', title: 'Agent memory 2' },
          { id: 'project-mem', type: 'decision', title: 'Project memory' },
        ],
      } as any);

      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);

      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

      // findPotentialDuplicates returns all pairs at once (not per-source-memory)
      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'agent-mem-1', id2: 'agent-mem-2', similarity: 0.95 },
        { id1: 'agent-mem-1', id2: 'project-mem', similarity: 0.88 },
      ]);

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
        status: 'success',
        edge: { source: 'agent-mem-1', target: 'agent-mem-2', label: 'auto-linked-by-similarity' },
        alreadyExists: false,
      });

      vi.spyOn(linkModule, 'storeCrossScopeEdge').mockResolvedValue({
        status: 'success',
        edge: { source: 'agent-mem-1', target: 'project-mem', label: 'auto-linked-by-similarity' },
      });

      const result = await suggestLinks({
        basePath: TEST_AGENT_BASE,
        threshold: 0.7,
        autoLink: true,
        allScopes: true,
        agentName: 'test-agent',
        limit: 10,
      });

      expect(result.status).toBe('success');
      expect(result.created).toBe(2);
      expect(result.createdSameScope).toBe(1);
      expect(result.createdCrossScope).toBe(1);
    });

    it('applies LLM type verification to cross-scope links and passes result as relation', async () => {
      const primaryCache = {
        memories: {
          'agent-mem': { embedding: [0.1, 0.2, 0.3] },
        },
      };

      const sharedCache = {
        memories: {
          'project-mem': { embedding: [0.12, 0.22, 0.32] },
        },
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockImplementation(async (cachePath) => {
        if (cachePath.includes(path.join('agents', 'test-agent'))) return primaryCache as any;
        if (cachePath === path.join(TEST_BASE, 'embeddings.json')) return sharedCache as any;
        throw new Error('no embeddings');
      });

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        memories: [
          { id: 'agent-mem', type: 'learning', title: 'Agent memory' },
          { id: 'project-mem', type: 'decision', title: 'Project memory' },
        ],
      } as any);

      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);

      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'agent-mem', id2: 'project-mem', similarity: 0.88 },
      ]);

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
      const generateSpy = vi.spyOn(ollamaModule, 'generate').mockResolvedValue('related-to');

      const storeSpy = vi.spyOn(linkModule, 'storeCrossScopeEdge').mockResolvedValue({
        status: 'success',
        edge: { source: 'agent-mem', target: 'project-mem', label: 'related-to' },
      });

      await suggestLinks({
        basePath: TEST_AGENT_BASE,
        threshold: 0.7,
        autoLink: true,
        allScopes: true,
        llmType: true,
        agentName: 'test-agent',
      });

      expect(storeSpy).toHaveBeenCalledTimes(1);
      expect(generateSpy).toHaveBeenCalled();
      expect(storeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ relation: 'related-to' })
      );
    });

    it('only sets count fields when links are created', async () => {
      const mockCache = {
        memories: {
          'mem-1': { embedding: [0.1, 0.2, 0.3] },
          'mem-2': { embedding: [0.11, 0.21, 0.31] },
        },
      };

      vi.spyOn(embeddingModule, 'loadEmbeddingCache').mockResolvedValue(mockCache as any);

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        memories: [
          { id: 'mem-1', type: 'learning', title: 'Memory 1' },
          { id: 'mem-2', type: 'learning', title: 'Memory 2' },
        ],
      } as any);

      vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
        version: 1,
        nodes: [],
        edges: [],
      } as any);

      vi.spyOn(structureModule, 'hasNode').mockReturnValue(true);

      vi.spyOn(similarityModule, 'findPotentialDuplicates').mockReturnValue([
        { id1: 'mem-1', id2: 'mem-2', similarity: 0.95 },
      ]);

      vi.spyOn(resolverModule, 'getScopePath').mockResolvedValue(TEST_BASE);

      const result = await suggestLinks({
        basePath: TEST_BASE,
        threshold: 0.7,
        autoLink: false, // Not auto-linking
      });

      expect(result.status).toBe('success');
      expect(result.created).toBe(0);
      expect(result.createdSameScope).toBeUndefined();
      expect(result.createdCrossScope).toBeUndefined();
    });
  });
});
