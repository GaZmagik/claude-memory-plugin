/**
 * Tests for CLI Utility Commands
 */

import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdRename, cmdMove, cmdPromote, cmdArchive, cmdStatus } from './utility.js';
import * as renameModule from '../../maintenance/rename.js';
import * as moveModule from '../../maintenance/move.js';
import * as promoteModule from '../../maintenance/promote.js';
import * as archiveModule from '../../maintenance/archive.js';
import * as structureModule from '../../graph/structure.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdRename', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when old id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdRename(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required arguments');
  });

  it('returns error when new id is missing', async () => {
    const args: ParsedArgs = { positional: ['old-id'], flags: {} };
    const result = await cmdRename(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required arguments');
  });

  it('calls renameMemory with old and new ids', async () => {
    vi.spyOn(renameModule, 'renameMemory').mockResolvedValue({
      status: 'success',
      oldId: 'old-id',
      newId: 'new-id',
    } as any);

    const args: ParsedArgs = { positional: ['old-id', 'new-id'], flags: {} };
    const result = await cmdRename(args);

    expect(result.status).toBe('success');
    expect(renameModule.renameMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        oldId: 'old-id',
        newId: 'new-id',
      })
    );
  });
});

describe('cmdMove', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdMove(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('returns error when target scope is missing', async () => {
    const args: ParsedArgs = { positional: ['my-id'], flags: {} };
    const result = await cmdMove(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: target scope');
  });

  it('calls moveMemory with id and target scope when --scope provided', async () => {
    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({
      status: 'success',
      movedTo: 'global',
    } as any);

    // Provide explicit --scope to skip auto-detection
    const args: ParsedArgs = { positional: ['my-id', 'global'], flags: { scope: 'project' } };
    const result = await cmdMove(args);

    expect(result.status).toBe('success');
    expect(moveModule.moveMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-id',
        targetScope: 'global',
      })
    );
  });

  it('auto-detects source scope when memory exists in different scope', async () => {
    // Mock fs.existsSync to simulate memory found in project scope
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      const pathStr = String(p);
      // Simulate memory exists in project/permanent
      return pathStr.includes('/permanent/my-id.md') && pathStr.includes('.claude/memory') && !pathStr.includes('/local/');
    });

    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({
      status: 'success',
      id: 'my-id',
      changes: {
        fileMoved: true,
        sourceGraphUpdated: true,
        targetGraphUpdated: true,
        sourceIndexUpdated: true,
        targetIndexUpdated: true,
      },
    } as any);

    // No --scope flag provided, should auto-detect
    const args: ParsedArgs = { positional: ['my-id', 'local'], flags: {} };
    const result = await cmdMove(args);

    // Should succeed - implementation will search all scopes
    expect(result.status).toBe('success');
    expect(moveModule.moveMemory).toHaveBeenCalled();
  });

  it('returns error when memory not found in any scope', async () => {
    // Mock fs.existsSync to return false for all paths
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const args: ParsedArgs = { positional: ['nonexistent-id', 'global'], flags: {} };
    const result = await cmdMove(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Memory not found in any scope');
  });
});

describe('cmdPromote', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdPromote(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('returns error when target type is missing', async () => {
    const args: ParsedArgs = { positional: ['my-id'], flags: {} };
    const result = await cmdPromote(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: target type');
  });

  it('returns error for invalid type', async () => {
    const args: ParsedArgs = { positional: ['my-id', 'invalid-type'], flags: {} };
    const result = await cmdPromote(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Invalid type');
  });

  it('calls promoteMemory with id and valid type', async () => {
    vi.spyOn(promoteModule, 'promoteMemory').mockResolvedValue({
      status: 'success',
      previousType: 'learning',
      newType: 'gotcha',
    } as any);

    const args: ParsedArgs = { positional: ['my-learning', 'gotcha'], flags: {} };
    const result = await cmdPromote(args);

    expect(result.status).toBe('success');
    expect(promoteModule.promoteMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-learning',
        targetType: 'gotcha',
      })
    );
  });

  it('accepts all valid memory types', async () => {
    vi.spyOn(promoteModule, 'promoteMemory').mockResolvedValue({
      status: 'success',
    } as any);

    const validTypes = ['decision', 'learning', 'artifact', 'gotcha', 'breadcrumb', 'hub'];

    for (const type of validTypes) {
      const args: ParsedArgs = { positional: ['mem-id', type], flags: {} };
      const result = await cmdPromote(args);
      expect(result.status).toBe('success');
    }
  });
});

describe('cmdArchive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdArchive(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('calls archiveMemory with id', async () => {
    vi.spyOn(archiveModule, 'archiveMemory').mockResolvedValue({
      status: 'success',
      archived: true,
    } as any);

    const args: ParsedArgs = { positional: ['old-memory'], flags: {} };
    const result = await cmdArchive(args);

    expect(result.status).toBe('success');
    expect(archiveModule.archiveMemory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'old-memory' })
    );
  });
});

describe('cmdStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns status for all scopes', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['a.md', 'b.md'] as any);
    vi.spyOn(structureModule, 'loadGraph').mockResolvedValue({
      version: 1,
      nodes: [],
      edges: [{ source: 'a', target: 'b' }],
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdStatus(args);

    expect(result.status).toBe('success');
    expect(result.data).toHaveProperty('project');
    expect(result.data).toHaveProperty('local');
    expect(result.data).toHaveProperty('global');
    expect(result.data).toHaveProperty('total_memories');
    expect(result.data).toHaveProperty('total_edges');
  });

  it('handles missing directories gracefully', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(structureModule, 'loadGraph').mockRejectedValue(new Error('No graph'));

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdStatus(args);

    expect(result.status).toBe('success');
    expect((result.data as any).total_memories).toBe(0);
  });
});
