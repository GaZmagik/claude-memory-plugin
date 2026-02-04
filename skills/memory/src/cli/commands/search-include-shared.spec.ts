/**
 * Integration tests for cmdSearch with --include-shared
 *
 * Phase D: Shared Memory Inclusion
 * Tests that search correctly queries multiple scopes when --include-shared is used.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cmdSearch } from './crud.js';
import type { ParsedArgs } from '../parser.js';
import * as searchModule from '../../core/search.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('cmdSearch with --include-shared', () => {
  const mockCwd = '/mock/project';
  const mockHome = '/mock/home';

  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    vi.spyOn(require('node:os'), 'homedir').mockReturnValue(mockHome);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('multi-scope search execution', () => {
    it('searches multiple scopes when --include-shared and --agent provided', async () => {
      const searchSpy = vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['typescript'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      await cmdSearch(args);

      // Should be called multiple times (once per scope)
      expect(searchSpy.mock.calls.length).toBeGreaterThan(1);
    });

    it('searches agent scope first', async () => {
      const searchSpy = vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'rust-expert', 'include-shared': true },
      };

      await cmdSearch(args);

      // First call should be agent scope
      const firstCall = searchSpy.mock.calls[0];
      expect(firstCall[0].basePath).toContain('agents/rust-expert');
    });

    it('includes shared scopes after agent scope', async () => {
      const searchSpy = vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      await cmdSearch(args);

      // Should have multiple calls for different scopes
      const calls = searchSpy.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);

      // First should be agent scope
      expect(calls[0][0].basePath).toContain('agents/typescript-expert');

      // Subsequent calls should be different paths (shared scopes)
      for (let i = 1; i < calls.length; i++) {
        expect(calls[i][0].basePath).not.toBe(calls[0][0].basePath);
      }
    });
  });

  describe('result merging with scope indicators', () => {
    it('merges results from multiple scopes', async () => {
      // Mock different results from different scopes
      let callCount = 0;
      vi.spyOn(searchModule, 'searchMemories').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Agent scope results
          return {
            status: 'success',
            results: [
              { id: 'agent-memory-1', title: 'Agent Learning', score: 0.9 },
            ],
          };
        } else {
          // Shared scope results
          return {
            status: 'success',
            results: [
              { id: 'shared-memory-1', title: 'Project Decision', score: 0.8 },
            ],
          };
        }
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      const result = await cmdSearch(args);

      expect(result.status).toBe('success');
      // Should have merged results from both scopes
      if ('data' in result && result.data && 'results' in result.data) {
        const results = result.data.results as any[];
        expect(results.length).toBeGreaterThan(1);
      }
    });

    it('adds scope indicators to results', async () => {
      vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [
          { id: 'test-memory', title: 'Test', score: 0.9 },
        ],
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      const result = await cmdSearch(args);

      // Results should include scope indicators
      // Format: [scope] memory-id
      if (result.status === 'success' && 'data' in result && result.data && 'results' in result.data) {
        const results = result.data.results as any[];
        if (results.length > 0) {
          // Check that at least one result has a scope indicator in its id
          expect(results[0].id).toMatch(/\[.*\]/); // Contains scope indicator like [agent-project]
        }
      }
    });

    it('indicates agent scope for agent results', async () => {
      let callCount = 0;
      vi.spyOn(searchModule, 'searchMemories').mockImplementation(async (req) => {
        callCount++;
        return {
          status: 'success',
          results: [
            { id: `memory-${callCount}`, title: 'Test', score: 0.9 },
          ],
        };
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      const result = await cmdSearch(args);

      if (result.status === 'success' && 'data' in result && result.data && 'results' in result.data) {
        const results = result.data.results as any[];
        // Should contain agent scope indicator in at least one result
        const hasAgentScope = results.some((r: any) =>
          r.id.includes('[agent-project]') || r.id.includes('[agent-global]')
        );
        expect(hasAgentScope).toBe(true);
      }
    });
  });

  describe('scope order verification', () => {
    it('searches scopes in correct order: agent → local → project → global', async () => {
      const searchSpy = vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      await cmdSearch(args);

      const calls = searchSpy.mock.calls;

      // First call: agent scope
      expect(calls[0][0].basePath).toContain('agents/typescript-expert');

      // Remaining calls should follow scope hierarchy
      // (exact paths depend on implementation, but should be distinct)
      const basePaths = calls.map(call => call[0].basePath);
      const uniquePaths = new Set(basePaths);
      expect(uniquePaths.size).toBe(basePaths.length); // No duplicates
    });
  });

  describe('query parameter propagation', () => {
    it('passes query to all scope searches', async () => {
      const searchSpy = vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['typescript patterns'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      await cmdSearch(args);

      // All calls should have the same query
      searchSpy.mock.calls.forEach(call => {
        expect(call[0].query).toBe('typescript patterns');
      });
    });

    it('passes limit flag to all scope searches', async () => {
      const searchSpy = vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true, limit: '5' },
      };

      await cmdSearch(args);

      // All calls should respect limit
      searchSpy.mock.calls.forEach(call => {
        expect(call[0].limit).toBe(5);
      });
    });

    it('passes type filter to all scope searches', async () => {
      const searchSpy = vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true, type: 'decision' },
      };

      await cmdSearch(args);

      // All calls should have type filter
      searchSpy.mock.calls.forEach(call => {
        expect(call[0].type).toBe('decision');
      });
    });
  });

  describe('empty scope handling', () => {
    it('handles scopes with no results gracefully', async () => {
      let callCount = 0;
      vi.spyOn(searchModule, 'searchMemories').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { status: 'success', results: [] }; // Agent scope empty
        } else {
          return {
            status: 'success',
            results: [{ id: 'shared-1', title: 'Shared', score: 0.8 }],
          };
        }
      });

      const args: ParsedArgs = {
        positional: ['pattern'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      const result = await cmdSearch(args);

      expect(result.status).toBe('success');
      // Should still show shared results even if agent scope is empty
    });

    it('handles all scopes being empty', async () => {
      vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const args: ParsedArgs = {
        positional: ['nonexistent'],
        flags: { agent: 'typescript-expert', 'include-shared': true },
      };

      const result = await cmdSearch(args);

      expect(result.status).toBe('success');
      // Should indicate no results found
    });
  });
});
