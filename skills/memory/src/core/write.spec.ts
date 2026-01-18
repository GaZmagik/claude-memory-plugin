/**
 * Tests for T028: Memory Write Operation
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { writeMemory } from './write.js';
import type { WriteMemoryRequest } from '../types/api.js';
import { Scope, MemoryType, Severity } from '../types/enums.js';
// validation module now tested via real calls, not mocks
import * as slug from './slug.js';
import * as frontmatter from './frontmatter.js';
import * as fsUtils from './fs-utils.js';
import * as indexModule from './index.js';
import * as gitignore from '../scope/gitignore.js';
import * as semantic from '../search/semantic.js';
import * as link from '../graph/link.js';
import * as embedding from '../search/embedding.js';
import * as graph from '../graph/structure.js';

describe('writeMemory', () => {
  const mockBasePath = '/test/base';
  const mockProjectRoot = '/test/project';

  beforeAll(() => {
    // Mock toISOString for deterministic timestamps - allows createFrontmatter to run naturally
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-01-11T00:00:00.000Z');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validation', () => {
    it('should return error when validation fails', async () => {
      // Use actually invalid input - no need to mock validation
      const invalidRequest: WriteMemoryRequest = {
        type: 'invalid-type' as MemoryType,
        title: '',
        content: 'test',
        tags: [],
        scope: Scope.Local,
      };

      const result = await writeMemory(invalidRequest);

      expect(result.status).toBe('error');
      // Real validation catches both invalid type and empty title
      expect(result.error).toContain('title');
      expect(result.error).toContain('type');
    });

    it('should combine multiple validation errors', async () => {
      // Use actually invalid input - real validation catches all issues
      const invalidRequest: WriteMemoryRequest = {
        type: 'invalid' as MemoryType,
        title: '',
        content: 'test',
        tags: [''],  // Empty string in tags is invalid
        scope: 'invalid' as Scope,
      };

      const result = await writeMemory(invalidRequest);

      expect(result.status).toBe('error');
      // Real validation produces actual error messages
      expect(result.error).toContain('type');
      expect(result.error).toContain('title');
      expect(result.error).toContain('tags');
      expect(result.error).toContain('scope');
    });

    it('should proceed when validation passes', async () => {
      // Valid input passes real validation - no mock needed
      const validRequest: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test Learning',
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      // Only mock I/O operations - let pure functions (createFrontmatter, serialiseMemoryFile) run naturally
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test-learning'));
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();

      const result = await writeMemory(validRequest);

      expect(result.status).toBe('success');
      expect(result.memory).toBeDefined();
      expect(result.memory!.id).toBe('learning-test-learning');
    });

    it('should reject custom ID with mismatched type prefix', async () => {
      const mismatchedRequest: WriteMemoryRequest = {
        id: memoryId('learning-some-topic'),  // ID says "learning"
        type: MemoryType.Decision,   // but type is "decision"
        title: 'Some Topic',
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Project,
        basePath: mockBasePath,
      };

      // Real validation passes for valid input
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});

      const result = await writeMemory(mismatchedRequest);

      expect(result.status).toBe('error');
      expect(result.error).toContain('ID prefix');
      expect(result.error).toContain('learning');
      expect(result.error).toContain('decision');
    });

    it('should accept custom ID with matching type prefix', async () => {
      const matchingRequest: WriteMemoryRequest = {
        id: memoryId('gotcha-test-issue'),
        type: MemoryType.Gotcha,
        title: 'Test Issue',
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Project,
        basePath: mockBasePath,
      };

      // Only mock I/O - let createFrontmatter run naturally
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();

      const result = await writeMemory(matchingRequest);

      expect(result.status).toBe('success');
      expect(result.memory).toBeDefined();
      expect(result.memory!.id).toBe('gotcha-test-issue');
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

      // Real validation passes for valid input
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();
    });

    it('should generate unique ID', async () => {
      const mockId = memoryId('learning-test-memory');
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);
      // createFrontmatter runs naturally with mocked Date.toISOString

      await writeMemory(validRequest);

      expect(slug.generateUniqueId).toHaveBeenCalledWith(
        MemoryType.Learning,
        'Test Memory',
        mockBasePath
      );
    });

    it('should create frontmatter with all fields', async () => {
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test', 'learning'],
        severity: Severity.Medium,
      };
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);

      await writeMemory(validRequest);

      expect(frontmatter.createFrontmatter).toHaveBeenCalledWith({
        id: memoryId('learning-test'),
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
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test'],
      };
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);
      // Spy on serialiseMemoryFile to verify it's called, but let it run for real
      vi.spyOn(frontmatter, 'serialiseMemoryFile');

      await writeMemory(validRequest);

      expect(frontmatter.serialiseMemoryFile).toHaveBeenCalledWith(
        mockFrontmatter,
        'Test content'
      );
    });

    it('should write file atomically', async () => {
      const mockId = memoryId('learning-test-memory');
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      };
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);
      // Let serialiseMemoryFile run for real - check content flexibly
      await writeMemory(validRequest);

      expect(fsUtils.writeFileAtomic).toHaveBeenCalledWith(
        `${mockBasePath}/permanent/${mockId}.md`,
        expect.stringContaining('type: learning')
      );
    });

    it('should update index with correct entry', async () => {
      const mockId = memoryId('learning-test-memory');
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
      const mockId = memoryId('learning-test-memory');
      const mockFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test'],
      };

      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue(mockFrontmatter);

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

      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      });

      await writeMemory(requestWithCustomPath);

      expect(fsUtils.ensureDir).toHaveBeenCalledWith(customBasePath);
      expect(slug.generateUniqueId).toHaveBeenCalledWith(
        MemoryType.Learning,
        'Test Memory',
        customBasePath
      );
    });

    it('should auto-add enterprise tag for Enterprise scope', async () => {
      const enterpriseRequest = {
        ...validRequest,
        scope: Scope.Enterprise,
      };

      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test', 'learning', 'enterprise'],
      });

      await writeMemory(enterpriseRequest);

      expect(frontmatter.createFrontmatter).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['test', 'learning', 'enterprise'],
          scope: Scope.Enterprise,
        })
      );
    });

    it('should auto-add user tag for Global scope', async () => {
      const globalRequest = {
        ...validRequest,
        scope: Scope.Global,
      };

      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: ['test', 'learning', 'user'],
      });

      await writeMemory(globalRequest);

      expect(frontmatter.createFrontmatter).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['test', 'learning', 'user'],
          scope: Scope.Global,
        })
      );
    });
  });

  describe('gitignore automation', () => {
    beforeEach(() => {
      // Real validation passes for valid input
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      vi.spyOn(frontmatter, 'createFrontmatter').mockReturnValue({
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-11T00:00:00.000Z',
        updated: '2026-01-11T00:00:00.000Z',
        tags: [],
      });
      // serialiseMemoryFile runs for real
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

      // Only mock I/O - createFrontmatter runs naturally
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();

      await writeMemory(request);

      expect(fsUtils.ensureDir).toHaveBeenCalledWith(mockBasePath);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      // Only mock I/O - createFrontmatter runs naturally
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
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

  describe('cross-scope duplicate detection', () => {
    beforeEach(() => {
      // Only mock I/O - createFrontmatter runs naturally
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test-topic'));
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();
    });

    it('should reject if memory ID already exists in another scope', async () => {
      // Mock file existence check - memory exists in a different scope
      vi.spyOn(fsUtils, 'fileExists').mockImplementation((path: string) => {
        // Exists in project scope, but we're trying to write to local scope
        return path.includes('/.claude/memory/permanent/learning-test-topic.md');
      });

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test Topic',
        content: 'Content',
        tags: [],
        scope: Scope.Local,  // Trying to write to local
        basePath: mockBasePath,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('already exists');
    });

    it('should allow write if memory ID does not exist in any scope', async () => {
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(false);

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Unique Topic',
        content: 'Content',
        tags: [],
        scope: Scope.Local,
        basePath: mockBasePath,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('success');
      expect(result.memory?.id).toBe('learning-test-topic');
    });

    it('should check all scopes for duplicate IDs', async () => {
      const fileExistsSpy = vi.spyOn(fsUtils, 'fileExists').mockReturnValue(false);

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Topic',
        content: 'Content',
        tags: [],
        scope: Scope.Project,
        basePath: mockBasePath,
      };

      await writeMemory(request);

      // Should check project, local, and global paths
      expect(fileExistsSpy).toHaveBeenCalled();
    });
  });

  describe('similar titles warning', () => {
    beforeEach(() => {
      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        memories: [],
      });
      // Only mock I/O - createFrontmatter runs naturally
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test-topic'));
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();
      vi.spyOn(fsUtils, 'fileExists').mockReturnValue(false);
    });

    it('should include warning if similar title exists', async () => {
      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        memories: [{
          id: memoryId('learning-existing-topic'),
          type: MemoryType.Learning,
          title: 'Test Topic Already Exists',  // Similar title
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          relativePath: 'permanent/learning-existing-topic.md',
          scope: Scope.Project,
        }],
      });

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test Topic',  // Similar to existing
        content: 'Content',
        tags: [],
        scope: Scope.Project,
        basePath: mockBasePath,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('success');
      expect(result.similarTitles).toBeDefined();
      expect(result.similarTitles!.length).toBeGreaterThan(0);
    });

    it('should not include warning if no similar titles', async () => {
      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        memories: [{
          id: memoryId('learning-unrelated'),
          type: MemoryType.Learning,
          title: 'Completely Different Title',
          tags: [],
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
          relativePath: 'permanent/learning-unrelated.md',
          scope: Scope.Project,
        }],
      });

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Unique Title',
        content: 'Content',
        tags: [],
        scope: Scope.Project,
        basePath: mockBasePath,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('success');
      expect(result.similarTitles).toBeUndefined();
    });
  });

  describe('auto-link functionality', () => {
    beforeEach(() => {
      // Only mock I/O - createFrontmatter runs naturally
      vi.spyOn(fsUtils, 'ensureDir').mockImplementation(() => {});
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(memoryId('learning-test'));
      vi.spyOn(fsUtils, 'writeFileAtomic').mockImplementation(() => {});
      vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();
      vi.spyOn(graph, 'loadGraph').mockResolvedValue({ version: 1, nodes: [], edges: [] });
      vi.spyOn(graph, 'hasNode').mockReturnValue(false);
      vi.spyOn(graph, 'addNode').mockReturnValue({ version: 1, nodes: [{ id: memoryId('learning-test'), type: MemoryType.Learning }], edges: [] });
      vi.spyOn(graph, 'saveGraph').mockResolvedValue();
    });

    it('should generate embedding and create links when provider given', async () => {
      const mockProvider = { name: 'mock', generate: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
      vi.spyOn(embedding, 'generateEmbedding').mockResolvedValue([0.1, 0.2, 0.3]);
      vi.spyOn(embedding, 'loadEmbeddingCache').mockResolvedValue({ version: 1, memories: {} });
      vi.spyOn(embedding, 'saveEmbeddingCache').mockResolvedValue();
      vi.spyOn(embedding, 'generateContentHash').mockReturnValue('abc123');
      vi.spyOn(semantic, 'findSimilarToMemory').mockResolvedValue([{ id: memoryId('learning-similar'), score: 0.9, type: MemoryType.Learning, title: 'Similar', tags: [] }]);
      vi.spyOn(link, 'linkMemories').mockResolvedValue({ status: 'success', alreadyExists: false });

      const result = await writeMemory({
        type: MemoryType.Learning, title: 'Test', content: 'Content', tags: [], scope: Scope.Local,
        basePath: mockBasePath, autoLink: true, embeddingProvider: mockProvider,
      });

      expect(result.status).toBe('success');
      expect(embedding.generateEmbedding).toHaveBeenCalledWith('Content', mockProvider);
      expect(embedding.saveEmbeddingCache).toHaveBeenCalled();
      expect(link.linkMemories).toHaveBeenCalled();
      expect(result.autoLinked).toBe(1);
    });

    it('should skip embedding generation without provider', async () => {
      vi.spyOn(embedding, 'generateEmbedding');
      vi.spyOn(semantic, 'findSimilarToMemory').mockResolvedValue([]);

      const result = await writeMemory({
        type: MemoryType.Learning, title: 'Test', content: 'Content', tags: [], scope: Scope.Local,
        basePath: mockBasePath, autoLink: true, // No embeddingProvider
      });

      expect(result.status).toBe('success');
      expect(embedding.generateEmbedding).not.toHaveBeenCalled();
      expect(result.autoLinked).toBe(0);
    });

    it('should gracefully handle auto-link errors', async () => {
      const mockProvider = { name: 'mock', generate: vi.fn().mockResolvedValue([0.1, 0.2]) };
      vi.spyOn(embedding, 'generateEmbedding').mockRejectedValue(new Error('Ollama down'));
      vi.spyOn(embedding, 'loadEmbeddingCache').mockResolvedValue({ version: 1, memories: {} });

      const result = await writeMemory({
        type: MemoryType.Learning, title: 'Test', content: 'Content', tags: [], scope: Scope.Local,
        basePath: mockBasePath, autoLink: true, embeddingProvider: mockProvider,
      });

      expect(result.status).toBe('success'); // Memory still written
      expect(result.autoLinked).toBe(0); // But no links created
    });
  });
});
