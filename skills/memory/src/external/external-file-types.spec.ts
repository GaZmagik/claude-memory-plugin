/**
 * Tests for T033-T034: External File Type Definitions
 */

import { describe, it, expect } from 'vitest';
import { ExternalFileKind, type ExternalFileEntry } from './external-file-types.js';
import { Scope } from '../types/enums.js';

describe('ExternalFileKind enum', () => {
  // T033: Unit test for ExternalFileKind enum values
  it('should have ClaudeInstructions kind', () => {
    expect(ExternalFileKind.ClaudeInstructions).toBe('claude-instructions');
  });

  it('should have ClaudeLocalInstructions kind', () => {
    expect(ExternalFileKind.ClaudeLocalInstructions).toBe('claude-local-instructions');
  });

  it('should have RulesFile kind', () => {
    expect(ExternalFileKind.RulesFile).toBe('rules-file');
  });

  it('should have AgentMemorySummary kind', () => {
    expect(ExternalFileKind.AgentMemorySummary).toBe('agent-memory-summary');
  });

  it('should have AgentMemorySubFile kind', () => {
    expect(ExternalFileKind.AgentMemorySubFile).toBe('agent-memory-sub-file');
  });

  it('should have exactly 5 kinds', () => {
    const kinds = Object.values(ExternalFileKind);
    expect(kinds).toHaveLength(5);
  });
});

describe('ExternalFileEntry interface', () => {
  // T034: Unit test for ExternalFileEntry interface validation

  it('should accept valid rule file entry', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/home/user/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: '1234567890abcdef',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    expect(entry.absolutePath).toBe('/home/user/project/CLAUDE.md');
    expect(entry.kind).toBe(ExternalFileKind.ClaudeInstructions);
    expect(entry.scope).toBe(Scope.Project);
    expect(entry.agentName).toBeUndefined();
    expect(entry.contentHash).toBe('1234567890abcdef');
    expect(entry.id).toBe('rule-project-claude-md-root');
    expect(entry.title).toBe('CLAUDE.md');
    expect(entry.modifiedTime).toBe('2026-02-19T09:00:00Z');
  });

  it('should accept valid reminder file entry with agentName', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/home/user/project/.claude/agent-memory/curator/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentProject,
      agentName: 'curator',
      contentHash: 'fedcba0987654321',
      id: 'reminder-project-curator-memory',
      title: 'Curator Agent Memory',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    expect(entry.agentName).toBe('curator');
    expect(entry.kind).toBe(ExternalFileKind.AgentMemorySummary);
    expect(entry.scope).toBe(Scope.AgentProject);
  });

  it('should accept reminder sub-file entry', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/home/user/project/.claude/agent-memory/curator/patterns.md',
      kind: ExternalFileKind.AgentMemorySubFile,
      scope: Scope.AgentProject,
      agentName: 'curator',
      contentHash: 'abcd1234efgh5678',
      id: 'reminder-project-curator-patterns',
      title: 'patterns.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    expect(entry.kind).toBe(ExternalFileKind.AgentMemorySubFile);
    expect(entry.agentName).toBe('curator');
  });

  it('should accept local rule file entry', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/home/user/project/CLAUDE.local.md',
      kind: ExternalFileKind.ClaudeLocalInstructions,
      scope: Scope.Local,
      contentHash: '9876543210fedcba',
      id: 'rule-local-claude-md-root',
      title: 'CLAUDE.local.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    expect(entry.scope).toBe(Scope.Local);
    expect(entry.kind).toBe(ExternalFileKind.ClaudeLocalInstructions);
  });

  it('should accept global rule file entry', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/home/user/.claude/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Global,
      contentHash: 'abc123def456ghi7',
      id: 'rule-global-claude-md',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    expect(entry.scope).toBe(Scope.Global);
  });

  it('should accept rules directory file entry', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/home/user/project/.claude/rules/coding-standards.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Project,
      contentHash: '1a2b3c4d5e6f7g8h',
      id: 'rule-project-coding-standards',
      title: 'coding-standards.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    expect(entry.kind).toBe(ExternalFileKind.RulesFile);
  });

  it('should accept global agent reminder entry', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/home/user/.claude/agent-memory/rust-expert/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentGlobal,
      agentName: 'rust-expert',
      contentHash: 'h8g7f6e5d4c3b2a1',
      id: 'reminder-global-rust-expert-memory',
      title: 'Rust Expert Memory',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    expect(entry.scope).toBe(Scope.AgentGlobal);
    expect(entry.agentName).toBe('rust-expert');
  });

  it('should have all required fields', () => {
    const entry: ExternalFileEntry = {
      absolutePath: '/test/path',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: '0123456789abcdef',
      id: 'test-id',
      title: 'Test',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    // TypeScript compilation ensures all required fields are present
    expect(entry).toHaveProperty('absolutePath');
    expect(entry).toHaveProperty('kind');
    expect(entry).toHaveProperty('scope');
    expect(entry).toHaveProperty('contentHash');
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('title');
    expect(entry).toHaveProperty('modifiedTime');
  });
});
