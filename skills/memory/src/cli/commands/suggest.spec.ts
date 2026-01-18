/**
 * Tests for CLI Suggest Commands
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { cmdSuggestLinks, cmdSummarize } from './suggest.js';
import * as suggestLinksModule from '../../suggest/suggest-links.js';
import type { ParsedArgs } from '../parser.js';

describe('cmdSuggestLinks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls suggestLinks with defaults', async () => {
    vi.spyOn(suggestLinksModule, 'suggestLinks').mockResolvedValue({
      suggestions: [],
      created: 0,
    } as any);

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
    vi.spyOn(suggestLinksModule, 'suggestLinks').mockResolvedValue({
      suggestions: [],
    } as any);

    const args: ParsedArgs = { positional: [], flags: { threshold: '0.9' } };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 0.9 })
    );
  });

  it('passes limit flag', async () => {
    vi.spyOn(suggestLinksModule, 'suggestLinks').mockResolvedValue({
      suggestions: [],
    } as any);

    const args: ParsedArgs = { positional: [], flags: { limit: '10' } };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 })
    );
  });

  it('passes auto-link flag', async () => {
    vi.spyOn(suggestLinksModule, 'suggestLinks').mockResolvedValue({
      suggestions: [],
      created: 5,
    } as any);

    const args: ParsedArgs = { positional: [], flags: { 'auto-link': true } };
    await cmdSuggestLinks(args);

    expect(suggestLinksModule.suggestLinks).toHaveBeenCalledWith(
      expect.objectContaining({ autoLink: true })
    );
  });
});

describe('cmdSummarize', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns stub response', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('success');
    expect((result.data as any).message).toContain('not yet implemented');
  });

  it('accepts type positional', async () => {
    const args: ParsedArgs = { positional: ['decisions'], flags: {} };
    const result = await cmdSummarize(args);

    expect(result.status).toBe('success');
    expect((result.data as any).type).toBe('decisions');
  });
});
