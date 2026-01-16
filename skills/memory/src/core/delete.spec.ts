/**
 * Tests for T032: Memory Delete Operation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deleteMemory } from './delete.js';
import type { DeleteMemoryRequest } from '../types/api.js';
import type { IndexEntry } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from './index.js';
import * as fsUtils from './fs-utils.js';

describe('deleteMemory', () => {
  const mockBasePath = '/test/base';
  const mockId = 'learning-test-memory';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validation', () => {
    it('should return error when id is empty', async () => {
      const request: DeleteMemoryRequest = {
        id: '',
      };

      const result = await deleteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe('id is required');
    });

    it('should return error when id is whitespace only', async () => {
      const request: DeleteMemoryRequest = {
        id: '   ',
      };

      const result = await deleteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe('id is required');
    });
  });

  describe('successful deletion', () => {
    const mockIndexEntry: IndexEntry = {
      id: mockId,
      type: MemoryType.Learning,
      title: 'Test Memory',
      tags: ['test'],
      created: '2026-01-11T00:00:00.000Z',
      updated: '2026-01-11T00:00:00.000Z',
      scope: Scope.Local,
      relativePath: `${mockId}.md`,
    };

    it('should delete memory found in index', async () => {
      const request: DeleteMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(mockIndexEntry);
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtils, 'deleteFile').mockImplementation(() => {});
      vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(true);

      const result = await deleteMemory(request);

      expect(result.status).toBe('success');
      expect(indexModule.findInIndex).toHaveBeenCalledWith(mockBasePath, mockId);
      expect(fsUtils.fileExists).toHaveBeenCalledWith(`${mockBasePath}/${mockId}.md`);
      expect(fsUtils.deleteFile).toHaveBeenCalledWith(`${mockBasePath}/${mockId}.md`);
      expect(indexModule.removeFromIndex).toHaveBeenCalledWith(mockBasePath, mockId);

      if (result.status === 'success') {
        expect(result.deletedId).toBe(mockId);
      }
    });

    it('should delete memory with direct file lookup when not in index', async () => {
      const request: DeleteMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtils, 'deleteFile').mockImplementation(() => {});
      vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(false);

      const result = await deleteMemory(request);

      expect(result.status).toBe('success');
      expect(indexModule.findInIndex).toHaveBeenCalledWith(mockBasePath, mockId);
      // Should fall back to direct file path
      expect(fsUtils.fileExists).toHaveBeenCalledWith(`${mockBasePath}/${mockId}.md`);
      expect(fsUtils.deleteFile).toHaveBeenCalledWith(`${mockBasePath}/${mockId}.md`);

      if (result.status === 'success') {
        expect(result.deletedId).toBe(mockId);
      }
    });

    it('should use custom basePath when provided', async () => {
      const customBasePath = '/custom/path';
      const request: DeleteMemoryRequest = {
        id: mockId,
        basePath: customBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(mockIndexEntry);
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtils, 'deleteFile').mockImplementation(() => {});
      vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(true);

      await deleteMemory(request);

      expect(indexModule.findInIndex).toHaveBeenCalledWith(customBasePath, mockId);
      expect(fsUtils.fileExists).toHaveBeenCalledWith(`${customBasePath}/${mockId}.md`);
      expect(fsUtils.deleteFile).toHaveBeenCalledWith(`${customBasePath}/${mockId}.md`);
      expect(indexModule.removeFromIndex).toHaveBeenCalledWith(customBasePath, mockId);
    });
  });

  describe('error handling', () => {
    it('should return error when memory file not found', async () => {
      const request: DeleteMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(false);

      const result = await deleteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe(`Memory not found: ${mockId}`);
    });

    it('should handle deletion errors gracefully', async () => {
      const request: DeleteMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtils, 'deleteFile').mockImplementation(() => {
        throw new Error('EACCES: Permission denied');
      });

      const result = await deleteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to delete memory');
      expect(result.error).toContain('Permission denied');
    });

    it('should handle index removal errors gracefully', async () => {
      const request: DeleteMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(true);
      vi.spyOn(fsUtils, 'deleteFile').mockImplementation(() => {});
      vi.spyOn(indexModule, 'removeFromIndex').mockRejectedValue(new Error('Index corrupted'));

      const result = await deleteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to delete memory');
      expect(result.error).toContain('Index corrupted');
    });

    it('should reject path traversal attempts', async () => {
      const request: DeleteMemoryRequest = {
        id: '../../../etc/passwd',
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(false);

      const result = await deleteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('path traversal not allowed');
    });
  });
});

import * as fs from 'node:fs';
import * as graphModule from '../graph/structure.js';

describe('deleteMemory embeddings cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should clean up embeddings when embeddings.json exists', async () => {
    const mockId = 'learning-test';
    const mockBasePath = '/test/base';
    const mockEmbeddings = {
      version: '1.0.0',
      memories: {
        'learning-test': { embedding: [0.1, 0.2], hash: 'abc123' },
        'other-memory': { embedding: [0.3, 0.4], hash: 'def456' },
      },
    };

    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockReturnValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockImplementation(() => {});
    vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(true);
    vi.spyOn(graphModule, 'loadGraph').mockResolvedValue({ version: 1, nodes: [], edges: [] });
    vi.spyOn(graphModule, 'removeNode').mockReturnValue({ version: 1, nodes: [], edges: [] });
    vi.spyOn(graphModule, 'saveGraph').mockResolvedValue(undefined);

    // Mock fs for embeddings cleanup
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockEmbeddings));
    const writeFileSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    const result = await deleteMemory({ id: mockId, basePath: mockBasePath });

    expect(result.status).toBe('success');
    expect(writeFileSpy).toHaveBeenCalled();
    const writtenContent = JSON.parse(writeFileSpy.mock.calls[0][1] as string);
    expect(writtenContent.memories['learning-test']).toBeUndefined();
    expect(writtenContent.memories['other-memory']).toBeDefined();
  });

  it('should handle embeddings cleanup failure gracefully', async () => {
    const mockId = 'learning-test';
    const mockBasePath = '/test/base';

    vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
    vi.spyOn(fsUtils, 'fileExists').mockReturnValue(true);
    vi.spyOn(fsUtils, 'deleteFile').mockImplementation(() => {});
    vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(true);
    vi.spyOn(graphModule, 'loadGraph').mockResolvedValue({ version: 1, nodes: [], edges: [] });
    vi.spyOn(graphModule, 'removeNode').mockReturnValue({ version: 1, nodes: [], edges: [] });
    vi.spyOn(graphModule, 'saveGraph').mockResolvedValue(undefined);

    // Mock embeddings to throw error
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('Read failed');
    });

    const result = await deleteMemory({ id: mockId, basePath: mockBasePath });

    // Should still succeed - embeddings cleanup is best-effort
    expect(result.status).toBe('success');
  });
});
