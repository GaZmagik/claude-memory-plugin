/**
 * Tests for read-only protection guards in write operations
 *
 * T086: cmdWrite rejects rule nodes
 * T087: cmdWrite rejects reminder nodes
 *
 * External nodes (rule and reminder types) are read-only and cannot be
 * modified via write, delete, rename, move, or promote commands.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cmdWrite } from './crud.js';
import type { ParsedArgs } from '../parser.js';
import * as parserModule from '../parser.js';
import * as indexModule from '../../core/index.js';
import { MemoryType, Scope } from '../../types/enums.js';
import type { MemoryIndex } from '../../types/memory.js';
import { unsafeAsMemoryId } from '../../types/branded.js';

describe('cmdWrite - Read-Only Protection', () => {
  beforeEach(async () => {
    // Mock readStdinJson to return valid memory data (will be overridden per test)
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'Updated Title',
      content: 'Updated content',
      type: 'decision',
    });

    // Mock writeMemory to avoid actual filesystem operations
    const writeModule = await import('../../core/write.js');
    vi.spyOn(writeModule, 'writeMemory').mockResolvedValue({ status: 'success' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T086: Test that cmdWrite rejects rule nodes
  it('rejects write attempts to rule nodes with clear error', async () => {
    // Mock loadIndex to return an index with a rule node
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

    // Mock readStdinJson to include the rule node ID
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      id: 'rule-project-claude-md-root',
      title: 'Updated Title',
      content: 'Updated content',
      type: 'rule',
    });

    const args: ParsedArgs = {
      positional: ['write'],
      flags: {},
    };

    const result = await cmdWrite(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
    expect(result.error).toContain('rule-project-claude-md-root');
    expect(result.error).toContain('memory sync');
  });

  // T087: Test that cmdWrite rejects reminder nodes
  it('rejects write attempts to reminder nodes with clear error', async () => {
    // Mock loadIndex to return an index with a reminder node
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

    // Mock readStdinJson to include the reminder node ID
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      id: 'reminder-agent-project-typescript-expert-memory-md',
      title: 'Updated Title',
      content: 'Updated content',
      type: 'reminder',
    });

    const args: ParsedArgs = {
      positional: ['write'],
      flags: {},
    };

    const result = await cmdWrite(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
    expect(result.error).toContain('reminder-agent-project-typescript-expert-memory-md');
    expect(result.error).toContain('memory sync');
  });

  it('allows write to regular memory nodes', async () => {
    // Mock loadIndex to return an index with a regular decision node
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

    // Mock readStdinJson to return regular memory data (without ID for new memory)
    vi.spyOn(parserModule, 'readStdinJson').mockResolvedValue({
      title: 'New Decision',
      content: 'Some content',
      type: 'decision',
    });

    const args: ParsedArgs = {
      positional: ['write'],
      flags: {},
    };

    const result = await cmdWrite(args);

    expect(result.status).toBe('success');
    // writeMemory is mocked in beforeEach
  });
});
