/**
 * Tests for T028: Memory Write Operation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeMemory } from './write.js';
import type { WriteMemoryRequest } from '../types/api.js';
import { Scope, MemoryType, Severity } from '../types/enums.js';
import * as validation from './validation.js';
import * as slug from './slug.js';
import * as frontmatter from './frontmatter.js';
import * as fsUtils from './fs-utils.js';
import * as indexModule from './index.js';
import * as gitignore from '../scope/gitignore.js';

describe('writeMemory', () => {
  const mockBasePath = '/test/base';
  const mockProjectRoot = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validation', () => {
    it('should return error when validation fails', async () => {
      const invalidRequest: WriteMemoryRequest = {
        type: 'invalid-type' as MemoryType,
        title: '',
        content: 'test',
        tags: [],
        scope: Scope.Local,
      };

      vi.spyOn(validation, 'validateWriteRequest').mockReturnValue({
        valid: false,
        errors: [{ field: 'type', message: 'Invalid type' }],
      });

      const result = await writeMemory(invalidRequest);

      expect(result.status).toBe('error');
      expect(result.error).toContain('type: Invalid type');
      expect(validation.validateWriteRequest).toHaveBeenCalledWith(invalidRequest);
    });

    it('should combine multiple validation errors', async () => {
      const invalidRequest: WriteMemoryRequest = {
        type: 'invalid' as MemoryType,
        title: '',
        content: 'test',
        tags: [''],
        scope: 'invalid' as Scope,
      };

      vi.spyOn(validation, 'validateWriteRequest').mockReturnValue({
        valid: false,
        errors: [
          { field: 'type', message: 'Invalid type' },
          { field: 'title', message: 'Title required' },
          { field: 'scope', message: 'Invalid scope' },
        ],
      });

      const result = await writeMemory(invalidRequest);

      expect(result.status).toBe('error');
      expect(result.error).toContain('type: Invalid type');
      expect(result.error).toContain('title: Title required');
      expect(result.error).toContain('scope: Invalid scope');
    });

    it('should proceed when validation passes', async () => {
      const validRequest: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test Learning',
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      vi.spyOn(validation, 'validateWriteRequest').mockReturnValue({
        valid: true,
        errors: [],
      });
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue('learning-test-learning');
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test Learning',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test'],
      });
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('---\ntype: learning\n---\nTest content\n');
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();

      const result = await writeMemory(validRequest);

      expect(result.status).toBe('success');
      expect(validation.validateWriteRequest).toHaveBeenCalledWith(validRequest);
    });
  });

  describe('successful write', () => {
    let validRequest: WriteMemoryRequest;

    beforeEach(() => {
      validRequest = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        content: 'Test content',
        tags: ['test', 'learning'],
        scope: Scope.Local,
        severity: Severity.Medium,
        basePath: mockBasePath,
      };

      vi.spyOn(validation, 'validateWriteRequest').mockReturnValue({
        valid: true,
        errors: [],
      });
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();
    });

    it('should generate unique ID', async () => {
      const mockId = 'learning-test-memory';
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test', 'learning'],
      });
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');

      await writeMemory(validRequest);

      expect(slug.generateUniqueId).toHaveBeenCalledWith(
        MemoryType.Learning,
        'Test Memory',
        mockBasePath
      );
    });

    it('should create frontmatter with all fields', async () => {
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue('learning-test');
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test', 'learning'],
        severity: Severity.Medium,
      };
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');

      await writeMemory(validRequest);

      expect(frontmatter.createFrontmatter).toHaveBeenCalledWith({
        id: 'learning-test',
        type: MemoryType.Learning,
        title: 'Test Memory',
        tags: ['test', 'learning', 'local'],  // 'local' auto-added from scope
        scope: Scope.Local,
        project: undefined,
        severity: Severity.Medium,
        links: undefined,
        source: undefined,
        meta: undefined,
      });
    });

    it('should serialise memory file', async () => {
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue('learning-test');
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test'],
      };
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('serialised content');

      await writeMemory(validRequest);

      expect(frontmatter.serialiseMemoryFile).toHaveBeenCalledWith(
        mockFrontmatter,
        'Test content'
      );
    });

    it('should write file atomically', async () => {
      const mockId = 'learning-test-memory';
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      });
      const serialisedContent = '---\ntype: learning\n---\nTest content\n';
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue(serialisedContent);

      await writeMemory(validRequest);

      expect(fsUtils.writeFileAtomic).toHaveBeenCalledWith(
        `${mockBasePath}/permanent/${mockId}.md`,
        serialisedContent
      );
    });

    it('should update index with correct entry', async () => {
      const mockId = 'learning-test-memory';
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test', 'learning'],
        severity: Severity.Medium,
      };

      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');

      await writeMemory(validRequest);

      expect(indexModule.addToIndex).toHaveBeenCalledWith(mockBasePath, {
        id: mockId,
        type: MemoryType.Learning,
        title: 'Test Memory',
        tags: ['test', 'learning', 'local'],  // 'local' auto-added from scope
        created: mockFrontmatter.created,
        updated: mockFrontmatter.updated,
        scope: Scope.Local,
        relativePath: `permanent/${mockId}.md`,
        severity: Severity.Medium,
      });
    });

    it('should return success with memory details', async () => {
      const mockId = 'learning-test-memory';
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test'],
      };

      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');

      const result = await writeMemory(validRequest);

      expect(result.status).toBe('success');
      if (result.status === 'success' && result.memory) {
        expect(result.memory.id).toBe(mockId);
        expect(result.memory.filePath).toBe(`${mockBasePath}/permanent/${mockId}.md`);
        expect(result.memory.frontmatter).toEqual(mockFrontmatter);
        expect(result.memory.scope).toBe(Scope.Local);
      }
    });

    it('should use custom basePath when provided', async () => {
      const customBasePath = '/custom/path';
      const requestWithCustomPath = {
        ...validRequest,
        basePath: customBasePath,
      };

      vi.spyOn(slug, 'generateUniqueId').mockReturnValue('learning-test');
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      });
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');

      await writeMemory(requestWithCustomPath);

      expect(fsUtils.ensureDir).toHaveBeenCalledWith(customBasePath);
      expect(slug.generateUniqueId).toHaveBeenCalledWith(
        MemoryType.Learning,
        'Test Memory',
        customBasePath
      );
    });
  });

  describe('gitignore automation', () => {
    beforeEach(() => {
      vi.spyOn(validation, 'validateWriteRequest').mockReturnValue({
        valid: true,
        errors: [],
      });
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue('learning-test');
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      });
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();
      vi.spyOn(gitignore, 'ensureLocalScopeGitignored').mockReturnValue({
        created: false,
        modified: false,
        alreadyPresent: true,
        skipped: false,
      });
    });

    it('should ensure local scope is gitignored when projectRoot provided', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.Local,
        projectRoot: mockProjectRoot,
        basePath: mockBasePath,
      };

      await writeMemory(request);

      expect(gitignore.ensureLocalScopeGitignored).toHaveBeenCalledWith(mockProjectRoot);
    });

    it('should not call gitignore for non-local scopes', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.Project,
        projectRoot: mockProjectRoot,
        basePath: mockBasePath,
      };

      await writeMemory(request);

      expect(gitignore.ensureLocalScopeGitignored).not.toHaveBeenCalled();
    });

    it('should not call gitignore when projectRoot not provided', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      await writeMemory(request);

      expect(gitignore.ensureLocalScopeGitignored).not.toHaveBeenCalled();
    });
  });

  describe('directory handling', () => {
    it('should ensure directory exists before writing', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      vi.spyOn(validation, 'validateWriteRequest').mockReturnValue({
        valid: true,
        errors: [],
      });
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue('learning-test');
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      });
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();

      await writeMemory(request);

      expect(fsUtils.ensureDir).toHaveBeenCalledWith(mockBasePath);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      vi.spyOn(validation, 'validateWriteRequest').mockReturnValue({
        valid: true,
        errors: [],
      });
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue('learning-test');
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      });
      vi.spyOn(frontmatter, 'serialiseMemoryFile').mockReturnValue('content');
    });

    it('should handle file write errors', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {
        throw new Error('EACCES: Permission denied');
      });

      const result = await writeMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to write memory');
      expect(result.error).toContain('Permission denied');
    });

    it('should handle index update errors', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockRejectedValue(new Error('Index corrupted'));

      const result = await writeMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Failed to write memory');
      expect(result.error).toContain('Index corrupted');
    });

    it('should return error status with message', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      const errorMessage = 'Disk full';
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = await writeMemory(request);

      expect(result.status).toBe('error');
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
      expect(result.error).toContain(errorMessage);
    });
  });
});
