/**
 * Tests for T032: Memory Delete Operation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deleteMemory } from '../../../skills/memory/src/core/delete.js';
import type { DeleteMemoryRequest } from '../../../skills/memory/src/types/api.js';
import type { IndexEntry } from '../../../skills/memory/src/types/memory.js';
import { MemoryType, Scope } from '../../../skills/memory/src/types/enums.js';
import * as indexModule from '../../../skills/memory/src/core/index.js';
import * as fsUtils from '../../../skills/memory/src/core/fs-utils.js';

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
  });
});
