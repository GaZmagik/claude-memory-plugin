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
import { MemoryType, Scope } from '../../types/enums.js';

describe('cmdRead', () => {
  beforeEach(() => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          type: MemoryType.Decision,
          title: 'Test',
          tags: [],
          created: '2026-01-01',
          updated: '2026-01-01',
        },
        content: 'Test content',
        filePath: '/test/path/test-id.md',
      },
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

  it('passes agent flag to readMemory', async () => {
    const args: ParsedArgs = { positional: ['test-id'], flags: { agent: 'typescript-expert' } };
    await cmdRead(args);

    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-id',
        agent: 'typescript-expert',
        basePath: expect.stringContaining('agents/typescript-expert'),
      })
    );
  });

  it('resolves agent-scoped path when agent flag provided', async () => {
    const args: ParsedArgs = { positional: ['test-id'], flags: { agent: 'rust-expert' } };
    await cmdRead(args);

    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: expect.stringContaining('agents/rust-expert'),
      })
    );
  });
});

describe('cmdList', () => {
  beforeEach(() => {
    vi.spyOn(listModule, 'listMemories').mockResolvedValue({
      status: 'success',
      memories: [],
      count: 0,
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

  it('passes agent flag to listMemories', async () => {
    const args: ParsedArgs = { positional: [], flags: { agent: 'api-architect' } };
    await cmdList(args);

    expect(listModule.listMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'api-architect',
        basePath: expect.stringContaining('agents/api-architect'),
      })
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

  it('passes agent flag to deleteMemory', async () => {
    const args: ParsedArgs = { positional: ['memory-to-delete'], flags: { agent: 'python-expert' } };
    await cmdDelete(args);

    expect(deleteModule.deleteMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'memory-to-delete',
        agent: 'python-expert',
        basePath: expect.stringContaining('agents/python-expert'),
      })
    );
  });
});

describe('cmdSearch', () => {
  beforeEach(() => {
    vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
      status: 'success',
      results: [],
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

  it('passes agent flag to searchMemories', async () => {
    const args: ParsedArgs = { positional: ['query'], flags: { agent: 'frontend-expert' } };
    await cmdSearch(args);

    expect(searchModule.searchMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'query',
        agent: 'frontend-expert',
        basePath: expect.stringContaining('agents/frontend-expert'),
      })
    );
  });

  it('returns error when --all-agents used with --agent', async () => {
    const args: ParsedArgs = {
      positional: ['query'],
      flags: { 'all-agents': true, agent: 'typescript-expert' },
    };
    const result = await cmdSearch(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Cannot use --all-agents with --agent');
  });

  it('returns error when --all-agents used with --include-shared', async () => {
    const args: ParsedArgs = {
      positional: ['query'],
      flags: { 'all-agents': true, 'include-shared': true },
    };
    const result = await cmdSearch(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Cannot use --all-agents with --include-shared');
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

  it('passes agent flag to semanticSearchMemories', async () => {
    const args: ParsedArgs = { positional: ['query'], flags: { agent: 'nodejs-expert' } };
    await cmdSemantic(args);

    expect(semanticModule.semanticSearchMemories).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'query',
        agent: 'nodejs-expert',
        basePath: expect.stringContaining('agents/nodejs-expert'),
      })
    );
  });
});

describe('cmdWrite', () => {
  beforeEach(() => {
    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({
      status: 'success',
      memory: {
        id: 'new-memory-id',
        filePath: '/test/path/new-memory-id.md',
        frontmatter: {
          type: MemoryType.Decision,
          title: 'New Memory',
          tags: [],
          created: '2026-01-01',
          updated: '2026-01-01',
        },
        scope: Scope.Project,
      },
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
    expect(result.data).toBeDefined();
  });

  it('accepts global scope as alias for user', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { scope: 'global' } };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });

  it('accepts explicit project scope', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { scope: 'project' } };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });

  it('accepts enterprise scope', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { scope: 'enterprise' } };
    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
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

  it('passes agent flag to writeMemory', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Agent Memory',
      content: 'Test content for agent',
    });

    const args: ParsedArgs = { positional: [], flags: { agent: 'typescript-expert' } };
    await cmdWrite(args);

    expect(writeModule.writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'typescript-expert',
        basePath: expect.stringContaining('agents/typescript-expert'),
      })
    );
  });

  it('throws error for invalid agent names with helpful suggestion', async () => {
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Test',
      content: 'Test content',
    });

    const args: ParsedArgs = { positional: [], flags: { agent: 'invalid/name' } };

    await expect(cmdWrite(args)).rejects.toThrow('Agent name must be lowercase alphanumeric');
    await expect(cmdWrite(args)).rejects.toThrow('suggestion: invalid-name');
  });
});
