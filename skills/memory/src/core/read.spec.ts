/**
 * Tests for T029: Memory Read Operation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { readMemory } from './read.js';
import type { ReadMemoryRequest } from '../types/api.js';
import type { IndexEntry } from '../types/memory.js';
import { MemoryType, Scope } from '../types/enums.js';
import * as indexModule from './index.js';
import * as fsUtils from './fs-utils.js';
// parseMemoryFile runs naturally - no mock needed

describe('readMemory', () => {
  const mockBasePath = '/test/base';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validation', () => {
    it('should return error when id is empty', async () => {
      const request: ReadMemoryRequest = {
        id: memoryId(''),
      };

      const result = await readMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe('id is required');
    });

    it('should return error when id is whitespace only', async () => {
      const request: ReadMemoryRequest = {
        id: memoryId('   '),
      };

      const result = await readMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe('id is required');
    });
  });

  describe('successful read', () => {
    const mockId = memoryId('learning-test-memory');
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
    const mockContent = 'This is test content';
    // Valid YAML file content that parseMemoryFile can parse
    const mockFileContent = `---
type: learning
title: Test Memory
created: 2026-01-11T00:00:00.000Z
updated: 2026-01-11T00:00:00.000Z
tags:
  - test
scope: local
---

${mockContent}
`;

    it('should read memory found in index', async () => {
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(mockIndexEntry);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(mockFileContent);

      const result = await readMemory(request);

      expect(result.status).toBe('success');
      expect(indexModule.findInIndex).toHaveBeenCalledWith(mockBasePath, mockId);
      expect(fsUtils.fileExists).toHaveBeenCalledWith(`${mockBasePath}/${mockId}.md`);
      expect(fsUtils.readFile).toHaveBeenCalledWith(`${mockBasePath}/${mockId}.md`);
    });

    it('should read memory with direct file lookup when not in index', async () => {
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(mockFileContent);

      const result = await readMemory(request);

      expect(result.status).toBe('success');
      expect(indexModule.findInIndex).toHaveBeenCalledWith(mockBasePath, mockId);
      // Should fall back to direct file path
      expect(fsUtils.fileExists).toHaveBeenCalledWith(`${mockBasePath}/${mockId}.md`);
    });

    it('should use custom basePath when provided', async () => {
      const customBasePath = '/custom/path';
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: customBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(mockIndexEntry);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(mockFileContent);

      await readMemory(request);

      expect(indexModule.findInIndex).toHaveBeenCalledWith(customBasePath, mockId);
      expect(fsUtils.fileExists).toHaveBeenCalledWith(`${customBasePath}/${mockId}.md`);
    });

    it('should return frontmatter and content', async () => {
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(mockIndexEntry);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(mockFileContent);

      const result = await readMemory(request);

      expect(result.status).toBe('success');
      if (result.status === 'success' && result.memory) {
        expect(result.memory.frontmatter.type).toBe(MemoryType.Learning);
        expect(result.memory.frontmatter.title).toBe('Test Memory');
        expect(result.memory.frontmatter.tags).toEqual(['test']);
        expect(result.memory.frontmatter.scope).toBe(Scope.Local);
        expect(result.memory.content).toBe(mockContent);
      }
    });

    it('should return file path in response', async () => {
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(mockIndexEntry);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(mockFileContent);

      const result = await readMemory(request);

      expect(result.status).toBe('success');
      if (result.status === 'success' && result.memory) {
        expect(result.memory.filePath).toBe(`${mockBasePath}/${mockId}.md`);
      }
    });
  });

  describe('error handling', () => {
    const mockId = 'learning-test-memory';

    it('should return error when memory file not found', async () => {
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(false);

      const result = await readMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toBe(`Memory not found: ${mockId}`);
    });

    it('should handle file read errors gracefully', async () => {
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtils, 'readFile').mockImplementation(async () => {
        throw new Error('EACCES: Permission denied');
      });

      const result = await readMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to read memory');
      expect(result.error).toContain('Permission denied');
    });

    it('should handle parsing errors gracefully', async () => {
      const request: ReadMemoryRequest = {
        id: mockId,
        basePath: mockBasePath,
      };

      vi.spyOn(indexModule, 'findInIndex').mockResolvedValue(null);
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      // Use invalid content - parseMemoryFile runs naturally and throws
      vi.spyOn(fsUtils, 'readFile').mockResolvedValue('invalid file content without frontmatter');

      const result = await readMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to read memory');
      expect(result.error).toContain('missing frontmatter delimiters');
    });
  });
});
