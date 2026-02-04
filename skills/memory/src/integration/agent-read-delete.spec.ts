/**
 * T034-T035: Integration tests for reading and deleting agent-scoped memories
 *
 * Tests read and delete operations on agent-scoped memories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { readMemory } from '../core/read.js';
import { deleteMemory } from '../core/delete.js';
import type { ReadMemoryRequest, DeleteMemoryRequest } from '../types/api.js';
import { Scope, MemoryType } from '../types/enums.js';
import * as indexModule from '../core/index.js';
import * as fsUtils from '../core/fs-utils.js';

describe('Agent-scoped read and delete operations', () => {
  const mockProjectRoot = '/test/project';
  const mockGlobalRoot = '/test/global';

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock file system operations to prevent actual file I/O
    vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
    vi.spyOn(fsUtils, 'readFile').mockResolvedValue('');
    vi.spyOn(fsUtils, 'writeFileAtomic').mockResolvedValue(undefined);
    vi.spyOn(fsUtils, 'deleteFile').mockResolvedValue(undefined);
    vi.spyOn(fsUtils, 'isInsideDir').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('read from agent scope', () => {
    it('should read memory from agent-project scope', async () => {
      const mockId = memoryId('learning-typescript-pattern');
      const mockIndexEntry = {
        id: mockId,
        type: MemoryType.Learning,
        title: 'TypeScript Pattern',
        tags: ['typescript'],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        relativePath: 'permanent/learning-typescript-pattern.md',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
      };

      const mockFileContent = `---
type: learning
title: TypeScript Pattern
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - typescript
scope: agent-project
agent: typescript-expert
---

# TypeScript Pattern

Advanced pattern...`;

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [mockIndexEntry],
      });

      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(mockFileContent);

      const request: ReadMemoryRequest = {
        id: mockId,
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        basePath: mockProjectRoot,
      };

      const result = await readMemory(request);

      expect(result.status).toBe('success');
      expect(result.memory).toBeDefined();
      expect(result.memory!.frontmatter.agent).toBe('typescript-expert');
      expect(result.memory!.frontmatter.scope).toBe(Scope.AgentProject);
      expect(result.memory!.content).toContain('Advanced pattern');
    });

    it('should read memory from agent-global scope', async () => {
      const mockId = memoryId('decision-api-design');
      const mockIndexEntry = {
        id: mockId,
        type: MemoryType.Decision,
        title: 'API Design',
        tags: ['api'],
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
        relativePath: 'permanent/decision-api-design.md',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
      };

      const mockFileContent = `---
type: decision
title: API Design
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - api
scope: agent-global
agent: api-architect
---

# API Design

REST API design...`;

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [mockIndexEntry],
      });

      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(mockFileContent);

      const request: ReadMemoryRequest = {
        id: mockId,
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
        basePath: mockGlobalRoot,
      };

      const result = await readMemory(request);

      expect(result.status).toBe('success');
      expect(result.memory!.frontmatter.agent).toBe('api-architect');
      expect(result.memory!.frontmatter.scope).toBe(Scope.AgentGlobal);
    });

    it('should reject read without agent field for agent scope', async () => {
      const request: ReadMemoryRequest = {
        id: memoryId('learning-test'),
        scope: Scope.AgentProject,
        // Missing agent field
        basePath: mockProjectRoot,
      };

      const result = await readMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('agent');
    });

    it('should use correct agent directory path', async () => {
      const mockId = memoryId('learning-test');
      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [],
      });

      const request: ReadMemoryRequest = {
        id: mockId,
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        basePath: mockProjectRoot,
      };

      await readMemory(request);

      // Verify loadIndex called with agent directory
      expect(indexModule.loadIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: expect.stringContaining('.claude/memory/agents/typescript-expert')
        })
      );
    });
  });

  describe('delete from agent scope', () => {
    it('should delete memory from agent-project scope', async () => {
      const mockId = memoryId('learning-typescript-pattern');
      const mockIndexEntry = {
        id: mockId,
        type: MemoryType.Learning,
        title: 'TypeScript Pattern',
        tags: ['typescript'],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        relativePath: 'permanent/learning-typescript-pattern.md',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
      };

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [mockIndexEntry],
      });

      vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(true);

      const request: DeleteMemoryRequest = {
        id: mockId,
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        basePath: mockProjectRoot,
      };

      const result = await deleteMemory(request);

      expect(result.status).toBe('success');
      expect(result.deletedId).toBe(mockId);

      // Verify file deleted from agent directory
      expect(fsUtils.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('agents/typescript-expert/permanent')
      );
    });

    it('should delete memory from agent-global scope', async () => {
      const mockId = memoryId('decision-api-design');
      const mockIndexEntry = {
        id: mockId,
        type: MemoryType.Decision,
        title: 'API Design',
        tags: ['api'],
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
        relativePath: 'permanent/decision-api-design.md',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
      };

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [mockIndexEntry],
      });

      vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(true);

      const request: DeleteMemoryRequest = {
        id: mockId,
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
        basePath: mockGlobalRoot,
      };

      const result = await deleteMemory(request);

      expect(result.status).toBe('success');
      expect(fsUtils.deleteFile).toHaveBeenCalledWith(
        expect.stringContaining('agents/api-architect/permanent')
      );
    });

    it('should reject delete without agent field for agent scope', async () => {
      const request: DeleteMemoryRequest = {
        id: memoryId('learning-test'),
        scope: Scope.AgentProject,
        // Missing agent field
        basePath: mockProjectRoot,
      };

      const result = await deleteMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('agent');
    });

    it('should remove from agent-specific index', async () => {
      const mockId = memoryId('learning-test');
      const mockIndexEntry = {
        id: mockId,
        type: MemoryType.Learning,
        title: 'Test',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        relativePath: 'permanent/learning-test.md',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
      };

      vi.spyOn(indexModule, 'loadIndex').mockResolvedValue({
        version: '1.0.0',
        lastUpdated: '2026-01-10T12:00:00Z',
        memories: [mockIndexEntry],
      });

      vi.spyOn(indexModule, 'removeFromIndex').mockResolvedValue(true);

      const request: DeleteMemoryRequest = {
        id: mockId,
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        basePath: mockProjectRoot,
      };

      await deleteMemory(request);

      // Verify removeFromIndex called with agent directory
      expect(indexModule.removeFromIndex).toHaveBeenCalledWith(
        expect.stringContaining('.claude/memory/agents/typescript-expert'),
        mockId
      );
    });
  });
});
