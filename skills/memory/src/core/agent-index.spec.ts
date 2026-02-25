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

const { mockWriteFile, mockReadFile, mockAccess, mockRename, mockUnlink } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
  mockReadFile: vi.fn(),
  mockAccess: vi.fn(),
  mockRename: vi.fn(),
  mockUnlink: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  access: mockAccess,
  rename: mockRename,
  unlink: mockUnlink,
}));

describe('Agent index operations', () => {
  const mockAgentPath = '/test/.claude/memory/agents/typescript-expert';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock file system operations to prevent actual file I/O
    vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);

    mockWriteFile.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadIndex from agent directory', () => {
    it('should load index from agent directory', async () => {
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

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(mockIndexContent));

      const result = await loadIndex({ basePath: mockAgentPath });

      expect(result.memories).toHaveLength(1);
      expect(result.memories[0]!.agent).toBe('typescript-expert');
      expect(result.memories[0]!.scope).toBe(Scope.AgentProject);
    });

    it('should create new index if agent directory has no index', async () => {
      mockAccess.mockRejectedValue({ code: 'ENOENT' });
      mockReadFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await loadIndex({ basePath: mockAgentPath });

      expect(result.version).toBe('1.0.0');
      expect(result.memories).toEqual([]);
    });
  });

  describe('saveIndex to agent directory', () => {
    it('should save index to agent directory', async () => {
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

      mockWriteFile.mockResolvedValue(undefined);

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
      const existingIndex = {
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [],
      };

      mockReadFile.mockResolvedValue(JSON.stringify(existingIndex));
      mockWriteFile.mockResolvedValue(undefined);

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
      const writtenContent = JSON.parse(writeCall[1]);

      expect(writtenContent.memories).toHaveLength(1);
      expect(writtenContent.memories[0].agent).toBe('typescript-expert');
    });

    it('should maintain agent field through index updates', async () => {
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

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(existingIndex));
      mockWriteFile.mockResolvedValue(undefined);

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
      const writtenContent = JSON.parse(writeCall[1]);

      expect(writtenContent.memories).toHaveLength(2);
      expect(writtenContent.memories[0].agent).toBe('typescript-expert');
      expect(writtenContent.memories[1].agent).toBe('typescript-expert');
    });
  });

  describe('index isolation between agents', () => {
    it('should maintain separate indices for different agents', async () => {
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

      mockAccess.mockResolvedValue(undefined);
      mockReadFile.mockImplementation((p: Parameters<typeof import('node:fs/promises').readFile>[0]) => {
        if (p.toString().includes('typescript-expert')) {
          return Promise.resolve(JSON.stringify(tsIndex));
        }
        return Promise.resolve(JSON.stringify(rustIndex));
      });

      const tsResult = await loadIndex({ basePath: tsExpertPath });
      const rustResult = await loadIndex({ basePath: rustExpertPath });

      expect(tsResult.memories[0]!.agent).toBe('typescript-expert');
      expect(rustResult.memories[0]!.agent).toBe('rust-expert');
      expect(mockReadFile).toHaveBeenCalledTimes(2);
    });
  });
});
