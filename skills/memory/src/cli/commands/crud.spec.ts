/**
 * Tests for CLI CRUD Commands
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cmdWrite, cmdRead, cmdList, cmdDelete, cmdSearch, cmdSemantic } from './crud.js';
import * as writeModule from '../../core/write.js';
import * as readModule from '../../core/read.js';
import * as listModule from '../../core/list.js';
import * as deleteModule from '../../core/delete.js';
import * as searchModule from '../../core/search.js';
import * as semanticModule from '../../core/semantic-search.js';
import * as parserModule from '../parser.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdRead', () => {
  beforeEach(() => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      id: 'test-id',
      frontmatter: {
        type: 'decision',
        title: 'Test',
        tags: [],
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      content: 'Test content',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdRead(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('calls readMemory with correct id', async () => {
    const args: ParsedArgs = { positional: ['my-memory-id'], flags: {} };
    const result = await cmdRead(args);

    expect(result.status).toBe('success');
    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'my-memory-id' })
    );
  });

  it('passes scope flag to basePath resolution', async () => {
    const args: ParsedArgs = { positional: ['test-id'], flags: { scope: 'local' } };
    await cmdRead(args);

    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-id',
        basePath: expect.stringContaining('.claude/memory'),
      })
    );
  });
});

describe('cmdList', () => {
  beforeEach(() => {
    vi.spyOn(listModule, 'listMemories').mockResolvedValue({
      status: 'success',
      memories: [],
      total: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls listMemories with no filters when no args', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdList(args);

    expect(result.status).toBe('success');
    expect(listModule.listMemories).toHaveBeenCalled();
  });

  it('passes type filter from positional arg', async () => {
    const args: ParsedArgs = { positional: ['decision'], flags: {} };
    await cmdList(args);

    expect(listModule.listMemories).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'decision' })
    );
  });

  it('passes tag filter from second positional arg', async () => {
    const args: ParsedArgs = { positional: ['decision', 'typescript'], flags: {} };
    await cmdList(args);

    expect(listModule.listMemories).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'typescript' })
    );
  });

  it('passes limit flag', async () => {
    const args: ParsedArgs = { positional: [], flags: { limit: '20' } };
    await cmdList(args);

    expect(listModule.listMemories).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20 })
    );
  });
});

describe('cmdDelete', () => {
  beforeEach(() => {
    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({
      status: 'success',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when id is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdDelete(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: id');
  });

  it('calls deleteMemory with correct id', async () => {
    const args: ParsedArgs = { positional: ['memory-to-delete'], flags: {} };
    const result = await cmdDelete(args);

    expect(result.status).toBe('success');
    expect(deleteModule.deleteMemory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'memory-to-delete' })
    );
  });
});

describe('cmdSearch', () => {
  beforeEach(() => {
    vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
      status: 'success',
      results: [],
      total: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when query is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSearch(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: query');
  });

  it('calls searchMemories with query', async () => {
    const args: ParsedArgs = { positional: ['typescript patterns'], flags: {} };
    const result = await cmdSearch(args);

    expect(result.status).toBe('success');
    expect(searchModule.searchMemories).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'typescript patterns' })
    );
  });

  it('passes limit and type flags', async () => {
    const args: ParsedArgs = {
      positional: ['test'],
      flags: { limit: '5', type: 'decision' },
    };
    await cmdSearch(args);

    expect(searchModule.searchMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'test',
        limit: 5,
        type: 'decision',
      })
    );
  });
});

describe('cmdSemantic', () => {
  beforeEach(() => {
    vi.spyOn(semanticModule, 'semanticSearchMemories').mockResolvedValue({
      status: 'success',
      results: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when query is missing', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSemantic(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required argument: query');
  });

  it('calls semanticSearchMemories with query', async () => {
    const args: ParsedArgs = { positional: ['how to handle errors'], flags: {} };
    const result = await cmdSemantic(args);

    expect(result.status).toBe('success');
    expect(semanticModule.semanticSearchMemories).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'how to handle errors' })
    );
  });

  it('passes threshold and limit flags with defaults', async () => {
    const args: ParsedArgs = { positional: ['test'], flags: {} };
    await cmdSemantic(args);

    expect(semanticModule.semanticSearchMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 0.5,
        limit: 10,
      })
    );
  });

  it('overrides threshold and limit from flags', async () => {
    const args: ParsedArgs = {
      positional: ['test'],
      flags: { threshold: '0.8', limit: '5' },
    };
    await cmdSemantic(args);

    expect(semanticModule.semanticSearchMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 0.8,
        limit: 5,
      })
    );
  });
});

describe('cmdWrite', () => {
  beforeEach(() => {
    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'success',
      id: 'new-memory-id',
      path: '/test/path',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns error when no stdin input', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue(undefined);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('No JSON input provided');
  });

  it('returns error when title is missing', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      content: 'Some content',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required field: title');
  });

  it('returns error when content is missing', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test Title',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Missing required field: content');
  });

  it('calls writeMemory with valid input', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'My Decision',
      content: 'We decided to use TypeScript.',
      type: 'decision',
      tags: ['typescript', 'architecture'],
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Decision',
        content: 'We decided to use TypeScript.',
        type: 'decision',
        tags: ['typescript', 'architecture'],
      })
    );
  });

  it('defaults type to decision when not specified', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    await cmdWrite(args);

    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'decision',
      })
    );
  });

  it('respects auto-link flag', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { 'auto-link': true } };
    await cmdWrite(args);

    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        autoLink: true,
      })
    );
  });

  it('accepts user scope', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { scope: 'user' } };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
  });

  it('accepts global scope as alias for user', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { scope: 'global' } };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
  });

  it('accepts explicit project scope', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { scope: 'project' } };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
  });

  it('accepts enterprise scope', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { scope: 'enterprise' } };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
  });

  it('accepts learning type', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
      type: 'learning',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'learning' })
    );
  });

  it('accepts artifact type', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
      type: 'artifact',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'artifact' })
    );
  });

  it('accepts gotcha type', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
      type: 'gotcha',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'gotcha' })
    );
  });

  it('accepts breadcrumb type', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
      type: 'breadcrumb',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'breadcrumb' })
    );
  });

  it('accepts hub type', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
      type: 'hub',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'hub' })
    );
  });
});
