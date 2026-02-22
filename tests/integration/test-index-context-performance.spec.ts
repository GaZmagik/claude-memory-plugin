/**
 * T148: Integration test for index-context performance vs full sync
 *
 * Verifies that index-context only processes changed files by checking
 * content hashes, making it more efficient than full sync for incremental updates.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { indexExternalFiles, ExternalFileKind, type ExternalFileEntry } from '../../skills/memory/src/external/index.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { Scope } from '../../skills/memory/src/types/enums.js';
import type { EmbeddingProvider } from '../../skills/memory/src/external/index.js';

/**
 * Helper to calculate content hash
 */
function calculateContentHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash.substring(0, 16);
}

/**
 * Helper to create ExternalFileEntry
 */
function createExternalEntry(
  id: string,
  absolutePath: string,
  kind: ExternalFileKind,
  title: string
): ExternalFileEntry {
  const stats = fs.statSync(absolutePath);
  return {
    id,
    absolutePath,
    kind,
    title,
    scope: Scope.Project,
    contentHash: calculateContentHash(absolutePath),
    modifiedTime: stats.mtime.toISOString(),
  };
}

describe('T148: Index-context performance optimization', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'index-context-perf-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should only process changed files on incremental index', async () => {
    // Create multiple external files
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Project Rules\n\nOriginal content.');

    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const securityPath = path.join(rulesDir, 'security.md');
    fs.writeFileSync(securityPath, '# Security\n\nValidate input.');

    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    const agentMemoryPath = path.join(agentDir, 'MEMORY.md');
    fs.writeFileSync(agentMemoryPath, '# Agent Memory\n\nPatterns.');

    // Initial sync to set up graph structure
    await syncMemories({ basePath: tempDir });

    // Load graph and index
    let graph = await loadGraph(tempDir);
    let index = await loadIndex({ basePath: tempDir });

    // Track embedding generation calls
    let generateCallCount = 0;
    const mockProvider: EmbeddingProvider = {
      getEmbedding: async (_text: string) => {
        generateCallCount++;
        return [0.1, 0.2, 0.3, 0.4];
      },
    };

    // Create external file entries for first run
    const firstRunFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
      createExternalEntry('rule-project-security', securityPath, ExternalFileKind.RulesFile, 'Security Rules'),
      createExternalEntry('reminder-project-test-agent-memory', agentMemoryPath, ExternalFileKind.AgentMemorySummary, 'test-agent Agent Memory'),
    ];

    // First indexing - all files should generate embeddings
    const embeddingsPath = path.join(tempDir, 'embeddings.json');
    const firstResult = await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: mockProvider,
      externalFiles: firstRunFiles,
    });

    expect(firstResult.status).toBe('success');
    expect(firstResult.changes.embeddingsGenerated).toBe(3); // All 3 files
    expect(firstResult.changes.embeddingsReused).toBe(0); // None reused (first run)
    expect(generateCallCount).toBe(3);

    // Modify only one file
    fs.writeFileSync(
      claudeMdPath,
      '# Project Rules\n\nModified content - now different!'
    );

    // Small delay to ensure mtime changes
    await new Promise(resolve => setTimeout(resolve, 10));

    // Reload graph and index for second run
    graph = await loadGraph(tempDir);
    index = await loadIndex({ basePath: tempDir });

    // Reset counter
    generateCallCount = 0;

    // Create external file entries for second run (with updated hash for CLAUDE.md)
    const secondRunFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
      createExternalEntry('rule-project-security', securityPath, ExternalFileKind.RulesFile, 'Security Rules'),
      createExternalEntry('reminder-project-test-agent-memory', agentMemoryPath, ExternalFileKind.AgentMemorySummary, 'test-agent Agent Memory'),
    ];

    // Second indexing - only changed file should generate embedding
    const secondResult = await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: mockProvider,
      externalFiles: secondRunFiles,
    });

    expect(secondResult.status).toBe('success');
    expect(secondResult.changes.embeddingsGenerated).toBe(1); // Only CLAUDE.md changed
    expect(secondResult.changes.embeddingsReused).toBe(2); // Security and agent unchanged
    expect(generateCallCount).toBe(1); // Only 1 embedding generated

    // Verify the updated node
    expect(secondResult.changes.updatedNodes).toContain('rule-project-claude-md-root');
  });

  it('should detect file deletion and remove nodes', async () => {
    // Create external files
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Rules');

    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const testingPath = path.join(rulesDir, 'testing.md');
    fs.writeFileSync(testingPath, '# Testing');

    await syncMemories({ basePath: tempDir });

    let graph = await loadGraph(tempDir);
    let index = await loadIndex({ basePath: tempDir });

    const mockProvider: EmbeddingProvider = {
      getEmbedding: async (_text: string) => [0.1, 0.2, 0.3],
    };

    // Initial indexing
    const embeddingsPath = path.join(tempDir, 'embeddings.json');
    const firstRunFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
      createExternalEntry('rule-project-testing', testingPath, ExternalFileKind.RulesFile, 'Testing Rules'),
    ];

    await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: mockProvider,
      externalFiles: firstRunFiles,
    });

    expect(graph.nodes.length).toBeGreaterThanOrEqual(2);

    // Delete one file
    fs.unlinkSync(testingPath);

    // Reload
    graph = await loadGraph(tempDir);
    index = await loadIndex({ basePath: tempDir });

    // Re-index with only the remaining file
    const secondRunFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
    ];

    const result = await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: mockProvider,
      externalFiles: secondRunFiles,
    });

    expect(result.status).toBe('success');
    expect(result.changes.removedNodes).toContain('rule-project-testing');
  });

  it('should handle new file addition efficiently', async () => {
    // Start with one file
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Rules');

    await syncMemories({ basePath: tempDir });

    let graph = await loadGraph(tempDir);
    let index = await loadIndex({ basePath: tempDir });

    let generateCallCount = 0;
    const mockProvider: EmbeddingProvider = {
      getEmbedding: async (_text: string) => {
        generateCallCount++;
        return [0.1, 0.2, 0.3];
      },
    };

    // Initial indexing
    const embeddingsPath = path.join(tempDir, 'embeddings.json');
    const firstRunFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
    ];

    await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: mockProvider,
      externalFiles: firstRunFiles,
    });

    expect(generateCallCount).toBe(1);

    // Add a new file
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const newRulePath = path.join(rulesDir, 'new-rule.md');
    fs.writeFileSync(newRulePath, '# New Rule');

    // Reload
    graph = await loadGraph(tempDir);
    index = await loadIndex({ basePath: tempDir });

    generateCallCount = 0;

    // Re-index with both files
    const secondRunFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
      createExternalEntry('rule-project-new-rule', newRulePath, ExternalFileKind.RulesFile, 'New Rule'),
    ];

    const result = await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: mockProvider,
      externalFiles: secondRunFiles,
    });

    expect(result.status).toBe('success');
    expect(result.changes.addedNodes).toContain('rule-project-new-rule');
    expect(result.changes.embeddingsGenerated).toBe(1); // Only new file
    expect(result.changes.embeddingsReused).toBe(1); // Existing file reused
    expect(generateCallCount).toBe(1); // Only 1 new embedding
  });

  it('should gracefully handle missing embedding provider', async () => {
    // Create external file
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Rules');

    // Initialize empty graph/index (don't call syncMemories to test from scratch)
    const graph = { nodes: [], edges: [] };
    const index = { memories: [] };

    // Index without provider (graceful fallback)
    const embeddingsPath = path.join(tempDir, 'embeddings.json');
    const externalFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
    ];

    const result = await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: undefined, // No provider
      externalFiles,
    });

    expect(result.status).toBe('success');
    expect(result.changes.addedNodes).toContain('rule-project-claude-md-root');
    expect(result.changes.embeddingsGenerated).toBe(0); // No embeddings without provider
    expect(result.summary.totalExternalNodes).toBe(1);
  });

  it('should use dry-run mode without modifying state', async () => {
    // Create external files
    const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, '# Rules');

    // Initialize empty graph/index
    const graph = { nodes: [], edges: [] };
    const index = { memories: [] };

    const originalNodeCount = graph.nodes.length;
    const originalIndexCount = index.memories.length;

    const mockProvider: EmbeddingProvider = {
      getEmbedding: async (_text: string) => [0.1, 0.2, 0.3],
    };

    // Dry run
    const embeddingsPath = path.join(tempDir, 'embeddings.json');
    const externalFiles: ExternalFileEntry[] = [
      createExternalEntry('rule-project-claude-md-root', claudeMdPath, ExternalFileKind.ClaudeInstructions, 'CLAUDE.md'),
    ];

    const result = await indexExternalFiles({
      basePath: tempDir,
      graph: graph as any,
      index: index as any,
      embeddingsPath,
      embeddingProvider: mockProvider,
      externalFiles,
      dryRun: true,
    });

    expect(result.status).toBe('success');
    expect(result.changes.addedNodes.length).toBeGreaterThan(0); // Reports what would be added
    expect(result.changes.embeddingsGenerated).toBeGreaterThan(0); // Reports what would be generated

    // Verify state unchanged
    expect(graph.nodes.length).toBe(originalNodeCount);
    expect(index.memories.length).toBe(originalIndexCount);

    // Verify embeddings file not created
    expect(fs.existsSync(embeddingsPath)).toBe(false);
  });
});
