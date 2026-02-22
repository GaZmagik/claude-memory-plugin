/**
 * Tests for read-only protection guards in move and promote operations
 *
 * T092: cmdMove rejects rule nodes
 * T093: cmdMove rejects reminder nodes
 * T094: cmdPromote rejects rule nodes
 * T095: cmdPromote rejects reminder nodes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cmdMove, cmdPromote } from './utility.js';
import * as indexModule from '../../core/index.js';
import { MemoryType, Scope } from '../../types/enums.js';
import type { MemoryIndex } from '../../types/memory.js';
import { unsafeAsMemoryId } from '../../types/branded.js';

describe('cmdMove - Read-Only Protection', () => {
  beforeEach(async () => {
    const moveModule = await import('../../maintenance/move.js');
    vi.spyOn(moveModule, 'moveMemory').mockResolvedValue({
      status: 'success',
      id: 'test',
      changes: {
        fileMoved: true,
        sourceGraphUpdated: true,
        targetGraphUpdated: true,
        sourceIndexUpdated: true,
        targetIndexUpdated: true,
        embeddingsTransferred: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects move attempts on rule nodes with clear error', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [{
        id: unsafeAsMemoryId('rule-project-claude-root'),
        type: MemoryType.Rule,
        title: 'CLAUDE.md',
        tags: [],
        created: '2026-02-19T10:00:00Z',
        updated: '2026-02-19T10:00:00Z',
        scope: Scope.Project,
        relativePath: 'external/rule-project-claude-root',
        externalPath: '/home/user/project/CLAUDE.md',
        externalFileKind: 'claude-instructions',
      }],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const result = await cmdMove({ positional: ['rule-project-claude-root', 'global'], flags: {} });
    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
    expect(result.error).toContain('rule-project-claude-root');
  });

  it('rejects move attempts on reminder nodes with clear error', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [{
        id: unsafeAsMemoryId('reminder-project-typescript-expert-memory'),
        type: MemoryType.Reminder,
        title: 'MEMORY.md',
        tags: [],
        created: '2026-02-19T10:00:00Z',
        updated: '2026-02-19T10:00:00Z',
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        relativePath: 'external/reminder-project-typescript-expert-memory',
        externalPath: '/home/user/project/.claude/agent-memory/typescript-expert/MEMORY.md',
        externalFileKind: 'agent-memory-summary',
      }],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const result = await cmdMove({ positional: ['reminder-project-typescript-expert-memory', 'global'], flags: {} });
    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
  });

  it('allows move of regular memory nodes', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [{
        id: unsafeAsMemoryId('decision-tdd-approach'),
        type: MemoryType.Decision,
        title: 'TDD Approach',
        tags: ['testing'],
        created: '2026-02-19T10:00:00Z',
        updated: '2026-02-19T10:00:00Z',
        scope: Scope.Project,
        relativePath: 'permanent/decision-tdd-approach.md',
      }],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const result = await cmdMove({ positional: ['decision-tdd-approach', 'global'], flags: { scope: 'project' } });
    expect(result.status).toBe('success');
  });
});

describe('cmdPromote - Read-Only Protection', () => {
  beforeEach(async () => {
    const promoteModule = await import('../../maintenance/promote.js');
    vi.spyOn(promoteModule, 'promoteMemory').mockResolvedValue({
      status: 'success',
      id: 'test',
      toType: MemoryType.Learning,
      changes: {
        frontmatterUpdated: true,
        fileMoved: true,
        graphUpdated: true,
        indexUpdated: true,
        fileRenamed: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects promote attempts on rule nodes with clear error', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [{
        id: unsafeAsMemoryId('rule-project-claude-root'),
        type: MemoryType.Rule,
        title: 'CLAUDE.md',
        tags: [],
        created: '2026-02-19T10:00:00Z',
        updated: '2026-02-19T10:00:00Z',
        scope: Scope.Project,
        relativePath: 'external/rule-project-claude-root',
        externalPath: '/home/user/project/CLAUDE.md',
        externalFileKind: 'claude-instructions',
      }],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const result = await cmdPromote({ positional: ['rule-project-claude-root', 'learning'], flags: {} });
    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
  });

  it('rejects promote attempts on reminder nodes with clear error', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [{
        id: unsafeAsMemoryId('reminder-project-typescript-expert-memory'),
        type: MemoryType.Reminder,
        title: 'MEMORY.md',
        tags: [],
        created: '2026-02-19T10:00:00Z',
        updated: '2026-02-19T10:00:00Z',
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
        relativePath: 'external/reminder-project-typescript-expert-memory',
        externalPath: '/home/user/project/.claude/agent-memory/typescript-expert/MEMORY.md',
        externalFileKind: 'agent-memory-summary',
      }],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const result = await cmdPromote({ positional: ['reminder-project-typescript-expert-memory', 'learning'], flags: {} });
    expect(result.status).toBe('error');
  });

  it('allows promote of regular memory nodes', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [{
        id: unsafeAsMemoryId('learning-temp-idea'),
        type: MemoryType.Learning,
        title: 'Temporary Idea',
        tags: [],
        created: '2026-02-19T10:00:00Z',
        updated: '2026-02-19T10:00:00Z',
        scope: Scope.Project,
        relativePath: 'temporary/learning-temp-idea.md',
      }],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const result = await cmdPromote({ positional: ['learning-temp-idea', 'decision'], flags: { scope: 'project' } });
    expect(result.status).toBe('success');
  });
});
