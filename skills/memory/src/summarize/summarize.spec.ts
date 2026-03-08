/**
 * Tests for Core Summarisation Module
 *
 * Feature: 006-memory-summarize
 * Uses vi.spyOn() pattern throughout — no vi.mock() / mock.module().
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  truncateContent,
  buildChunks,
  buildPrompt,
  buildReducePrompt,
  buildFallbackListing,
  loadMemoryContents,
  mapReduceSummarize,
  summarize,
  MAX_MEMORY_CONTENT_CHARS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_LIMIT,
  type SummarizeRequest,
  type MemoryLoadEntry,
} from './summarize.js';
import * as ollamaModule from '../services/ollama.js';
import * as listModule from '../core/list.js';
import * as readModule from '../core/read.js';
import type { MemorySummary, ReadMemoryResponse } from '../types/api.js';
import { MemoryType, Scope } from '../types/enums.js';
import { unsafeAsMemoryId } from '../types/branded.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Typed helper for readMemory success responses — replaces `as any` casts (ME-1) */
function mockReadResponse(content: string, frontmatter: { type: string; title: string; tags: string[] }): ReadMemoryResponse {
  return {
    status: 'success' as const,
    memory: {
      content,
      frontmatter: {
        type: frontmatter.type as MemoryType,
        title: frontmatter.title,
        tags: frontmatter.tags,
        scope: Scope.Project,
        created: '2026-01-01T00:00:00Z',
        updated: '2026-01-01T00:00:00Z',
      },
      filePath: '/tmp/mock.md',
    },
  };
}

function makeMemorySummary(overrides: Partial<MemorySummary> = {}): MemorySummary {
  return {
    id: unsafeAsMemoryId('test-memory-abc'),
    type: MemoryType.Decision,
    title: 'Test Memory',
    tags: ['test'],
    scope: Scope.Project,
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
    relativePath: 'test-memory-abc.md',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<SummarizeRequest> = {}): SummarizeRequest {
  return {
    basePaths: ['/tmp/test-base'],
    mode: 'per-type',
    tags: [],
    limit: DEFAULT_LIMIT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    contextWindow: 16384,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// describe('truncateContent')
// ---------------------------------------------------------------------------

describe('truncateContent', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns content unchanged when within limit', () => {
    const content = 'Hello world, this is a short string.';
    expect(truncateContent(content, 100)).toBe(content);
  });

  it('truncates at word boundary and appends [...]', () => {
    // Build a string that is exactly 20 chars then a space then more words
    const prefix = 'Hello world is great'; // 20 chars
    const suffix = ' and has more content beyond the limit here';
    const content = prefix + suffix;
    const result = truncateContent(content, 20);
    // Last space before index 20 is at index 14 ("Hello world is")
    expect(result).toBe('Hello world is [...]');
  });

  it('hard-slices when no space exists before maxChars', () => {
    const content = 'AAAAAAAAAAAAAAAAAAAAEXTRA';
    const result = truncateContent(content, 20);
    // No space in first 20 chars → hard slice at 20
    expect(result).toBe('AAAAAAAAAAAAAAAAAAAA [...]');
  });
});

// ---------------------------------------------------------------------------
// describe('buildChunks')
// ---------------------------------------------------------------------------

describe('buildChunks', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  function makeMemoryContent(id: string, content: string) {
    return { id, type: 'decision', title: 'T', tags: [], content };
  }

  it('packs all memories into a single chunk when they fit', () => {
    const memories = [
      makeMemoryContent('a', 'short'),
      makeMemoryContent('b', 'also short'),
    ];
    const chunks = buildChunks(memories, 1000);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.memories).toHaveLength(2);
    expect(chunks[0]!.totalChars).toBe('short'.length + 'also short'.length);
  });

  it('splits into multiple chunks when budget exceeded', () => {
    const memories = [
      makeMemoryContent('a', 'A'.repeat(60)),
      makeMemoryContent('b', 'B'.repeat(60)),
      makeMemoryContent('c', 'C'.repeat(60)),
    ];
    const chunks = buildChunks(memories, 100);
    // Each 60-char memory fits alone; first two together = 120 > 100 → must split
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('preserves input order across chunks', () => {
    const memories = [
      makeMemoryContent('first', 'A'.repeat(60)),
      makeMemoryContent('second', 'B'.repeat(60)),
      makeMemoryContent('third', 'C'.repeat(60)),
    ];
    const chunks = buildChunks(memories, 100);
    const flatIds = chunks.flatMap((c: { memories: Array<{ id: string }> }) => c.memories.map((m: { id: string }) => m.id));
    expect(flatIds).toEqual(['first', 'second', 'third']);
  });

  it('places a single oversized memory in its own chunk', () => {
    const memories = [
      makeMemoryContent('huge', 'X'.repeat(200)),
    ];
    const chunks = buildChunks(memories, 100);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.memories[0]!.id).toBe('huge');
    expect(chunks[0]!.totalChars).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// describe('buildPrompt')
// ---------------------------------------------------------------------------

describe('buildPrompt', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  const memory = {
    id: 'mem-1',
    type: 'decision',
    title: 'Use ESM imports',
    tags: [],
    content: 'Always use .js extensions in ESM imports.',
  };

  it('builds per-type prompt with typeLabel', () => {
    const prompt = buildPrompt([memory], 'per-type', 'decision');
    expect(prompt).toContain('decision');
    expect(prompt).toContain('## Use ESM imports');
    expect(prompt).toContain('Always use .js extensions in ESM imports.');
    expect(prompt).toContain('Write a single paragraph summary:');
  });

  it('builds overview prompt without typeLabel', () => {
    const prompt = buildPrompt([memory], 'overview');
    expect(prompt).toContain('project memories');
    expect(prompt).toContain('## Use ESM imports [decision]');
    expect(prompt).toContain('Write a single paragraph summary:');
  });

  it('builds digest prompt for a single memory', () => {
    const prompt = buildPrompt([memory], 'digest');
    expect(prompt).toContain('detailed summary');
    expect(prompt).toContain('Memory: Use ESM imports');
    expect(prompt).toContain('Always use .js extensions in ESM imports.');
    expect(prompt).toContain('Write a detailed summary:');
  });
});

// ---------------------------------------------------------------------------
// describe('mapReduceSummarize')
// ---------------------------------------------------------------------------

describe('mapReduceSummarize', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  const memory = {
    id: 'mem-1',
    type: 'decision',
    title: 'ESM imports',
    tags: [],
    content: 'Use .js extensions.',
  };

  it('calls generate once for a single chunk and returns result', async () => {
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Single summary result');

    const chunks = [{ memories: [memory], totalChars: memory.content.length }];
    const result = await mapReduceSummarize(chunks, 'per-type', 'decision', DEFAULT_TIMEOUT_MS);

    expect(ollamaModule.generate).toHaveBeenCalledTimes(1);
    expect(result).toBe('Single summary result');
  });

  it('calls generate per chunk then once more for reduce on multiple chunks', async () => {
    vi.spyOn(ollamaModule, 'generate')
      .mockResolvedValueOnce('Chunk 1 summary')
      .mockResolvedValueOnce('Chunk 2 summary')
      .mockResolvedValueOnce('Final merged summary');

    const chunks = [
      { memories: [memory], totalChars: memory.content.length },
      { memories: [{ ...memory, id: 'mem-2' }], totalChars: memory.content.length },
    ];
    const result = await mapReduceSummarize(chunks, 'overview', undefined, DEFAULT_TIMEOUT_MS);

    expect(ollamaModule.generate).toHaveBeenCalledTimes(3);
    expect(result).toBe('Final merged summary');
  });

  it('passes timeoutMs to every generate() call', async () => {
    const customTimeout = 30_000;
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('ok');

    const chunks = [{ memories: [memory], totalChars: memory.content.length }];
    await mapReduceSummarize(chunks, 'per-type', 'decision', customTimeout);

    expect(ollamaModule.generate).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      customTimeout
    );
  });

  it('returns empty string when generate() returns empty response', async () => {
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('');

    const chunks = [{ memories: [memory], totalChars: memory.content.length }];
    const result = await mapReduceSummarize(chunks, 'overview', undefined, DEFAULT_TIMEOUT_MS);

    expect(result).toBe('');
  });

  it('filters empty generate results before reduce phase (H3 fix)', async () => {
    const genSpy = vi.spyOn(ollamaModule, 'generate')
      .mockResolvedValueOnce('')              // chunk 1: empty
      .mockResolvedValueOnce('Summary B')     // chunk 2: valid
      .mockResolvedValueOnce('Summary C')     // chunk 3: valid
      .mockResolvedValueOnce('Merged result'); // reduce

    const makeChunk = (id: string) => ({
      memories: [{ ...memory, id }],
      totalChars: memory.content.length,
    });
    const chunks = [makeChunk('c1'), makeChunk('c2'), makeChunk('c3')];
    const result = await mapReduceSummarize(chunks, 'overview', undefined, DEFAULT_TIMEOUT_MS);

    // 3 map calls + 1 reduce call = 4 total
    expect(genSpy).toHaveBeenCalledTimes(4);
    expect(result).toBe('Merged result');
    // Reduce prompt should contain only the 2 valid summaries, not an empty bullet
    const reducePrompt = genSpy.mock.calls[3]![0] as string;
    expect(reducePrompt).toContain('Summary B');
    expect(reducePrompt).toContain('Summary C');
    expect(reducePrompt).not.toContain('- \n');
  });
});

// ---------------------------------------------------------------------------
// describe('summarize')
// ---------------------------------------------------------------------------

describe('summarize', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  const baseSummary = makeMemorySummary();
  const gotchaSummary = makeMemorySummary({
    id: unsafeAsMemoryId('gotcha-async-abc'),
    type: MemoryType.Gotcha,
    title: 'Async gotcha',
    tags: ['async'],
  });

  function mockListSuccess(memories: MemorySummary[]) {
    vi.spyOn(listModule, 'listMemories').mockResolvedValue({
      status: 'success',
      memories,
      count: memories.length,
    });
  }

  // --- Fallback (Ollama unavailable) ---

  it('returns fallback listing when Ollama is unavailable', async () => {
    mockListSuccess([baseSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);

    const result = await summarize(makeRequest());

    expect(result.memories).toBeDefined();
    expect(result.memories).toHaveLength(1);
    expect(result.memories![0]!.id).toBe(baseSummary.id);
    expect(result.memoriesIncluded).toEqual([baseSummary.id]);
  });

  it('includes hint when falling back to listing', async () => {
    mockListSuccess([baseSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);

    const result = await summarize(makeRequest());

    expect(result.hint).toBeDefined();
    expect(result.hint).toContain('Ollama');
    expect(result.summaries).toBeUndefined();
    expect(result.summary).toBeUndefined();
  });

  // --- Empty corpus early return ---

  it('returns empty memoriesIncluded when no memories exist', async () => {
    mockListSuccess([]);
    // isAvailable should NOT be called in this path
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);

    const result = await summarize(makeRequest());

    expect(result.memoriesIncluded).toEqual([]);
    expect(ollamaModule.isAvailable).not.toHaveBeenCalled();
  });

  // --- Per-type mode ---

  it('returns summaries grouped by type in per-type mode', async () => {
    mockListSuccess([baseSummary, gotchaSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('Memory content here.', { type: 'decision', title: 'T', tags: [] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('A type summary');

    const result = await summarize(makeRequest({ mode: 'per-type' }));

    expect(result.summaries).toBeDefined();
    expect(Object.keys(result.summaries!)).toContain('decision');
    expect(Object.keys(result.summaries!)).toContain('gotcha');
    expect(result.summary).toBeUndefined();
  });

  it('filters by typeFilter in per-type mode', async () => {
    // Only return decision-type memories (typeFilter is passed to listMemories)
    mockListSuccess([baseSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('Content.', { type: 'decision', title: 'T', tags: [] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Filtered summary');

    const result = await summarize(makeRequest({ mode: 'per-type', typeFilter: MemoryType.Decision }));

    expect(result.summaries).toBeDefined();
    // typeFilter is passed to listMemories; mock only returns decision type
    expect(Object.keys(result.summaries!)).toContain('decision');
    expect(Object.keys(result.summaries!)).not.toContain('gotcha');
    // Verify typeFilter was passed through to listMemories
    expect(listModule.listMemories).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'decision' })
    );
  });

  // --- Overview mode ---

  it('returns single summary in overview mode', async () => {
    mockListSuccess([baseSummary, gotchaSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('Content.', { type: 'decision', title: 'T', tags: [] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Overview paragraph');

    const result = await summarize(makeRequest({ mode: 'overview' }));

    expect(result.summary).toBe('Overview paragraph');
    expect(result.summaries).toBeUndefined();
    expect(result.memoriesIncluded).toHaveLength(2);
  });

  // --- Digest mode ---

  it('returns single summary for digest mode', async () => {
    // listMemories not called in digest mode — only readMemory
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('We decided to use REST because...', { type: 'decision', title: 'API Design', tags: ['api'] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Digest summary text');

    const result = await summarize(makeRequest({
      mode: 'digest',
      digestId: 'decision-api-design-abc',
    }));

    expect(result.summary).toBe('Digest summary text');
    expect(result.memoriesIncluded).toEqual(['decision-api-design-abc']);
    expect(result.summaries).toBeUndefined();
  });

  it('returns empty memoriesIncluded when digest readMemory fails', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'error',
      error: 'Memory not found: bad-id',
    });

    const result = await summarize(makeRequest({
      mode: 'digest',
      digestId: 'bad-id',
    }));

    expect(result.memoriesIncluded).toEqual([]);
    expect(result.summary).toBeUndefined();
  });

  // --- readMemory failures are skipped ---

  it('skips memories where readMemory fails and excludes them from memoriesIncluded', async () => {
    const summaries = [
      makeMemorySummary({ id: unsafeAsMemoryId('good-mem'), title: 'Good' }),
      makeMemorySummary({ id: unsafeAsMemoryId('bad-mem'), title: 'Bad' }),
    ];
    mockListSuccess(summaries);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);

    // First call succeeds, second fails
    vi.spyOn(readModule, 'readMemory')
      .mockResolvedValueOnce(
        mockReadResponse('Good content', { type: 'decision', title: 'Good', tags: [] })
      )
      .mockResolvedValueOnce({
        status: 'error',
        error: 'Read failed',
      });

    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Summary');

    const result = await summarize(makeRequest({ mode: 'overview' }));

    expect(result.memoriesIncluded).toContain('good-mem');
    expect(result.memoriesIncluded).not.toContain('bad-mem');
  });

  // --- Content truncation ---

  it('truncates long memory content before building chunks', async () => {
    const longContent = 'X'.repeat(MAX_MEMORY_CONTENT_CHARS + 500);
    mockListSuccess([baseSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse(longContent, { type: 'decision', title: baseSummary.title, tags: [] })
    );

    let capturedPrompt = '';
    vi.spyOn(ollamaModule, 'generate').mockImplementation(async (prompt) => {
      capturedPrompt = prompt;
      return 'Summary';
    });

    await summarize(makeRequest({ mode: 'overview' }));

    // The prompt must not contain more than MAX_MEMORY_CONTENT_CHARS of content
    expect(capturedPrompt).toContain('[...]');
    expect(capturedPrompt.length).toBeLessThan(longContent.length);
  });

  // --- Timeout passthrough ---

  it('passes custom timeoutMs to generate()', async () => {
    mockListSuccess([baseSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('Content', { type: 'decision', title: baseSummary.title, tags: [] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('ok');

    const customTimeout = 45_000;
    await summarize(makeRequest({ mode: 'overview', timeoutMs: customTimeout }));

    expect(ollamaModule.generate).toHaveBeenCalledWith(
      expect.any(String),
      undefined,
      customTimeout
    );
  });

  // --- Multi-basePath deduplication ---

  it('deduplicates memories across multiple basePaths by ID', async () => {
    const duplicate = makeMemorySummary({ id: unsafeAsMemoryId('shared-mem') });
    vi.spyOn(listModule, 'listMemories').mockResolvedValue({
      status: 'success',
      memories: [duplicate],
      count: 1,
    });
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);

    const result = await summarize(makeRequest({
      basePaths: ['/tmp/path-a', '/tmp/path-b'],
    }));

    // shared-mem appears in both paths but should only appear once in memoriesIncluded
    expect(result.memoriesIncluded.filter(id => id === 'shared-mem')).toHaveLength(1);
  });

  // --- per-type with memoriesIncluded ---

  it('populates memoriesIncluded with all successfully loaded memory IDs', async () => {
    mockListSuccess([baseSummary, gotchaSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('Content', { type: 'decision', title: 'T', tags: [] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Summary');

    const result = await summarize(makeRequest({ mode: 'per-type' }));

    expect(result.memoriesIncluded).toContain(baseSummary.id);
    expect(result.memoriesIncluded).toContain(gotchaSummary.id);
  });

  // --- ME-7: Digest mode when Ollama unavailable ---

  it('returns empty memoriesIncluded with hint when digest mode and Ollama unavailable', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(false);

    const result = await summarize(makeRequest({
      mode: 'digest',
      digestId: 'decision-some-id-abc',
    }));

    expect(result.memoriesIncluded).toEqual([]);
    expect(result.hint).toBeDefined();
    expect(result.hint).toContain('Ollama');
    expect(result.summary).toBeUndefined();
  });

  // --- ME-7: LLM-path deduplication ---

  it('calls readMemory only once per unique ID across multiple basePaths', async () => {
    const sharedId = unsafeAsMemoryId('decision-shared-abc');
    const sharedSummary = makeMemorySummary({ id: sharedId, title: 'Shared' });

    // listMemories returns the same memory from both basePaths
    vi.spyOn(listModule, 'listMemories').mockResolvedValue({
      status: 'success',
      memories: [sharedSummary],
      count: 1,
    });
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    const readSpy = vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('Shared content', { type: 'decision', title: 'Shared', tags: [] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Summary');

    await summarize(makeRequest({
      mode: 'overview',
      basePaths: ['/tmp/path-a', '/tmp/path-b'],
    }));

    // Deduplication means readMemory is called once, not twice
    expect(readSpy).toHaveBeenCalledTimes(1);
  });

  // --- listMemories error for one basePath ---

  it('succeeds using memories from other basePath when one returns error', async () => {
    const mem = makeMemorySummary({ id: unsafeAsMemoryId('surviving-mem') });
    vi.spyOn(listModule, 'listMemories')
      .mockResolvedValueOnce({ status: 'error', error: 'index missing', memories: [], count: 0 })
      .mockResolvedValueOnce({ status: 'success', memories: [mem], count: 1 });
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue(
      mockReadResponse('Content', { type: 'decision', title: 'T', tags: [] })
    );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Summary');

    const result = await summarize(makeRequest({
      mode: 'overview',
      basePaths: ['/tmp/broken', '/tmp/working'],
    }));

    expect(result.memoriesIncluded).toContain('surviving-mem');
    expect(result.summary).toBe('Summary');
  });

  // --- All readMemory calls fail — overview mode ---

  it('returns empty memoriesIncluded when all readMemory calls fail in overview mode', async () => {
    mockListSuccess([baseSummary, gotchaSummary]);
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({ status: 'error', error: 'read failed' });

    const result = await summarize(makeRequest({ mode: 'overview' }));

    expect(result.memoriesIncluded).toEqual([]);
  });

  // --- Digest mode iterates basePaths (H1 fix) ---

  it('finds memory in second basePath when first fails in digest mode', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory')
      .mockResolvedValueOnce({ status: 'error', error: 'not found' })
      .mockResolvedValueOnce(
        mockReadResponse('Found it', { type: 'decision', title: 'Found', tags: [] })
      );
    vi.spyOn(ollamaModule, 'generate').mockResolvedValue('Digest from second path');

    const result = await summarize(makeRequest({
      mode: 'digest',
      digestId: 'my-id',
      basePaths: ['/tmp/empty', '/tmp/has-it'],
    }));

    expect(result.summary).toBe('Digest from second path');
    expect(result.memoriesIncluded).toEqual(['my-id']);
  });

  // --- Digest mode read failure returns hint (M6 fix) ---

  it('returns hint when readMemory fails for all basePaths in digest mode', async () => {
    vi.spyOn(ollamaModule, 'isAvailable').mockResolvedValue(true);
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({ status: 'error', error: 'not found' });

    const result = await summarize(makeRequest({
      mode: 'digest',
      digestId: 'my-id',
      basePaths: ['/tmp/a', '/tmp/b'],
    }));

    expect(result.memoriesIncluded).toEqual([]);
    expect(result.hint).toBe("Memory 'my-id' not found in any scope");
  });
});

// ---------------------------------------------------------------------------
// describe('buildReducePrompt')
// ---------------------------------------------------------------------------

describe('buildReducePrompt', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('produces prompt with all partial summaries prefixed with "- "', () => {
    const partials = ['Summary of chunk A.', 'Summary of chunk B.'];
    const prompt = buildReducePrompt(partials);

    expect(prompt).toContain('- Summary of chunk A.');
    expect(prompt).toContain('- Summary of chunk B.');
    expect(prompt).toContain('Merge the following partial summaries');
    expect(prompt).toContain('single merged summary');
  });
});

// ---------------------------------------------------------------------------
// describe('loadMemoryContents')
// ---------------------------------------------------------------------------

describe('loadMemoryContents', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns MemoryContent items for all successful entries with different basePaths', async () => {
    const entryA: MemoryLoadEntry = {
      summary: makeMemorySummary({ id: unsafeAsMemoryId('decision-alpha-abc'), title: 'Alpha' }),
      basePath: '/tmp/base-a',
    };
    const entryB: MemoryLoadEntry = {
      summary: makeMemorySummary({ id: unsafeAsMemoryId('learning-beta-def'), title: 'Beta', type: MemoryType.Learning }),
      basePath: '/tmp/base-b',
    };

    vi.spyOn(readModule, 'readMemory')
      .mockResolvedValueOnce(mockReadResponse('Alpha content', { type: 'decision', title: 'Alpha', tags: [] }))
      .mockResolvedValueOnce(mockReadResponse('Beta content', { type: 'learning', title: 'Beta', tags: [] }));

    const results = await loadMemoryContents([entryA, entryB]);

    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe('decision-alpha-abc');
    expect(results[1]!.id).toBe('learning-beta-def');
  });

  it('returns only successful items and writes stderr warning on failure', async () => {
    const goodEntry: MemoryLoadEntry = {
      summary: makeMemorySummary({ id: unsafeAsMemoryId('decision-good-abc'), title: 'Good' }),
      basePath: '/tmp/base-good',
    };
    const badEntry: MemoryLoadEntry = {
      summary: makeMemorySummary({ id: unsafeAsMemoryId('decision-bad-def'), title: 'Bad' }),
      basePath: '/tmp/base-bad',
    };

    vi.spyOn(readModule, 'readMemory')
      .mockResolvedValueOnce(mockReadResponse('Good content', { type: 'decision', title: 'Good', tags: [] }))
      .mockResolvedValueOnce({ status: 'error', error: 'File not found' });

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const results = await loadMemoryContents([goodEntry, badEntry]);

    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('decision-good-abc');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('decision-bad-def'));
  });
});

// ---------------------------------------------------------------------------
// describe('buildFallbackListing')
// ---------------------------------------------------------------------------

describe('buildFallbackListing', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('maps MemorySummary[] to FallbackListing[] with correct fields', () => {
    const summaries: MemorySummary[] = [
      makeMemorySummary({ id: unsafeAsMemoryId('decision-one-abc'), title: 'One', tags: ['a'] }),
      makeMemorySummary({ id: unsafeAsMemoryId('gotcha-two-def'), type: MemoryType.Gotcha, title: 'Two', tags: ['b', 'c'] }),
    ];

    const listings = buildFallbackListing(summaries);

    expect(listings).toHaveLength(2);
    expect(listings[0]).toEqual({ id: 'decision-one-abc', type: 'decision', title: 'One', tags: ['a'] });
    expect(listings[1]).toEqual({ id: 'gotcha-two-def', type: 'gotcha', title: 'Two', tags: ['b', 'c'] });
  });
});
