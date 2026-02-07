/**
 * T032-T033: Integration tests for writing agent-scoped memories
 *
 * Tests writing memories to agent-project and agent-global scopes.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { writeMemory } from '../core/write.js';
import type { WriteMemoryRequest } from '../types/api.js';
import { Scope, MemoryType } from '../types/enums.js';
import * as slug from '../core/slug.js';
import * as fsUtils from '../core/fs-utils.js';
import * as indexModule from '../core/index.js';

describe('Agent-scoped write operations', () => {
  const mockProjectRoot = '/test/project';
  const mockGlobalRoot = '/test/global';

  beforeAll(() => {
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-01-11T00:00:00.000Z');
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock I/O operations
    vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);
    vi.spyOn(fsUtils, 'writeFileAtomic').mockResolvedValue(undefined);
    vi.spyOn(indexModule, 'addToIndex').mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('write to agent-project scope', () => {
    it('should write memory to agent-project directory', async () => {
      const mockId = memoryId('learning-typescript-pattern');
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'TypeScript Pattern',
        content: 'Advanced TypeScript pattern...',
        tags: ['typescript'],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        basePath: mockProjectRoot,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('success');
      expect(result.memory).toBeDefined();
      expect(result.memory!.id).toBe(mockId);
      expect(result.memory!.scope).toBe(Scope.AgentProject);
      expect(result.memory!.agent).toBe('typescript-expert');

      // Verify directory creation
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.claude/memory/agents/typescript-expert')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('.claude/memory/agents/typescript-expert/permanent')
      );

      // Verify file written to agent directory
      expect(fsUtils.writeFileAtomic).toHaveBeenCalledWith(
        expect.stringContaining('agents/typescript-expert/permanent'),
        expect.any(String)
      );
    });

    it('should reject agent-project scope without agent field', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.AgentProject,
        // Missing agent field
        basePath: mockProjectRoot,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('agent');
    });

    it('should include agent field in frontmatter', async () => {
      const mockId = memoryId('decision-api-design');
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);

      const request: WriteMemoryRequest = {
        type: MemoryType.Decision,
        title: 'API Design',
        content: 'REST API design...',
        tags: ['api'],
        scope: Scope.AgentProject,
        agent: 'api-architect',
        basePath: mockProjectRoot,
      };

      await writeMemory(request);

      // Verify agent field in serialised content
      const writeCall = (fsUtils.writeFileAtomic as any).mock.calls[0];
      const fileContent = writeCall[1];

      expect(fileContent).toContain('scope: agent-project');
      expect(fileContent).toContain('agent: api-architect');
    });

    it('should sanitise agent name before directory creation', async () => {
      const mockId = memoryId('learning-test');
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'TypeScript Expert', // Should be sanitised
        basePath: mockProjectRoot,
      };

      await writeMemory(request);

      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('typescript-expert')
      );
    });
  });

  describe('write to agent-global scope', () => {
    it('should write memory to agent-global directory', async () => {
      const mockId = memoryId('decision-global-api');
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);

      const request: WriteMemoryRequest = {
        type: MemoryType.Decision,
        title: 'Global API Decision',
        content: 'Global API pattern...',
        tags: ['api', 'global'],
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
        basePath: mockGlobalRoot,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('success');
      expect(result.memory!.scope).toBe(Scope.AgentGlobal);
      expect(result.memory!.agent).toBe('api-architect');

      // Verify written to global agents directory
      expect(fsUtils.writeFileAtomic).toHaveBeenCalledWith(
        expect.stringContaining(`${mockGlobalRoot}/agents/api-architect/permanent`),
        expect.any(String)
      );
    });

    it('should reject agent-global scope without agent field', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Decision,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.AgentGlobal,
        // Missing agent field
        basePath: mockGlobalRoot,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toContain('agent');
    });

    it('should create separate directories for different agents', async () => {
      const mockId1 = memoryId('learning-rust-1');
      const mockId2 = memoryId('learning-python-1');

      vi.spyOn(slug, 'generateUniqueId')
        .mockReturnValueOnce(mockId1)
        .mockReturnValueOnce(mockId2);

      // Write to rust-expert
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Rust Pattern',
        content: 'Rust...',
        tags: ['rust'],
        scope: Scope.AgentGlobal,
        agent: 'rust-expert',
        basePath: mockGlobalRoot,
      });

      // Write to python-expert
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Python Pattern',
        content: 'Python...',
        tags: ['python'],
        scope: Scope.AgentGlobal,
        agent: 'python-expert',
        basePath: mockGlobalRoot,
      });

      // Verify separate directories
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('agents/rust-expert')
      );
      expect(fsUtils.ensureDir).toHaveBeenCalledWith(
        expect.stringContaining('agents/python-expert')
      );
    });
  });

  describe('agent validation', () => {
    it('should sanitise and accept agent name with uppercase', async () => {
      const mockId = memoryId('learning-test');
      vi.spyOn(slug, 'generateUniqueId').mockReturnValue(mockId);

      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'TypeScript-Expert', // Will be sanitised to typescript-expert
        basePath: mockProjectRoot,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('success');
      expect(result.memory!.agent).toBe('typescript-expert');
    });

    it('should reject reserved agent name', async () => {
      const request: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test',
        content: 'Content',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'system', // Reserved
        basePath: mockProjectRoot,
      };

      const result = await writeMemory(request);

      expect(result.status).toBe('error');
      expect(result.error).toMatch(/agent/i);
    });
  });
});
