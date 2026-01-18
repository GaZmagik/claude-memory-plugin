/**
 * Tests for CLI Tag Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdTag, cmdUntag } from './tags.js';
import * as tagModule from '../../core/tag.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdTag', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdTag(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('returns error when no tags provided', async () => {
    const args: ParsedArgs = { positional: ['my-id'], flags: {} };
    const result = await cmdTag(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('at least one tag');
  });

  it('calls tagMemory with id and single tag', async () => {
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = { positional: ['my-id', 'typescript'], flags: {} };
    const result = await cmdTag(args);

    expect(result.status).toBe('success');
    expect(tagModule.tagMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-id',
        tags: ['typescript'],
      })
    );
  });

  it('calls tagMemory with multiple tags', async () => {
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = {
      positional: ['my-id', 'typescript', 'architecture', 'feature-001'],
      flags: {},
    };
    const result = await cmdTag(args);

    expect(result.status).toBe('success');
    expect(tagModule.tagMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-id',
        tags: ['typescript', 'architecture', 'feature-001'],
      })
    );
  });

  it('passes scope to basePath resolution', async () => {
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = {
      positional: ['my-id', 'test'],
      flags: { scope: 'local' },
    };
    await cmdTag(args);

    expect(tagModule.tagMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });

  it('accepts user scope', async () => {
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = {
      positional: ['my-id', 'test'],
      flags: { scope: 'user' },
    };
    const result = await cmdTag(args);

    expect(result.status).toBe('success');
  });

  it('accepts global scope as alias for user', async () => {
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = {
      positional: ['my-id', 'test'],
      flags: { scope: 'global' },
    };
    const result = await cmdTag(args);

    expect(result.status).toBe('success');
  });

  it('accepts explicit project scope', async () => {
    vi.spyOn(tagModule, 'tagMemory').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = {
      positional: ['my-id', 'test'],
      flags: { scope: 'project' },
    };
    const result = await cmdTag(args);

    expect(result.status).toBe('success');
  });
});

describe('cmdUntag', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdUntag(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('returns error when no tags provided', async () => {
    const args: ParsedArgs = { positional: ['my-id'], flags: {} };
    const result = await cmdUntag(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('at least one tag');
  });

  it('calls untagMemory with id and tags', async () => {
    vi.spyOn(tagModule, 'untagMemory').mockResolvedValue({ status: 'success' });

    const args: ParsedArgs = {
      positional: ['my-id', 'old-tag', 'stale-tag'],
      flags: {},
    };
    const result = await cmdUntag(args);

    expect(result.status).toBe('success');
    expect(tagModule.untagMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'my-id',
        tags: ['old-tag', 'stale-tag'],
      })
    );
  });
});
