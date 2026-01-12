/**
 * Tests for CLI Bulk Commands
 */

import * as fs from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdBulkLink, cmdBulkDelete, cmdExport, cmdImport } from './bulk.js';
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
