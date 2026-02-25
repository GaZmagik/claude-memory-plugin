/**
 * Tests for CLI Bulk Commands
 */

import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdBulkLink, cmdBulkDelete, cmdExport, cmdImport, cmdBulkMove, cmdBulkTag, cmdBulkUnlink, cmdBulkPromote } from './bulk.js';
import * as bulkModule from '../../bulk/index.js';
import * as exportModule from '../../core/export.js';
import * as importModule from '../../core/import.js';
import * as parserModule from '../parser.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdBulkLink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when target is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdBulkLink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: target');
  });

  it('returns error when no source specified', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue(undefined);

    const args: ParsedArgs = { positional: ['hub-target'], flags: {} };
    const result = await cmdBulkLink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Must specify');
  });

  it('calls bulkLink with pattern', async () => {
    vi.spyOn(bulkModule, 'bulkLink').mockResolvedValue({
      created: 3,
      existing: 0,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: ['hub-decisions'],
      flags: { pattern: 'decision-*' },
    };
    const result = await cmdBulkLink(args);

    expect(result.status).toBe('success');
    expect(bulkModule.bulkLink).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'hub-decisions',
        sourcePattern: 'decision-*',
      })
    );
  });

  it('calls bulkLink with ids flag', async () => {
    vi.spyOn(bulkModule, 'bulkLink').mockResolvedValue({
      created: 2,
      existing: 0,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: ['target'],
      flags: { ids: 'id1,id2,id3' },
    };
    await cmdBulkLink(args);

    expect(bulkModule.bulkLink).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIds: ['id1', 'id2', 'id3'],
      })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(bulkModule, 'bulkLink').mockResolvedValue({} as any);

    const args: ParsedArgs = {
      positional: ['target'],
      flags: { pattern: 'test-*', 'dry-run': true },
    };
    await cmdBulkLink(args);

    expect(bulkModule.bulkLink).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });
});

describe('cmdBulkDelete', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when no filter specified', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue(undefined);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdBulkDelete(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Must specify');
  });

  it('calls bulkDelete with pattern', async () => {
    vi.spyOn(bulkModule, 'bulkDelete').mockResolvedValue({
      deleted: 5,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { pattern: 'breadcrumb-*' },
    };
    const result = await cmdBulkDelete(args);

    expect(result.status).toBe('success');
    expect(bulkModule.bulkDelete).toHaveBeenCalledWith(
      expect.objectContaining({ pattern: 'breadcrumb-*' })
    );
  });

  it('calls bulkDelete with tags', async () => {
    vi.spyOn(bulkModule, 'bulkDelete').mockResolvedValue({
      deleted: 3,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { tags: 'stale,temporary' },
    };
    await cmdBulkDelete(args);

    expect(bulkModule.bulkDelete).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['stale', 'temporary'] })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(bulkModule, 'bulkDelete').mockResolvedValue({} as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { pattern: 'test-*', 'dry-run': true },
    };
    await cmdBulkDelete(args);

    expect(bulkModule.bulkDelete).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });
});

describe('cmdExport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls exportMemories', async () => {
    vi.spyOn(exportModule, 'exportMemories').mockResolvedValue({
      status: 'success',
      exported: 10,
    } as any);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdExport(args);

    expect(result.status).toBe('success');
    expect(exportModule.exportMemories).toHaveBeenCalled();
  });

  it('accepts scope positional arg', async () => {
    vi.spyOn(exportModule, 'exportMemories').mockResolvedValue({
      status: 'success',
    } as any);

    const args: ParsedArgs = { positional: ['local'], flags: {} };
    await cmdExport(args);

    expect(exportModule.exportMemories).toHaveBeenCalled();
  });
});

describe('cmdImport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when no file specified', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdImport(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: file');
  });

  it('calls importMemories with file content', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"version":"1.0","memories":[]}');
    vi.spyOn(importModule, 'importMemories').mockResolvedValue({
      status: 'success',
      importedCount: 5,
    } as any);

    const args: ParsedArgs = { positional: ['backup.json'], flags: {} };
    const result = await cmdImport(args);

    expect(result.status).toBe('success');
    expect(fs.readFileSync).toHaveBeenCalledWith('backup.json', 'utf8');
    expect(importModule.importMemories).toHaveBeenCalled();
  });

  it('passes merge strategy by default', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"version":"1.0","memories":[]}');
    vi.spyOn(importModule, 'importMemories').mockResolvedValue({
      status: 'success',
    } as any);

    const args: ParsedArgs = { positional: ['backup.json'], flags: {} };
    await cmdImport(args);

    expect(importModule.importMemories).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: 'merge' })
    );
  });

  it('passes replace strategy when flag set', async () => {
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{"version":"1.0","memories":[]}');
    vi.spyOn(importModule, 'importMemories').mockResolvedValue({
      status: 'success',
    } as any);

    const args: ParsedArgs = { positional: ['backup.json'], flags: { replace: true } };
    await cmdImport(args);

    expect(importModule.importMemories).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: 'replace' })
    );
  });
});

describe('cmdBulkMove', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when --to flag is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdBulkMove(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required flag: --to');
  });

  it('returns error when no filter specified', async () => {
    const args: ParsedArgs = { positional: [], flags: { to: 'local' } };
    const result = await cmdBulkMove(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Must specify --pattern, --tags, or --type');
  });

  it('calls bulkMove with pattern', async () => {
    vi.spyOn(bulkModule, 'bulkMove').mockResolvedValue({
      moved: 3,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { to: 'local', pattern: 'learning-*' },
    };
    const result = await cmdBulkMove(args);

    expect(result.status).toBe('success');
    expect(bulkModule.bulkMove).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'learning-*',
      })
    );
  });

  it('calls bulkMove with type filter', async () => {
    vi.spyOn(bulkModule, 'bulkMove').mockResolvedValue({
      moved: 5,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { to: 'global', type: 'decision' },
    };
    await cmdBulkMove(args);

    expect(bulkModule.bulkMove).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'decision' })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(bulkModule, 'bulkMove').mockResolvedValue({} as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { to: 'local', pattern: 'test-*', 'dry-run': true },
    };
    await cmdBulkMove(args);

    expect(bulkModule.bulkMove).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });
});

describe('cmdBulkTag', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when --pattern is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: { add: 'tag1' } };
    const result = await cmdBulkTag(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Must specify --pattern');
  });

  it('returns error when no tags specified', async () => {
    const args: ParsedArgs = { positional: [], flags: { pattern: 'learning-*' } };
    const result = await cmdBulkTag(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Must specify --add or --remove');
  });

  it('calls bulkTag with add tags', async () => {
    vi.spyOn(bulkModule, 'bulkTag').mockResolvedValue({
      updated: 4,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { pattern: 'decision-*', add: 'important,reviewed' },
    };
    const result = await cmdBulkTag(args);

    expect(result.status).toBe('success');
    expect(bulkModule.bulkTag).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'decision-*',
        addTags: ['important', 'reviewed'],
      })
    );
  });

  it('calls bulkTag with remove tags', async () => {
    vi.spyOn(bulkModule, 'bulkTag').mockResolvedValue({
      updated: 2,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { pattern: 'learning-*', remove: 'stale,draft' },
    };
    await cmdBulkTag(args);

    expect(bulkModule.bulkTag).toHaveBeenCalledWith(
      expect.objectContaining({
        removeTags: ['stale', 'draft'],
      })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(bulkModule, 'bulkTag').mockResolvedValue({} as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { pattern: 'test-*', add: 'tag1', 'dry-run': true },
    };
    await cmdBulkTag(args);

    expect(bulkModule.bulkTag).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });
});

describe('cmdBulkUnlink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when --from flag is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: { pattern: 'test-*' } };
    const result = await cmdBulkUnlink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required flag: --from');
  });

  it('returns error when --pattern is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: { from: 'hub-target' } };
    const result = await cmdBulkUnlink(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Must specify --pattern');
  });

  it('calls bulkUnlink with pattern and target', async () => {
    vi.spyOn(bulkModule, 'bulkUnlink').mockResolvedValue({
      removed: 3,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { from: 'hub-decisions', pattern: 'decision-*' },
    };
    const result = await cmdBulkUnlink(args);

    expect(result.status).toBe('success');
    expect(bulkModule.bulkUnlink).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'hub-decisions',
        pattern: 'decision-*',
      })
    );
  });

  it('passes relation filter', async () => {
    vi.spyOn(bulkModule, 'bulkUnlink').mockResolvedValue({} as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { from: 'hub', pattern: 'test-*', relation: 'relates-to' },
    };
    await cmdBulkUnlink(args);

    expect(bulkModule.bulkUnlink).toHaveBeenCalledWith(
      expect.objectContaining({ relation: 'relates-to' })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(bulkModule, 'bulkUnlink').mockResolvedValue({} as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { from: 'hub', pattern: 'test-*', 'dry-run': true },
    };
    await cmdBulkUnlink(args);

    expect(bulkModule.bulkUnlink).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });
});

describe('cmdBulkPromote', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when --to flag is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: { pattern: 'test-*' } };
    const result = await cmdBulkPromote(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required flag: --to');
  });

  it('returns error when target type is invalid', async () => {
    const args: ParsedArgs = { positional: [], flags: { to: 'invalid-type', pattern: 'test-*' } };
    const result = await cmdBulkPromote(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Invalid target type');
  });

  it('returns error when no filter specified', async () => {
    const args: ParsedArgs = { positional: [], flags: { to: 'decision' } };
    const result = await cmdBulkPromote(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Must specify --pattern, --tags, or --type');
  });

  it('calls bulkPromote with pattern', async () => {
    vi.spyOn(bulkModule, 'bulkPromote').mockResolvedValue({
      promoted: 2,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { to: 'decision', pattern: 'learning-*' },
    };
    const result = await cmdBulkPromote(args);

    expect(result.status).toBe('success');
    expect(bulkModule.bulkPromote).toHaveBeenCalledWith(
      expect.objectContaining({
        pattern: 'learning-*',
        targetType: 'decision',
      })
    );
  });

  it('calls bulkPromote with source type filter', async () => {
    vi.spyOn(bulkModule, 'bulkPromote').mockResolvedValue({
      promoted: 5,
      failed: 0,
    } as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { to: 'artifact', type: 'learning' },
    };
    await cmdBulkPromote(args);

    expect(bulkModule.bulkPromote).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'learning' })
    );
  });

  it('passes dry-run flag', async () => {
    vi.spyOn(bulkModule, 'bulkPromote').mockResolvedValue({} as any);

    const args: ParsedArgs = {
      positional: [],
      flags: { to: 'decision', pattern: 'test-*', 'dry-run': true },
    };
    await cmdBulkPromote(args);

    expect(bulkModule.bulkPromote).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });
});
