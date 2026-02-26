/**
 * T028: Unit test for agent index operations
 *
 * Tests that index operations work correctly with agent directories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { loadIndex, saveIndex, addToIndex } from './index.js';
import { Scope, MemoryType } from '../types/enums.js';
import type { IndexEntry } from '../types/index.js';
import * as fsUtils from './fs-utils.js';

describe('Agent index operations', () => {
  const mockAgentPath = '/test/.claude/memory/agents/typescript-expert';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock file system operations to prevent actual file I/O
    vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadIndex from agent directory', () => {
    it('should load index from agent directory', async () => {
      const fsp = await import('node:fs/promises');
      const mockIndexContent = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [
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
        ],
      };

      vi.spyOn(fsp, 'access').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'readFile').mockResolvedValue(JSON.stringify(mockIndexContent) as any);

      const result = await loadIndex({ basePath: mockAgentPath });

      expect(result.memories).toHaveLength(1);
      expect(result.memories[0]!.agent).toBe('typescript-expert');
      expect(result.memories[0]!.scope).toBe(Scope.AgentProject);
    });

    it('should create new index if agent directory has no index', async () => {
      const fsp = await import('node:fs/promises');
      vi.spyOn(fsp, 'access').mockRejectedValue({ code: 'ENOENT' });
      vi.spyOn(fsp, 'readFile').mockRejectedValue({ code: 'ENOENT' });

      const result = await loadIndex({ basePath: mockAgentPath });

      expect(result.version).toBe('1.0.0');
      expect(result.memories).toEqual([]);
    });
  });

  describe('saveIndex to agent directory', () => {
    it('should save index to agent directory', async () => {
      const fsp = await import('node:fs/promises');
      const mockIndex = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [
          {
            id: memoryId('learning-test'),
            type: MemoryType.Learning,
            title: 'Test',
            tags: [],
            scope: Scope.AgentProject,
            agent: 'typescript-expert',
            relativePath: 'permanent/learning-test.md',
            created: '2026-01-10T12:00:00Z',
            updated: '2026-01-10T12:00:00Z',
          },
        ],
      };

      const mockWriteFile = vi.spyOn(fsp, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'rename').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'unlink').mockResolvedValue(undefined);

      await saveIndex(mockAgentPath, mockIndex);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('index.json'),
        expect.stringContaining('typescript-expert'),
        'utf-8'
      );
    });
  });

  describe('addToIndex in agent directory', () => {
    it('should add entry with agent field to index', async () => {
      const fsp = await import('node:fs/promises');
      const existingIndex = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [],
      };

      vi.spyOn(fsp, 'readFile').mockResolvedValue(JSON.stringify(existingIndex) as any);
      const mockWriteFile = vi.spyOn(fsp, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'rename').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'unlink').mockResolvedValue(undefined);

      const newEntry: IndexEntry = {
        id: memoryId('learning-new'),
        type: MemoryType.Learning,
        title: 'New Learning',
        tags: ['test'],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        relativePath: 'permanent/learning-new.md',
        created: '2026-01-11T00:00:00Z',
        updated: '2026-01-11T00:00:00Z',
      };

      await addToIndex(mockAgentPath, newEntry);

      // Verify writeFile called with updated index
      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall![1] as string);

      expect(writtenContent.memories).toHaveLength(1);
      expect(writtenContent.memories[0].agent).toBe('typescript-expert');
    });

    it('should maintain agent field through index updates', async () => {
      const fsp = await import('node:fs/promises');
      const existingIndex = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [
          {
            id: memoryId('learning-existing'),
            type: MemoryType.Learning,
            title: 'Existing',
            tags: [],
            scope: Scope.AgentProject,
            agent: 'typescript-expert',
            relativePath: 'permanent/learning-existing.md',
            created: '2026-01-10T12:00:00Z',
            updated: '2026-01-10T12:00:00Z',
          },
        ],
      };

      vi.spyOn(fsp, 'access').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'readFile').mockResolvedValue(JSON.stringify(existingIndex) as any);
      const mockWriteFile = vi.spyOn(fsp, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'rename').mockResolvedValue(undefined);
      vi.spyOn(fsp, 'unlink').mockResolvedValue(undefined);

      const newEntry: IndexEntry = {
        id: memoryId('learning-new'),
        type: MemoryType.Learning,
        title: 'New',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        relativePath: 'permanent/learning-new.md',
        created: '2026-01-11T00:00:00Z',
        updated: '2026-01-11T00:00:00Z',
      };

      await addToIndex(mockAgentPath, newEntry);

      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall![1] as string);

      expect(writtenContent.memories).toHaveLength(2);
      expect(writtenContent.memories[0].agent).toBe('typescript-expert');
      expect(writtenContent.memories[1].agent).toBe('typescript-expert');
    });
  });

  describe('index isolation between agents', () => {
    it('should maintain separate indices for different agents', async () => {
      const fsp = await import('node:fs/promises');
      const tsExpertPath = '/test/.claude/memory/agents/typescript-expert';
      const rustExpertPath = '/test/.claude/memory/agents/rust-expert';

      const tsIndex = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [
          {
            id: memoryId('learning-typescript'),
            type: MemoryType.Learning,
            title: 'TypeScript',
            tags: [],
            scope: Scope.AgentProject,
            agent: 'typescript-expert',
            relativePath: 'permanent/learning-typescript.md',
            created: '2026-01-10T12:00:00Z',
            updated: '2026-01-10T12:00:00Z',
          },
        ],
      };

      const rustIndex = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [
          {
            id: memoryId('learning-rust'),
            type: MemoryType.Learning,
            title: 'Rust',
            tags: [],
            scope: Scope.AgentProject,
            agent: 'rust-expert',
            relativePath: 'permanent/learning-rust.md',
            created: '2026-01-10T12:00:00Z',
            updated: '2026-01-10T12:00:00Z',
          },
        ],
      };

      vi.spyOn(fsp, 'access').mockResolvedValue(undefined);
      const mockReadFile = vi.spyOn(fsp, 'readFile').mockImplementation((p) => {
        if (p.toString().includes('typescript-expert')) {
          return Promise.resolve(JSON.stringify(tsIndex) as any);
        }
        return Promise.resolve(JSON.stringify(rustIndex) as any);
      });

      const tsResult = await loadIndex({ basePath: tsExpertPath });
      const rustResult = await loadIndex({ basePath: rustExpertPath });

      expect(tsResult.memories[0]!.agent).toBe('typescript-expert');
      expect(rustResult.memories[0]!.agent).toBe('rust-expert');
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });
});
