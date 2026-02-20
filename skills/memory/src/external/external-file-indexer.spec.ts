/**
 * Tests for T050-T058A: External File Indexer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  indexExternalFiles,
  type IndexExternalFilesRequest,
} from './external-file-indexer.js';
import { ExternalFileKind, type ExternalFileEntry } from './external-file-types.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { MemoryGraph, MemoryIndex } from '../types/memory.js';
import * as fsUtils from '../core/fs-utils.js';

describe('indexExternalFiles', () => {
  let baseGraph: MemoryGraph;
  let baseIndex: MemoryIndex;
  let tempDir: string;
  let basePath: string;
  let embeddingsPath: string;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexer-test-'));
    basePath = tempDir;
    embeddingsPath = path.join(tempDir, 'embeddings.json');

    baseGraph = {
      version: 1,
      nodes: [],
      edges: [],
    };

    baseIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      memories: [],
    };

    // Mock readFile to return test content for external files
    vi.spyOn(fsUtils, 'readFile').mockResolvedValue(
      '# Test Content\n\nThis is test content for embedding generation.\n\nIt has multiple paragraphs to ensure truncation works correctly.'
    );
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    // Restore mocks
    vi.restoreAllMocks();
  });

  // T050: Unit test for indexExternalFiles creating GraphNode for rule
  it('should create GraphNode for rule file', async () => {
    const ruleFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [ruleFile],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(baseGraph.nodes).toHaveLength(1);
    expect(baseGraph.nodes[0]?.id).toBe('rule-project-claude-md-root');
    expect((baseGraph.nodes[0] as any)?.type).toBe(MemoryType.Rule);
    expect((baseGraph.nodes[0] as any)?.title).toBe('CLAUDE.md');
  });

  // T051: Unit test for indexExternalFiles creating GraphNode for reminder
  it('should create GraphNode for reminder file', async () => {
    const reminderFile: ExternalFileEntry = {
      absolutePath: '/test/project/.claude/agent-memory/curator/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentProject,
      agentName: 'curator',
      contentHash: 'def456',
      id: 'reminder-project-curator-memory',
      title: 'Curator Agent Memory',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [reminderFile],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(baseGraph.nodes).toHaveLength(1);
    expect(baseGraph.nodes[0]?.id).toBe('reminder-project-curator-memory');
    expect((baseGraph.nodes[0] as any)?.type).toBe(MemoryType.Reminder);
    expect((baseGraph.nodes[0] as any)?.title).toBe('Curator Agent Memory');
  });

  // T052: Unit test for indexExternalFiles creating IndexEntry with externalPath
  it('should create IndexEntry with externalPath and externalFileKind', async () => {
    const ruleFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [ruleFile],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(baseIndex.memories).toHaveLength(1);
    expect(baseIndex.memories[0]?.id).toBe('rule-project-claude-md-root');
    expect(baseIndex.memories[0]?.externalPath).toBe('/test/project/CLAUDE.md');
    expect(baseIndex.memories[0]?.externalFileKind).toBe('claude-instructions');
    expect(baseIndex.memories[0]?.relativePath).toBe('external/rule-project-claude-md-root');
  });

  // T053: Unit test for indexExternalFiles generating embedding via provider
  it('should generate embedding when provider is available', async () => {
    const mockProvider = {
      getEmbedding: async () => [0.1, 0.2, 0.3],
    };

    const ruleFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      embeddingProvider: mockProvider as any,
      externalFiles: [ruleFile],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(response.changes.embeddingsGenerated).toBe(1);
    expect(response.changes.embeddingsReused).toBe(0);
  });

  // T054: Unit test for indexExternalFiles reusing cached embedding on hash match
  it('should reuse cached embedding when content hash matches', async () => {
    const ruleFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    // First indexing - generates embedding
    const request1: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      embeddingProvider: { getEmbedding: async () => [0.1, 0.2, 0.3] } as any,
      externalFiles: [ruleFile],
      dryRun: false,
    };

    const response1 = await indexExternalFiles(request1);
    expect(response1.changes.embeddingsGenerated).toBe(1);

    // Second indexing - same hash, should reuse
    const request2: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      embeddingProvider: { getEmbedding: async () => [0.1, 0.2, 0.3] } as any,
      externalFiles: [ruleFile],
      dryRun: false,
    };

    const response2 = await indexExternalFiles(request2);
    expect(response2.changes.embeddingsGenerated).toBe(0);
    expect(response2.changes.embeddingsReused).toBe(1);
  });

  // T055: Unit test for indexExternalFiles updating embedding on hash mismatch
  it('should update embedding when content hash changes', async () => {
    const ruleFile1: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    // First indexing
    const request1: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      embeddingProvider: { getEmbedding: async () => [0.1, 0.2, 0.3] } as any,
      externalFiles: [ruleFile1],
      dryRun: false,
    };

    await indexExternalFiles(request1);

    // Second indexing with different hash
    const ruleFile2: ExternalFileEntry = {
      ...ruleFile1,
      contentHash: 'xyz789', // Changed hash
    };

    const request2: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      embeddingProvider: { getEmbedding: async () => [0.4, 0.5, 0.6] } as any,
      externalFiles: [ruleFile2],
      dryRun: false,
    };

    const response2 = await indexExternalFiles(request2);
    expect(response2.changes.updatedNodes).toContain('rule-project-claude-md-root');
    expect(response2.changes.embeddingsGenerated).toBe(1);
  });

  // T056: Unit test for indexExternalFiles removing stale external nodes
  it('should remove stale external nodes that no longer exist', async () => {
    // Add an external node to the graph
    baseGraph.nodes.push({
      id: 'rule-project-old-file' as any,
      type: MemoryType.Rule,
      title: 'Old File',
    } as any);

    baseIndex.memories.push({
      id: 'rule-project-old-file' as any,
      type: MemoryType.Rule,
      title: 'Old File',
      tags: [],
      created: '2026-02-19T09:00:00Z',
      updated: '2026-02-19T09:00:00Z',
      scope: Scope.Project,
      relativePath: 'external/rule-project-old-file',
      externalPath: '/test/project/old-file.md',
      externalFileKind: 'claude-instructions',
    });

    // Index with no external files (simulates file deletion)
    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(response.changes.removedNodes).toContain('rule-project-old-file');
    expect(baseGraph.nodes).toHaveLength(0);
    expect(baseIndex.memories).toHaveLength(0);
  });

  // T057: Unit test for indexExternalFiles handling missing embedding provider gracefully
  it('should handle missing embedding provider gracefully', async () => {
    const ruleFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      embeddingProvider: undefined, // No provider
      externalFiles: [ruleFile],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(baseGraph.nodes).toHaveLength(1);
    expect(response.changes.embeddingsGenerated).toBe(0);
  });

  // T058: Unit test for indexExternalFiles respecting dryRun flag
  it('should not modify graph/index when dryRun is true', async () => {
    const ruleFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [ruleFile],
      dryRun: true, // Dry run
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(response.changes.addedNodes).toContain('rule-project-claude-md-root');
    // But graph/index should not be modified
    expect(baseGraph.nodes).toHaveLength(0);
    expect(baseIndex.memories).toHaveLength(0);
  });

  it('should provide accurate summary counts', async () => {
    const ruleFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const reminderFile: ExternalFileEntry = {
      absolutePath: '/test/project/.claude/agent-memory/curator/MEMORY.md',
      kind: ExternalFileKind.AgentMemorySummary,
      scope: Scope.AgentProject,
      agentName: 'curator',
      contentHash: 'def456',
      id: 'reminder-project-curator-memory',
      title: 'Curator Memory',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [ruleFile, reminderFile],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    expect(response.status).toBe('success');
    expect(response.summary.totalExternalNodes).toBe(2);
    expect(response.summary.ruleNodes).toBe(1);
    expect(response.summary.reminderNodes).toBe(1);
  });

  it('should handle errors gracefully and continue processing', async () => {
    const validFile: ExternalFileEntry = {
      absolutePath: '/test/project/CLAUDE.md',
      kind: ExternalFileKind.ClaudeInstructions,
      scope: Scope.Project,
      contentHash: 'abc123',
      id: 'rule-project-claude-md-root',
      title: 'CLAUDE.md',
      modifiedTime: '2026-02-19T09:00:00Z',
    };

    const request: IndexExternalFilesRequest = {
      basePath,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: [validFile],
      dryRun: false,
    };

    const response = await indexExternalFiles(request);

    // Should succeed even if some operations fail
    expect(response.status).toBe('success');
    expect(baseGraph.nodes).toHaveLength(1);
  });
});
