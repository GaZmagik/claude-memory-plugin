/**
 * Tests for CLI Suggest Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdSuggestLinks, cmdSummarize } from './suggest.js';
import * as suggestLinksModule from '../../suggest/suggest-links.js';
import * as summarizeModule from '../../summarize/summarize.js';
import * as helpersModule from '../helpers.js';
import * as ollamaModule from '../../services/ollama.js';
import * as agentDiscoveryModule from '../../core/agent-discovery.js';
import type { ParsedArgs } from '../parser.js';
import { Scope } from '../../types/enums.js';

describe('cmdSuggestLinks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockSuggestLinks(overrides: Partial<Awaited<ReturnType<typeof suggestLinksModule.suggestLinks>>> = {}) {
    return vi.spyOn(suggestLinksModule, 'suggestLinks').mockResolvedValue({
      status: 'success',
      suggestions: [],
      created: 0,
      skipped: 0,
      analysed: 0,
      ...overrides,
    });
  }

  it('calls suggestLinks with defaults', async () => {
    mockSuggestLinks();

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSuggestLinks(args);

    expect(result.status).toBe('success');
    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({
        threshold: 0.75,
        limit: 20,
        autoLink: false,
      })
    );
  });

  it('passes threshold flag', async () => {
    mockSuggestLinks();

    const args: ParsedArgs = { positional: [], flags: { threshold: '0.9' } };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 0.9 })
    );
  });

  it('passes limit flag', async () => {
    mockSuggestLinks();

    const args: ParsedArgs = { positional: [], flags: { limit: '10' } };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it('passes auto-link flag', async () => {
    mockSuggestLinks({ created: 5 });

    const args: ParsedArgs = { positional: [], flags: { 'auto-link': true } };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ autoLink: true })
    );
  });

  it('passes llm-type flag', async () => {
    mockSuggestLinks({ created: 1 });

    const args: ParsedArgs = {
      positional: [],
      flags: { 'auto-link': true, 'llm-type': true },
    };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ llmType: true })
    );
  });

  it('passes all-scopes flag', async () => {
    mockSuggestLinks();

    const args: ParsedArgs = { positional: [], flags: { 'all-scopes': true } };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ allScopes: true })
    );
  });
});

describe('cmdSummarize', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockSummarize(result: summarizeModule.SummarizeResult) {
    return vi.spyOn(summarizeModule, 'summarize').mockResolvedValue(result);
  }

  function mockScopePath(path = '/tmp/test-scope') {
    vi.spyOn(helpersModule, 'getResolvedScopePath').mockResolvedValue(path);
  }

  function mockContextWindow(value = 16384) {
    vi.spyOn(ollamaModule, 'readContextWindow').mockReturnValue(value);
  }

  function setupDefaults() {
    mockScopePath();
    mockContextWindow();
  }

  it('calls summarize with default parameters', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('success');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'per-type',
        tags: [],
        limit: 50,
        timeoutMs: 120_000,
        contextWindow: 16384,
      })
    );
  });

  it('passes --mode flag', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'overview', summary: 'Overview text', memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { mode: 'overview' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'overview' })
    );
  });

  it('uses positional arg as typeFilter when mode is not digest', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: { decision: 'Summary' }, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: ['decision'], flags: {} };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ typeFilter: 'decision' })
    );
  });

  it('uses positional arg as digestId in digest mode', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'digest', summary: 'Digest text', memoriesIncluded: ['mem-1'] });

    const args: ParsedArgs = { positional: ['mem-1'], flags: { mode: 'digest' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'digest', digestId: 'mem-1' })
    );
  });

  it('returns error when digest mode has no positional ID', async () => {
    setupDefaults();

    const args: ParsedArgs = { positional: [], flags: { mode: 'digest' } };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('digest mode requires a memory ID');
  });

  it('returns error when --include-shared used without --agent', async () => {
    setupDefaults();

    const args: ParsedArgs = { positional: [], flags: { 'include-shared': true } };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('--include-shared requires --agent');
  });

  it('passes comma-separated --tags as array', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { tags: 'important,api' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['important', 'api'] })
    );
  });

  it('passes --limit flag', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { limit: '100' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 })
    );
  });

  it('passes --timeout flag', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { timeout: '30000' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 30_000 })
    );
  });

  it('returns appropriate message for empty results', async () => {
    setupDefaults();
    mockSummarize({ kind: 'empty', memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('success');
    expect(result.message).toContain('No memories found');
  });

  it('returns hint message when Ollama is unavailable', async () => {
    setupDefaults();
    mockSummarize({
      kind: 'fallback',
      memories: [{ id: 'mem-1', type: 'decision', title: 'T', tags: [] }],
      memoriesIncluded: ['mem-1'],
      hint: 'Ollama is not available.',
    });

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('success');
    expect(result.message).toContain('LLM unavailable');
  });

  // --- Agent scope support (Phase C) ---

  it('resolves agent scope path when --agent is provided', async () => {
    mockContextWindow();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });
    vi.spyOn(helpersModule, 'resolveAgentScopePath').mockResolvedValue('/tmp/agents/ts-expert');

    const args: ParsedArgs = { positional: [], flags: { agent: 'ts-expert' } };
    await cmdSummarize(args);

    expect(helpersModule.resolveAgentScopePath).toHaveBeenCalledWith('ts-expert', undefined);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        basePaths: ['/tmp/agents/ts-expert'],
      })
    );
  });

  it('includes shared scope paths when --include-shared with --agent', async () => {
    mockContextWindow();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });
    vi.spyOn(helpersModule, 'resolveAgentScopePath').mockResolvedValue('/tmp/agents/ts-expert');
    vi.spyOn(helpersModule, 'resolveSharedScopePaths').mockResolvedValue([
      '/tmp/agents/ts-expert',
      '/tmp/local',
      '/tmp/project',
    ]);

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'ts-expert', 'include-shared': true },
    };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        basePaths: expect.arrayContaining(['/tmp/local', '/tmp/project']),
      })
    );
  });

  it('discovers all agents when --all-agents is used', async () => {
    mockContextWindow();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });
    vi.spyOn(agentDiscoveryModule, 'discoverAgents').mockResolvedValue([
      { name: 'agent-a', scope: Scope.AgentProject, memoryCount: 5, path: '/a' },
      { name: 'agent-b', scope: Scope.AgentProject, memoryCount: 3, path: '/b' },
    ]);
    vi.spyOn(helpersModule, 'resolveAgentScopePath')
      .mockResolvedValueOnce('/tmp/agents/agent-a')
      .mockResolvedValueOnce('/tmp/agents/agent-b');

    const args: ParsedArgs = { positional: [], flags: { 'all-agents': true } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        basePaths: ['/tmp/agents/agent-a', '/tmp/agents/agent-b'],
      })
    );
  });

  it('--all-agents takes precedence over --agent (silently ignores)', async () => {
    mockContextWindow();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });
    vi.spyOn(agentDiscoveryModule, 'discoverAgents').mockResolvedValue([
      { name: 'agent-a', scope: Scope.AgentProject, memoryCount: 5, path: '/a' },
      { name: 'agent-b', scope: Scope.AgentProject, memoryCount: 3, path: '/b' },
    ]);
    vi.spyOn(helpersModule, 'resolveAgentScopePath')
      .mockResolvedValueOnce('/tmp/agents/agent-a')
      .mockResolvedValueOnce('/tmp/agents/agent-b');

    const args: ParsedArgs = {
      positional: [],
      flags: { 'all-agents': true, agent: 'ignored-agent' },
    };
    const result = await cmdSummarize(args);

    // No error — --all-agents wins
    expect(result.status).toBe('success');
    // basePaths should contain discovered agent paths, NOT the --agent path
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        basePaths: ['/tmp/agents/agent-a', '/tmp/agents/agent-b'],
      })
    );
  });

  // --- Validation tests ---

  it('returns error for invalid --mode flag', async () => {
    setupDefaults();

    const args: ParsedArgs = { positional: [], flags: { mode: 'invalid' } };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Invalid --mode');
    expect(result.error).toContain('invalid');
  });

  it('returns error for invalid type filter in positional arg', async () => {
    setupDefaults();

    const args: ParsedArgs = { positional: ['badtype'], flags: {} };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Invalid memory type');
    expect(result.error).toContain('badtype');
  });

  it('clamps --limit to max 500', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { limit: '999999' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 500 })
    );
  });

  it('clamps --timeout to at least 1000ms', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { timeout: '0' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 1_000 })
    );
  });

  it('returns error response when summarize() throws', async () => {
    setupDefaults();
    vi.spyOn(summarizeModule, 'summarize').mockRejectedValue(new Error('LLM connection failed'));

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('error');
    expect(result.error).toBe('LLM connection failed');
  });

  it('clamps --limit 0 to minimum of 1', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { limit: '0' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 1 })
    );
  });

  it('--all-agents with no agents discovered results in empty basePaths', async () => {
    mockContextWindow();
    vi.spyOn(agentDiscoveryModule, 'discoverAgents').mockResolvedValue([]);
    const spy = mockSummarize({ kind: 'empty', memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { 'all-agents': true } };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('success');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ basePaths: [] })
    );
    expect(result.data).toEqual(expect.objectContaining({ memoriesIncluded: [] }));
  });

  it('--tags with whitespace-only comma-separated values yields empty tags array', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { tags: ' , ' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ tags: [] })
    );
  });

  it('clamps --timeout to MAX_TIMEOUT_MS upper bound', async () => {
    setupDefaults();
    const spy = mockSummarize({ kind: 'per-type', summaries: {}, memoriesIncluded: [] });

    const args: ParsedArgs = { positional: [], flags: { timeout: '999999' } };
    await cmdSummarize(args);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ timeoutMs: 600_000 })
    );
  });

  it('returns error for digestId containing path traversal characters', async () => {
    setupDefaults();
    const spy = vi.spyOn(summarizeModule, 'summarize');

    const args: ParsedArgs = {
      positional: ['../../../etc/passwd'],
      flags: { mode: 'digest' },
    };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('must start with alphanumeric and contain only letters, digits, and hyphens');
    expect(spy).not.toHaveBeenCalled();
  });
});
