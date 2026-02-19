/**
 * Tests for read-only protection guards in rename operations
 *
 * T090: cmdRename rejects rule nodes
 * T091: cmdRename rejects reminder nodes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cmdRename } from './utility.js';
import type { ParsedArgs } from '../parser.js';
import * as indexModule from '../../core/index.js';
import { MemoryType, Scope } from '../../types/enums.js';
import type { MemoryIndex } from '../../types/memory.js';
import { unsafeAsMemoryId } from '../../types/branded.js';

describe('cmdRename - Read-Only Protection', () => {
  beforeEach(async () => {
    // Mock renameMemory to avoid actual filesystem operations
    const renameModule = await import('../../maintenance/rename.js');
    vi.spyOn(renameModule, 'renameMemory').mockResolvedValue({
      status: 'success',
      oldId: 'old',
      newId: 'new',
      changes: {
        fileRenamed: true,
        graphNodeUpdated: true,
        edgesUpdated: 0,
        indexUpdated: true,
        embeddingsUpdated: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T090: Test that cmdRename rejects rule nodes
  it('rejects rename attempts on rule nodes with clear error', async () => {
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
      positional: ['rule-project-claude-md-root', 'new-rule-name'],
      flags: {},
    };

    const result = await cmdRename(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
    expect(result.error).toContain('rule-project-claude-md-root');
    expect(result.error).toContain('memory sync');
  });

  // T091: Test that cmdRename rejects reminder nodes
  it('rejects rename attempts on reminder nodes with clear error', async () => {
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
      positional: ['reminder-agent-project-typescript-expert-memory-md', 'new-reminder-name'],
      flags: {},
    };

    const result = await cmdRename(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
    expect(result.error).toContain('reminder-agent-project-typescript-expert-memory-md');
    expect(result.error).toContain('memory sync');
  });

  it('allows rename of regular memory nodes', async () => {
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
      positional: ['decision-tdd-approach', 'decision-new-name'],
      flags: {},
    };

    const result = await cmdRename(args);

    expect(result.status).toBe('success');
  });
});
