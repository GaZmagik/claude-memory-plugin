/**
 * Unit Tests for External File Indexer Helper Functions
 *
 * Tests for isExternalNode, createGraphNode, and createIndexEntry helpers
 */

import { describe, it, expect } from 'vitest';
import { MemoryType, Scope } from '../types/enums.js';
import type { GraphNode } from '../graph/structure.js';
import { ExternalFileKind, type ExternalFileEntry } from './external-file-types.js';
import {
  isExternalNode,
  createGraphNode,
  createIndexEntry,
} from './external-file-indexer.js';
import { unsafeAsMemoryId } from '../types/branded.js';

describe('isExternalNode', () => {
  it('should return true for Rule nodes', () => {
    const node: GraphNode = {
      id: unsafeAsMemoryId('rule-project-claude-md-root'),
      type: MemoryType.Rule,
      title: 'Test Rule',
      scope: Scope.Project,
    };
    expect(isExternalNode(node)).toBe(true);
  });

  it('should return true for Reminder nodes', () => {
    const node: GraphNode = {
      id: unsafeAsMemoryId('reminder-project-agent-memory'),
      type: MemoryType.Reminder,
      title: 'Test Reminder',
      scope: Scope.Project,
    };
    expect(isExternalNode(node)).toBe(true);
  });

  it('should return false for Decision nodes', () => {
    const node: GraphNode = {
      id: unsafeAsMemoryId('decision-test'),
      type: MemoryType.Decision,
      title: 'Test Decision',
      scope: Scope.Project,
    };
    expect(isExternalNode(node)).toBe(false);
  });

  it('should return false for Learning nodes', () => {
    const node: GraphNode = {
      id: unsafeAsMemoryId('learning-test'),
      type: MemoryType.Learning,
      title: 'Test Learning',
      scope: Scope.Project,
    };
    expect(isExternalNode(node)).toBe(false);
  });

  it('should return false for Artifact nodes', () => {
    const node: GraphNode = {
      id: unsafeAsMemoryId('artifact-test'),
      type: MemoryType.Artifact,
      title: 'Test Artifact',
      scope: Scope.Project,
    };
    expect(isExternalNode(node)).toBe(false);
  });

  it('should return false for Gotcha nodes', () => {
    const node: GraphNode = {
      id: unsafeAsMemoryId('gotcha-test'),
      type: MemoryType.Gotcha,
      title: 'Test Gotcha',
      scope: Scope.Project,
    };
    expect(isExternalNode(node)).toBe(false);
  });
});

describe('createGraphNode', () => {
  it('should create Rule node for rule- prefixed ID', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const node = createGraphNode(entry);

    expect(node.id).toBe(unsafeAsMemoryId('rule-project-claude-md-root'));
    expect(node.type).toBe(MemoryType.Rule);
    expect(node.title).toBe('CLAUDE.md');
    expect(node.scope).toBe(Scope.Project);
    expect(node.agent).toBeUndefined();
  });

  it('should create Reminder node for reminder- prefixed ID', () => {
    const entry: ExternalFileEntry = {
      id: 'reminder-project-curator-memory',
      title: 'Curator Agent Memory',
      absolutePath: '/test/.claude/agent-memory/curator/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentProject,
      agentName: 'curator',
      contentHash: 'def456',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const node = createGraphNode(entry);

    expect(node.id).toBe(unsafeAsMemoryId('reminder-project-curator-memory'));
    expect(node.type).toBe(MemoryType.Reminder);
    expect(node.title).toBe('Curator Agent Memory');
    expect(node.scope).toBe(Scope.AgentProject);
    expect(node.agent).toBe('curator');
  });

  it('should set title from entry', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-custom-rules',
      title: 'custom-rules.md',
      absolutePath: '/test/.claude/rules/custom-rules.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Project,
      contentHash: 'xyz789',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const node = createGraphNode(entry);

    expect(node.title).toBe('custom-rules.md');
  });

  it('should set scope from entry', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-global-security',
      title: 'security.md',
      absolutePath: '/home/user/.claude/rules/security.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Global,
      contentHash: '123abc',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const node = createGraphNode(entry);

    expect(node.scope).toBe(Scope.Global);
  });

  it('should set agent from entry when present', () => {
    const entry: ExternalFileEntry = {
      id: 'reminder-project-typescript-expert-memory',
      title: 'TypeScript Expert Memory',
      absolutePath: '/test/.claude/agent-memory/typescript-expert/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentProject,
      agentName: 'typescript-expert',
      contentHash: '456def',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const node = createGraphNode(entry);

    expect(node.agent).toBe('typescript-expert');
  });

  it('should handle missing agent name (undefined)', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-testing',
      title: 'testing.md',
      absolutePath: '/test/.claude/rules/testing.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Project,
      contentHash: '789ghi',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const node = createGraphNode(entry);

    expect(node.agent).toBeUndefined();
  });

  it('should use unsafeAsMemoryId for ID branding', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-test-id',
      title: 'Test',
      absolutePath: '/test/file.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'aaa111',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const node = createGraphNode(entry);

    // ID should be branded (this is a type-level assertion, runtime behaviour is identity function)
    expect(node.id).toBe(unsafeAsMemoryId('rule-test-id'));
  });
});

describe('createIndexEntry', () => {
  it('should create Rule index entry for rule- prefixed ID', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.id).toBe(unsafeAsMemoryId('rule-project-claude-md-root'));
    expect(indexEntry.type).toBe(MemoryType.Rule);
    expect(indexEntry.title).toBe('CLAUDE.md');
  });

  it('should create Reminder index entry for reminder- prefixed ID', () => {
    const entry: ExternalFileEntry = {
      id: 'reminder-project-curator-memory',
      title: 'Curator Agent Memory',
      absolutePath: '/test/.claude/agent-memory/curator/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentProject,
      agentName: 'curator',
      contentHash: 'def456',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.id).toBe(unsafeAsMemoryId('reminder-project-curator-memory'));
    expect(indexEntry.type).toBe(MemoryType.Reminder);
  });

  it('should generate sentinel path as external/{id}', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-security',
      title: 'security.md',
      absolutePath: '/test/.claude/rules/security.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Project,
      contentHash: 'xyz789',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.relativePath).toBe('external/rule-project-security');
  });

  it('should set externalPath from entry absolutePath', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-test',
      title: 'test.md',
      absolutePath: '/absolute/path/to/test.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Project,
      contentHash: '123abc',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.externalPath).toBe('/absolute/path/to/test.md');
  });

  it('should set externalFileKind from entry', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-global-custom',
      title: 'custom.md',
      absolutePath: '/home/user/.claude/rules/custom.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Global,
      contentHash: '456def',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.externalFileKind).toBe(ExternalFileKind.RulesFile);
  });

  it('should use modifiedTime for both created and updated', () => {
    const modifiedTime = '2026-02-21T15:30:00Z';
    const entry: ExternalFileEntry = {
      id: 'rule-project-test',
      title: 'test.md',
      absolutePath: '/test/test.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: '789ghi',
      modifiedTime,
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.created).toBe(modifiedTime);
    expect(indexEntry.updated).toBe(modifiedTime);
  });

  it('should include empty tags array', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-test',
      title: 'test.md',
      absolutePath: '/test/test.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'aaa111',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.tags).toEqual([]);
    expect(Array.isArray(indexEntry.tags)).toBe(true);
    expect(indexEntry.tags).toHaveLength(0);
  });

  it('should set scope correctly', () => {
    const entry: ExternalFileEntry = {
      id: 'reminder-global-agent-memory',
      title: 'Agent Memory',
      absolutePath: '/home/user/.claude/agent-memory/test/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentGlobal,
      agentName: 'test',
      contentHash: 'bbb222',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.scope).toBe(Scope.AgentGlobal);
  });

  it('should set agent correctly when present', () => {
    const entry: ExternalFileEntry = {
      id: 'reminder-project-rust-expert-memory',
      title: 'Rust Expert Memory',
      absolutePath: '/test/.claude/agent-memory/rust-expert/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentProject,
      agentName: 'rust-expert',
      contentHash: 'ccc333',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.agent).toBe('rust-expert');
  });

  it('should handle missing agent (undefined)', () => {
    const entry: ExternalFileEntry = {
      id: 'rule-project-no-agent',
      title: 'no-agent.md',
      absolutePath: '/test/no-agent.md',
      kind: ExternalFileKind.RulesFile,
      scope: Scope.Project,
      contentHash: 'ddd444',
      modifiedTime: '2026-02-21T10:00:00Z',
    };

    const indexEntry = createIndexEntry(entry);

    expect(indexEntry.agent).toBeUndefined();
  });
});
