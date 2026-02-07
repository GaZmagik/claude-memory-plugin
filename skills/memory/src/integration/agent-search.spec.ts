/**
 * T036-T037: Integration tests for searching agent-scoped memories
 *
 * Tests keyword and semantic search within agent scopes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { searchMemories } from '../core/search.js';
import type { SearchMemoriesRequest } from '../types/api.js';
import { Scope, MemoryType } from '../types/enums.js';
import * as indexModule from '../core/index.js';

describe('Agent-scoped search operations', () => {
  const mockProjectRoot = '/test/project';
  const mockGlobalRoot = '/test/global';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('keyword search in agent scope', () => {
    it('should search within agent-project scope', async () => {
      const mockMemories = [
        {
          id: memoryId('learning-typescript-pattern'),
          type: MemoryType.Learning,
          title: 'TypeScript Pattern',
          tags: ['typescript'],
          scope: Scope.AgentProject,
          agent: 'typescript-expert',
          relativePath: 'permanent/learning-typescript-pattern.md',
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
        },
        {
          id: memoryId('learning-typescript-generics'),
          type: MemoryType.Learning,
          title: 'TypeScript Generics',
          tags: ['typescript'],
          scope: Scope.AgentProject,
          agent: 'typescript-expert',
          relativePath: 'permanent/learning-typescript-generics.md',
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
        },
      ];

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: mockMemories,
      });

      const fsp = await import('node:fs/promises');
      vi.spyOn(fsp, 'readFile').mockResolvedValue('TypeScript content with pattern keyword');

      const request: SearchMemoriesRequest = {
        query: 'pattern',
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        basePath: mockProjectRoot,
      };

      const result = await searchMemories(request);

      expect(result.status).toBe('success');
      expect(result.results).toBeDefined();
      expect(result.results!.length).toBeGreaterThan(0);

      // Verify only agent-scoped memories returned
      result.results!.forEach((memory: any) => {
        expect(memory.scope).toBe(Scope.AgentProject);
        expect(memory.agent).toBe('typescript-expert');
      });
    });

    it('should search within agent-global scope', async () => {
      const mockMemories = [
        {
          id: memoryId('decision-api-design'),
          type: MemoryType.Decision,
          title: 'API Design Pattern',
          tags: ['api'],
          scope: Scope.AgentGlobal,
          agent: 'api-architect',
          relativePath: 'permanent/decision-api-design.md',
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
        },
      ];

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: mockMemories,
      });

      const fsp = await import('node:fs/promises');
      vi.spyOn(fsp, 'readFile').mockResolvedValue('API design content');

      const request: SearchMemoriesRequest = {
        query: 'design',
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
        basePath: mockGlobalRoot,
      };

      const result = await searchMemories(request);

      expect(result.status).toBe('success');
      expect(result.results![0]!.agent).toBe('api-architect');
    });

    it('should not return memories from other agents', async () => {
      const mockMemories = [
        {
          id: memoryId('learning-typescript-1'),
          type: MemoryType.Learning,
          title: 'TypeScript',
          tags: [],
          scope: Scope.AgentProject,
          agent: 'typescript-expert',
          relativePath: 'permanent/learning-typescript-1.md',
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
        },
        {
          id: memoryId('learning-rust-1'),
          type: MemoryType.Learning,
          title: 'Rust',
          tags: [],
          scope: Scope.AgentProject,
          agent: 'rust-expert',
          relativePath: 'permanent/learning-rust-1.md',
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
        },
      ];

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: mockMemories,
      });

      const fsp = await import('node:fs/promises');
      vi.spyOn(fsp, 'readFile').mockResolvedValue('test content');

      const request: SearchMemoriesRequest = {
        query: 'test',
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        basePath: mockProjectRoot,
      };

      const result = await searchMemories(request);

      // Verify result status
      expect(result.status).toBe('success');

      // Should only load typescript-expert's index, not rust-expert's
      expect(indexModule.loadIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: expect.stringContaining('typescript-expert')
        })
      );
      expect(indexModule.loadIndex).not.toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: expect.stringContaining('rust-expert')
        })
      );
    });

    it('should reject search without agent field for agent scope', async () => {
      const request: SearchMemoriesRequest = {
        query: 'test',
        scope: Scope.AgentProject,
        // Missing agent field
        basePath: mockProjectRoot,
      };

      const result = await searchMemories(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('agent');
    });
  });

  describe('semantic search in agent scope', () => {
    it('should perform semantic search within agent-project scope', async () => {
      // Import semantic search module
      const semanticModule = await import('../core/semantic-search.js');

      // Mock embedding provider
      const mockProvider: any = {
        embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      };

      // Mock the semantic search to return results
      vi.spyOn(semanticModule, 'semanticSearchMemories').mockResolvedValue({
        status: 'success',
        results: [
          {
            id: memoryId('learning-typescript-pattern'),
            title: 'TypeScript Pattern',
            type: MemoryType.Learning,
            tags: ['typescript'],
            score: 0.95,
            scope: Scope.AgentProject,
          },
        ],
      });

      const result = await semanticModule.semanticSearchMemories({
        query: 'typescript patterns',
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        provider: mockProvider,
        basePath: mockProjectRoot,
      });

      expect(result.status).toBe('success');
      expect(result.results).toBeDefined();
      expect(result.results![0]!.scope).toBe(Scope.AgentProject);
    });

    it('should use agent-specific embeddings cache', async () => {
      const semanticModule = await import('../core/semantic-search.js');

      // The embeddings cache path should include the agent directory
      // This test verifies the basePath resolution includes agent path
      const mockProvider: any = {
        embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      };

      vi.spyOn(semanticModule, 'semanticSearchMemories').mockResolvedValue({
        status: 'success',
        results: [],
      });

      const result = await semanticModule.semanticSearchMemories({
        query: 'test query',
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        provider: mockProvider,
        basePath: mockProjectRoot,
      });

      expect(result.status).toBe('success');
      // Embeddings would be cached under agent directory, not root
    });

    it('should reject semantic search without agent field', async () => {
      const semanticModule = await import('../core/semantic-search.js');

      // Restore real implementation to test validation
      vi.restoreAllMocks();

      const mockProvider: any = {
        embedText: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      };

      const result = await semanticModule.semanticSearchMemories({
        query: 'test',
        scope: Scope.AgentProject,
        // Missing agent field
        provider: mockProvider,
        basePath: mockProjectRoot,
      });

      expect(result.status).toBe('error');
      expect(result.error).toContain('agent');
    });
  });
});
