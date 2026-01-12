/**
 * Tests for CLI Maintenance Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdSync, cmdRepair, cmdRebuild, cmdReindex, cmdPrune, cmdSyncFrontmatter } from './maintenance.js';
import * as syncModule from '../../maintenance/sync.js';
import * as pruneModule from '../../maintenance/prune.js';
import * as reindexModule from '../../maintenance/reindex.js';
import * as syncFrontmatterModule from '../../maintenance/sync-frontmatter.js';
import * as indexModule from '../../core/index.js';
import * as healthModule from '../../quality/health.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdSync', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls syncMemories', async () => {
    vi.spyOn(syncModule, 'syncMemories').mockResolvedValue({
      added: 0,
      removed: 0,
      updated: 0,
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSync(args);

    expect(result.status).toBe('success');
    expect(syncModule.syncMemories).toHaveBeenCalled();
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

  it('runs sync then health check', async () => {
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
    expect(syncModule.syncMemories).toHaveBeenCalled();
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
