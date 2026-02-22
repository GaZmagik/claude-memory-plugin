/**
 * Tests for T096: cmdRead handling externalPath field
 *
 * Verifies that cmdRead correctly reads external nodes (rule/reminder types)
 * from their externalPath instead of basePath + relativePath.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cmdRead } from './crud.js';
import type { ParsedArgs } from '../parser.js';
import * as readModule from '../../core/read.js';
import { MemoryType } from '../../types/enums.js';
import { unsafeAsMemoryId } from '../../types/branded.js';

describe('cmdRead - External Path Handling', () => {
  beforeEach(() => {
    // Mock readMemory to avoid filesystem operations
    vi.spyOn(readModule, 'readMemory').mockResolvedValue({
      status: 'success',
      memory: {
        frontmatter: {
          id: unsafeAsMemoryId('rule-project-claude-md-root'),
          title: 'CLAUDE.md',
          type: MemoryType.Rule,
          tags: [],
          created: '2026-02-19T10:00:00Z',
          updated: '2026-02-19T10:00:00Z',
        },
        content: '# Project Rules\n\nFollow TDD principles.',
        filePath: '/home/user/project/CLAUDE.md',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T096: Unit test for cmdRead handling externalPath field
  it('should successfully read external node using externalPath', async () => {
    const args: ParsedArgs = {
      positional: ['rule-project-claude-md-root'],
      flags: { scope: 'project' },
    };

    const result = await cmdRead(args);

    expect(result.status).toBe('success');
    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rule-project-claude-md-root',
        basePath: expect.any(String),
      })
    );
  });

  it('should read rule node content correctly', async () => {
    const args: ParsedArgs = {
      positional: ['rule-project-claude-md-root'],
      flags: {},
    };

    const result = await cmdRead(args);

    expect(result.status).toBe('success');
    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'rule-project-claude-md-root',
      })
    );
  });

  it('should read reminder node content correctly', async () => {
    vi.spyOn(readModule, 'readMemory').mockResolvedValueOnce({
      status: 'success',
      memory: {
        frontmatter: {
          id: unsafeAsMemoryId('reminder-agent-project-typescript-expert-memory-md'),
          title: 'MEMORY.md',
          type: MemoryType.Reminder,
          tags: [],
          created: '2026-02-19T10:00:00Z',
          updated: '2026-02-19T10:00:00Z',
        },
        content: '# TypeScript Expert Memory\n\nPrefer strict mode.',
        filePath: '/home/user/project/.claude/agent-memory/typescript-expert/MEMORY.md',
      },
    });

    const args: ParsedArgs = {
      positional: ['reminder-agent-project-typescript-expert-memory-md'],
      flags: { scope: 'agent-project', agent: 'typescript-expert' },
    };

    const result = await cmdRead(args);

    expect(result.status).toBe('success');
    expect(readModule.readMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'reminder-agent-project-typescript-expert-memory-md',
        agent: 'typescript-expert',
      })
    );
  });
});
