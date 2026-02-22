/**
 * Tests for read-only protection guards in delete operations
 *
 * T088: cmdDelete rejects rule nodes
 * T089: cmdDelete rejects reminder nodes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cmdDelete } from './crud.js';
import type { ParsedArgs } from '../parser.js';
import * as indexModule from '../../core/index.js';
import { MemoryType, Scope } from '../../types/enums.js';
import type { MemoryIndex } from '../../types/memory.js';
import { unsafeAsMemoryId } from '../../types/branded.js';

describe('cmdDelete - Read-Only Protection', () => {
  beforeEach(async () => {
    // Mock deleteMemory to avoid actual filesystem operations
    const deleteModule = await import('../../core/delete.js');
    vi.spyOn(deleteModule, 'deleteMemory').mockResolvedValue({ status: 'success' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T088: Test that cmdDelete rejects rule nodes
  it('rejects delete attempts on rule nodes with clear error', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: unsafeAsMemoryId('rule-project-claude-md-root'),
          type: MemoryType.Rule,
          title: 'CLAUDE.md',
          tags: [],
          created: '2026-02-19T10:00:00Z',
          updated: '2026-02-19T10:00:00Z',
          scope: Scope.Project,
          relativePath: 'external/rule-project-claude-md-root',
          externalPath: '/home/user/project/CLAUDE.md',
          externalFileKind: 'claude-instructions',
        },
      ],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const args: ParsedArgs = {
      positional: ['rule-project-claude-md-root'],
      flags: {},
    };

    const result = await cmdDelete(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
    expect(result.error).toContain('rule-project-claude-md-root');
    expect(result.error).toContain('memory sync');
  });

  // T089: Test that cmdDelete rejects reminder nodes
  it('rejects delete attempts on reminder nodes with clear error', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: unsafeAsMemoryId('reminder-agent-project-typescript-expert-memory-md'),
          type: MemoryType.Reminder,
          title: 'MEMORY.md',
          tags: [],
          created: '2026-02-19T10:00:00Z',
          updated: '2026-02-19T10:00:00Z',
          scope: Scope.AgentProject,
          agent: 'typescript-expert',
          relativePath: 'external/reminder-agent-project-typescript-expert-memory-md',
          externalPath: '/home/user/project/.claude/agent-memory/typescript-expert/MEMORY.md',
          externalFileKind: 'agent-memory-summary',
        },
      ],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const args: ParsedArgs = {
      positional: ['reminder-agent-project-typescript-expert-memory-md'],
      flags: {},
    };

    const result = await cmdDelete(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
    expect(result.error).toContain('reminder-agent-project-typescript-expert-memory-md');
    expect(result.error).toContain('memory sync');
  });

  it('allows delete of regular memory nodes', async () => {
    const mockIndex: MemoryIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [
        {
          id: unsafeAsMemoryId('decision-tdd-approach'),
          type: MemoryType.Decision,
          title: 'TDD Approach',
          tags: ['testing'],
          created: '2026-02-19T10:00:00Z',
          updated: '2026-02-19T10:00:00Z',
          scope: Scope.Project,
          relativePath: 'permanent/decision-tdd-approach.md',
        },
      ],
    };

    vi.spyOn(indexModule, 'loadIndex').mockResolvedValue(mockIndex);

    const args: ParsedArgs = {
      positional: ['decision-tdd-approach'],
      flags: {},
    };

    const result = await cmdDelete(args);

    expect(result.status).toBe('success');
  });
});
