/**
 * Tests for --include-shared flag validation
 *
 * Phase D: Shared Memory Inclusion
 * Tests verify that --include-shared validation works correctly:
 * - Requires --agent flag (can't use alone)
 * - Rejected on write operations (single-scope only)
 * - Accepted on read operations (search, list, query, etc.)
 *
 * Note: These are validation-focused tests. Integration tests verify actual
 * multi-scope functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cmdWrite, cmdDelete, cmdSearch, cmdList } from './crud.js';
import { cmdLink, cmdUnlink } from './graph.js';
import { cmdTag, cmdUntag } from './tags.js';
import { cmdSync } from './maintenance.js';
import { cmdQuery, cmdStats, cmdImpact } from './query.js';
import type { ParsedArgs } from '../parser.js';
import * as parserModule from '../parser.js';

// Import modules that commands actually use
import * as writeModule from '../../core/write.js';
import * as deleteModule from '../../core/delete.js';
import * as searchModule from '../../core/search.js';
import * as listModule from '../../core/list.js';
import * as linkModule from '../../graph/link.js';
import * as tagModule from '../../core/tag.js';
import * as syncModule from '../../maintenance/sync.js';
import * as indexModule from '../../core/index.js';
import * as graphModule from '../../graph/structure.js';

describe('--include-shared validation', () => {
  describe('requires --agent flag on read operations', () => {
    beforeEach(() => {
      // Mock underlying functions
      vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({ status: 'success', results: [] });
      vi.spyOn(listModule, 'listMemories').mockResolvedValue({ status: 'success', memories: [], count: 0 });
      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({ version: '1', lastUpdated: new Date().toISOString(), memories: [] });
      vi.spyOn(graphModule, 'loadGraph').mockResolvedValue({ version: 1, nodes: [], edges: [] });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('cmdSearch: errors when --include-shared without --agent', async () => {
      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { 'include-shared': true },
      };
      const result = await cmdSearch(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('--include-shared requires --agent');
      expect(searchModule.searchMemories).not.toHaveBeenCalled();
    });

    it('cmdList: errors when --include-shared without --agent', async () => {
      const args: ParsedArgs = {
        positional: ['list'],
        flags: { 'include-shared': true },
      };
      const result = await cmdList(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('--include-shared requires --agent');
      expect(listModule.listMemories).not.toHaveBeenCalled();
    });

    it('cmdQuery: errors when --include-shared without --agent', async () => {
      const args: ParsedArgs = {
        positional: ['query'],
        flags: { 'include-shared': true },
      };
      const result = await cmdQuery(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('--include-shared requires --agent');
    });

    it('cmdStats: errors when --include-shared without --agent', async () => {
      const args: ParsedArgs = {
        positional: ['stats'],
        flags: { 'include-shared': true },
      };
      const result = await cmdStats(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('--include-shared requires --agent');
    });

    it('cmdImpact: errors when --include-shared without --agent', async () => {
      const args: ParsedArgs = {
        positional: ['impact', 'some-id'],
        flags: { 'include-shared': true },
      };
      const result = await cmdImpact(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('--include-shared requires --agent');
    });
  });

  describe('rejects --include-shared on write operations', () => {
    beforeEach(() => {
      // Mock stdin for cmdWrite
      vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
        title: 'Test Memory',
        content: 'Test content',
        type: 'learning',
      });

      // Mock write operations
      vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({ status: 'success' });
      vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({ status: 'success' });
      vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({ status: 'success' });
      vi.spyOn(linkModule, 'unlinkMemories').mockResolvedValue({ status: 'success' });
      vi.spyOn(tagModule, 'tagMemory').mockResolvedValue({ status: 'success' });
      vi.spyOn(tagModule, 'untagMemory').mockResolvedValue({ status: 'success' });
      vi.spyOn(syncModule, 'syncMemories').mockResolvedValue({
        status: 'success',
        changes: { addedToGraph: [], addedToIndex: [], removedGhostNodes: [], removedOrphanEdges: 0, removedFromIndex: [], removedOrphanEmbeddings: [], externalNodesAdded: [], externalNodesUpdated: [], externalNodesRemoved: [] },
        summary: { filesOnDisk: 0, nodesInGraph: 0, entriesInIndex: 0, entriesInEmbeddings: 0, externalRuleNodes: 0, externalReminderNodes: 0 },
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('cmdWrite: rejects --include-shared', async () => {
      const args: ParsedArgs = {
        positional: ['write'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdWrite(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('write operations are single-scope only');
      expect(result.error).toContain('Remove --include-shared');
      expect(writeModule.writeMemory).not.toHaveBeenCalled();
    });

    it('cmdDelete: rejects --include-shared', async () => {
      const args: ParsedArgs = {
        positional: ['delete', 'some-id'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdDelete(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('write operations are single-scope only');
      expect(deleteModule.deleteMemory).not.toHaveBeenCalled();
    });

    it('cmdLink: --include-shared is ignored (cross-scope uses --target-agent)', async () => {
      const args: ParsedArgs = {
        positional: ['id1', 'id2'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      await cmdLink(args);

      // cmdLink no longer rejects --include-shared; cross-scope linking
      // is triggered via --target-agent, not --include-shared (Phase D).
      // With just --agent (no --target-agent), this is a same-scope link.
      expect(linkModule.linkMemories).toHaveBeenCalled();
    });

    it('cmdUnlink: --include-shared is ignored (cross-scope uses --target-agent)', async () => {
      const args: ParsedArgs = {
        positional: ['id1', 'id2'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      await cmdUnlink(args);

      // cmdUnlink no longer rejects --include-shared; cross-scope unlinking
      // is triggered via --target-agent, not --include-shared (Phase D).
      expect(linkModule.unlinkMemories).toHaveBeenCalled();
    });

    it('cmdTag: rejects --include-shared', async () => {
      const args: ParsedArgs = {
        positional: ['tag', 'some-id', 'new-tag'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdTag(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('write operations are single-scope only');
      expect(tagModule.tagMemory).not.toHaveBeenCalled();
    });

    it('cmdUntag: rejects --include-shared', async () => {
      const args: ParsedArgs = {
        positional: ['untag', 'some-id', 'old-tag'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdUntag(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('write operations are single-scope only');
      expect(tagModule.untagMemory).not.toHaveBeenCalled();
    });

    it('cmdSync: rejects --include-shared', async () => {
      const args: ParsedArgs = {
        positional: ['sync'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdSync(args);

      expect(result.status).toBe('error');
      expect(result.error).toContain('write operations are single-scope only');
      expect(syncModule.syncMemories).not.toHaveBeenCalled();
    });
  });

  describe('accepts --include-shared with --agent on read operations', () => {
    beforeEach(() => {
      // Mock read operations - will be called if validation passes
      vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({ status: 'success', results: [] });
      vi.spyOn(listModule, 'listMemories').mockResolvedValue({ status: 'success', memories: [], count: 0 });
      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({ version: '1', lastUpdated: new Date().toISOString(), memories: [] });
      vi.spyOn(graphModule, 'loadGraph').mockResolvedValue({ version: 1, nodes: [], edges: [] });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // These tests verify validation passes and underlying functions are called

    it('cmdSearch: accepts --include-shared with --agent and calls searchMemories', async () => {
      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdSearch(args);

      // Validation should pass - underlying function should be called
      expect(result.status).toBe('success');
      expect(searchModule.searchMemories).toHaveBeenCalled();
    });

    it('cmdList: accepts --include-shared with --agent and calls listMemories', async () => {
      const args: ParsedArgs = {
        positional: ['list'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdList(args);

      // Validation should pass - underlying function should be called
      expect(result.status).toBe('success');
      expect(listModule.listMemories).toHaveBeenCalled();
    });

    it('cmdQuery: accepts --include-shared with --agent and calls loadIndex', async () => {
      const args: ParsedArgs = {
        positional: ['query'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdQuery(args);

      // Validation should pass - underlying function should be called
      expect(result.status).toBe('success');
      expect(indexModule.loadIndex).toHaveBeenCalled();
    });

    it('cmdStats: accepts --include-shared with --agent and calls loadGraph', async () => {
      const args: ParsedArgs = {
        positional: ['stats'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdStats(args);

      // Validation should pass - underlying function should be called
      expect(result.status).toBe('success');
      expect(graphModule.loadGraph).toHaveBeenCalled();
    });

    it('cmdImpact: accepts --include-shared with --agent and calls loadGraph', async () => {
      const args: ParsedArgs = {
        positional: ['impact', 'some-id'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };
      const result = await cmdImpact(args);

      // Validation should pass - underlying function should be called
      expect(result.status).toBe('success');
      expect(graphModule.loadGraph).toHaveBeenCalled();
    });
  });
});
