/**
 * Tests for CLI Maintenance Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdSync, cmdRepair, cmdRebuild, cmdReindex, cmdPrune, cmdSyncFrontmatter, cmdRefresh } from './maintenance.js';
import * as syncModule from '../../maintenance/sync.js';
import * as pruneModule from '../../maintenance/prune.js';
import * as reindexModule from '../../maintenance/reindex.js';
import * as syncFrontmatterModule from '../../maintenance/sync-frontmatter.js';
import * as refreshFrontmatterModule from '../../maintenance/refresh-frontmatter/index.js';
import * as indexModule from '../../core/index.js';
import * as healthModule from '../../quality/health.js';
import * as readModule from '../../core/read.js';
import * as embeddingModule from '../../search/embedding.js';
import * as scoreEdgesModule from '../../graph/score-edges.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdSync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls syncMemories with onProgress callback', async () => {
    vi.spyOn(syncModule, 'syncMemories').mockResolvedValue({
      status: 'success',
      changes: {
        addedToGraph: [],
        addedToIndex: [],
        removedGhostNodes: [],
        removedOrphanEdges: 0,
        removedFromIndex: [],
        removedOrphanEmbeddings: [],
        externalNodesAdded: [],
        externalNodesUpdated: [],
        externalNodesRemoved: [],
      },
      summary: { filesOnDisk: 0, nodesInGraph: 0, entriesInIndex: 0, entriesInEmbeddings: 0, externalRuleNodes: 0, externalReminderNodes: 0 },
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSync(args);

    expect(result.status).toBe('success');
    expect(syncModule.syncMemories).toHaveBeenCalledWith(
      expect.objectContaining({ onProgress: expect.any(Function) })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(syncModule, 'syncMemories').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: [], flags: { 'dry-run': true } };
    await cmdSync(args);

    expect(syncModule.syncMemories).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });

  it('accepts scope as positional arg', async () => {
    vi.spyOn(syncModule, 'syncMemories').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: ['local'], flags: {} };
    await cmdSync(args);

    expect(syncModule.syncMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });
});

describe('cmdRepair', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs sync then health check with onProgress wired', async () => {
    vi.spyOn(syncModule, 'syncMemories').mockResolvedValue({
      added: 1,
      removed: 0,
      updated: 2,
    } as any);
    vi.spyOn(healthModule, 'checkHealth').mockResolvedValue({
      status: 'healthy',
      score: 100,
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdRepair(args);

    expect(result.status).toBe('success');
    expect(syncModule.syncMemories).toHaveBeenCalledWith(
      expect.objectContaining({ onProgress: expect.any(Function) })
    );
    expect(healthModule.checkHealth).toHaveBeenCalled();
    expect(result.data).toHaveProperty('sync');
    expect(result.data).toHaveProperty('health');
  });

  it('sets repaired=false for dry run', async () => {
    vi.spyOn(syncModule, 'syncMemories').mockResolvedValue({} as any);
    vi.spyOn(healthModule, 'checkHealth').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: [], flags: { 'dry-run': true } };
    const result = await cmdRepair(args);

    expect((result.data as any).repaired).toBe(false);
  });
});

describe('cmdRebuild', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls rebuildIndex', async () => {
    vi.spyOn(indexModule, 'rebuildIndex').mockResolvedValue({
      indexed: 10,
      errors: 0,
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdRebuild(args);

    expect(result.status).toBe('success');
    expect(indexModule.rebuildIndex).toHaveBeenCalled();
  });
});

describe('cmdReindex', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdReindex(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('calls reindexMemory with id', async () => {
    vi.spyOn(reindexModule, 'reindexMemory').mockResolvedValue({
      status: 'success',
    } as any);

    const args: ParsedArgs = { positional: ['orphan-id'], flags: {} };
    const result = await cmdReindex(args);

    expect(result.status).toBe('success');
    expect(reindexModule.reindexMemory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'orphan-id' })
    );
  });
});

describe('cmdPrune', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls pruneMemories', async () => {
    vi.spyOn(pruneModule, 'pruneMemories').mockResolvedValue({
      pruned: 3,
      remaining: 10,
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdPrune(args);

    expect(result.status).toBe('success');
    expect(pruneModule.pruneMemories).toHaveBeenCalled();
  });
});

describe('cmdSyncFrontmatter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls syncFrontmatter', async () => {
    vi.spyOn(syncFrontmatterModule, 'syncFrontmatter').mockResolvedValue({
      updated: 5,
      unchanged: 15,
      errors: 0,
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSyncFrontmatter(args);

    expect(result.status).toBe('success');
    expect(syncFrontmatterModule.syncFrontmatter).toHaveBeenCalled();
  });

  it('accepts scope positional', async () => {
    vi.spyOn(syncFrontmatterModule, 'syncFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: ['local'], flags: {} };
    await cmdSyncFrontmatter(args);

    expect(syncFrontmatterModule.syncFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });
});

describe('cmdRefresh', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls refreshFrontmatter with onProgress wired', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({
      updated: 5,
      unchanged: 15,
      errors: 0,
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdRefresh(args);

    expect(result.status).toBe('success');
    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({ onProgress: expect.any(Function) })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: [], flags: { 'dry-run': true } };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });

  it('passes project filter', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: [], flags: { project: 'my-project' } };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({ project: 'my-project' })
    );
  });

  it('passes id filter', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: [], flags: { id: 'specific-memory' } };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({ ids: ['specific-memory'] })
    );
  });

  it('accepts scope positional', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: ['local'], flags: {} };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });

  it('accepts user scope', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: ['user'], flags: {} };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });

  it('accepts explicit project scope', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: ['project'], flags: {} };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });

  it('accepts global scope as alias for user', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: ['global'], flags: {} };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });

  it('accepts enterprise scope', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    const args: ParsedArgs = { positional: ['enterprise'], flags: {} };
    await cmdRefresh(args);

    expect(refreshFrontmatterModule.refreshFrontmatter).toHaveBeenCalled();
  });

  it('generates embeddings when --embeddings flag is set', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({
      updated: 1,
      unchanged: 0,
      errors: 0,
    } as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-test',
          type: 'decision',
          title: 'Test',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: 'project',
          relativePath: 'permanent/decision-test.md',
        },
      ],
    } as any);

    vi.spyOn(embeddingModule, 'createOllamaProvider').mockReturnValue({
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
    } as any);

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: { type: 'decision', title: 'Test', tags: [], created: '', updated: '' },
        content: 'Test content',
        filePath: '/test/path.md',
      },
    } as any);

    vi.spyOn(embeddingModule, 'batchGenerateEmbeddings').mockResolvedValue([
      { id: 'decision-test', fromCache: false },
    ] as any);

    const args: ParsedArgs = { positional: [], flags: { embeddings: true } };
    const result = await cmdRefresh(args);

    expect(result.status).toBe('success');
    expect(embeddingModule.batchGenerateEmbeddings).toHaveBeenCalled();
    expect((result.data as any).embeddingsGenerated).toBe(1);
    expect((result.data as any).embeddingsCached).toBe(0);
    expect((result.data as any).embeddingsTotal).toBe(1);
  });

  it('skips temporary memories when generating embeddings', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'thought-temp',
          type: 'thought',
          title: 'Temp thought',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: 'project',
          relativePath: 'temporary/thought-temp.md',
        },
        {
          id: 'decision-test',
          type: 'decision',
          title: 'Test',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: 'project',
          relativePath: 'permanent/decision-test.md',
        },
      ],
    } as any);

    vi.spyOn(embeddingModule, 'createOllamaProvider').mockReturnValue({
      generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
    } as any);

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: { type: 'decision', title: 'Test', tags: [], created: '', updated: '' },
        content: 'Test content',
        filePath: '/test/path.md',
      },
    } as any);

    vi.spyOn(embeddingModule, 'batchGenerateEmbeddings').mockResolvedValue([
      { id: 'decision-test', fromCache: false },
    ] as any);

    const args: ParsedArgs = { positional: [], flags: { embeddings: true } };
    await cmdRefresh(args);

    // Should only process the decision, not the thought
    expect(readModule.readMemory).toHaveBeenCalledTimes(1);
    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'decision-test' })
    );
  });

  it('skips memories with failed read when generating embeddings', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-test',
          type: 'decision',
          title: 'Test',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: 'project',
          relativePath: 'permanent/decision-test.md',
        },
      ],
    } as any);

    vi.spyOn(embeddingModule, 'createOllamaProvider').mockReturnValue({} as any);

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'error',
      error: 'File not found',
    } as any);

    vi.spyOn(embeddingModule, 'batchGenerateEmbeddings').mockResolvedValue([] as any);

    const args: ParsedArgs = { positional: [], flags: { embeddings: true } };
    const result = await cmdRefresh(args);

    expect(result.status).toBe('success');
    // Empty array passed to batchGenerateEmbeddings since read failed
    expect(embeddingModule.batchGenerateEmbeddings).toHaveBeenCalledWith(
      [],
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('filters by id when generating embeddings', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
      version: '1.0.0',
      lastUpdated: '2026-01-01T00:00:00.000Z',
      memories: [
        {
          id: 'decision-one',
          type: 'decision',
          title: 'One',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: 'project',
          relativePath: 'permanent/decision-one.md',
        },
        {
          id: 'decision-two',
          type: 'decision',
          title: 'Two',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          scope: 'project',
          relativePath: 'permanent/decision-two.md',
        },
      ],
    } as any);

    vi.spyOn(embeddingModule, 'createOllamaProvider').mockReturnValue({} as any);

    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: { type: 'decision', title: 'One', tags: [], created: '', updated: '' },
        content: 'Content one',
        filePath: '/test/path.md',
      },
    } as any);

    vi.spyOn(embeddingModule, 'batchGenerateEmbeddings').mockResolvedValue([
      { id: 'decision-one', fromCache: false },
    ] as any);

    const args: ParsedArgs = { positional: [], flags: { embeddings: true, id: 'decision-one' } };
    await cmdRefresh(args);

    // Should only read the specified memory
    expect(readModule.readMemory).toHaveBeenCalledTimes(1);
    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'decision-one' })
    );
  });

  it('does not generate embeddings in dry-run mode', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);
    const loadIndexSpy = vi.spyOn(indexModule, 'loadIndex');

    const args: ParsedArgs = { positional: [], flags: { embeddings: true, 'dry-run': true } };
    await cmdRefresh(args);

    // Should not load index since dry-run skips embedding generation
    expect(loadIndexSpy).not.toHaveBeenCalled();
  });

  // T14: CLI integration — --score-edges delegates to scoreEdges()
  it('calls scoreEdges with correct params and merges edge counts into result', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);
    vi.spyOn(scoreEdgesModule, 'scoreEdges').mockResolvedValue({
      status: 'success',
      scored: 3,
      skipped: 1,
      noEmbedding: 2,
      verified: 0,
      applied: 0,
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { 'score-edges': true, verify: true, apply: false, force: false },
    };
    const result = await cmdRefresh(args);

    expect(result.status).toBe('success');
    expect(scoreEdgesModule.scoreEdges).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: false, verify: true, apply: false, force: false })
    );
    expect(result.data).toMatchObject({
      edgesScored: 3,
      edgesSkipped: 1,
      edgesNoEmbedding: 2,
      edgesVerified: 0,
      edgesApplied: 0,
    });
  });

  // T15: scoreEdges error status is surfaced as CLI error
  it('surfaces scoreEdges error status as CLI error', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);
    vi.spyOn(scoreEdgesModule, 'scoreEdges').mockResolvedValue({
      status: 'error',
      error: 'disk fail',
      scored: 0,
      skipped: 0,
      noEmbedding: 0,
      verified: 0,
      applied: 0,
    });

    const args: ParsedArgs = { positional: [], flags: { 'score-edges': true } };
    const result = await cmdRefresh(args);

    expect(result.status).toBe('error');
  });

  // T16: --embeddings and --score-edges both run when passed together
  it('runs both embedding generation and edge scoring when both flags are passed', async () => {
    vi.spyOn(refreshFrontmatterModule, 'refreshFrontmatter').mockResolvedValue({} as any);
    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({ version: '1.0.0', lastUpdated: '', memories: [] } as any);
    vi.spyOn(embeddingModule, 'createOllamaProvider').mockReturnValue({} as any);
    vi.spyOn(embeddingModule, 'batchGenerateEmbeddings').mockResolvedValue([
      { id: 'decision-one', fromCache: false },
    ] as any);
    vi.spyOn(scoreEdgesModule, 'scoreEdges').mockResolvedValue({
      status: 'success',
      scored: 2,
      skipped: 0,
      noEmbedding: 0,
      verified: 0,
      applied: 0,
    });

    const args: ParsedArgs = { positional: [], flags: { embeddings: true, 'score-edges': true } };
    const result = await cmdRefresh(args);

    expect(result.status).toBe('success');
    expect(embeddingModule.batchGenerateEmbeddings).toHaveBeenCalled();
    expect(scoreEdgesModule.scoreEdges).toHaveBeenCalled();
    expect(result.data).toMatchObject({
      embeddingsGenerated: 1,
      edgesScored: 2,
    });
  });
});
