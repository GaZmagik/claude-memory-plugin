/**
 * Integration Tests for T059-T060: External File Discovery → Indexing Pipeline
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { discoverRuleFiles, discoverReminderFiles } from './external-file-discovery.js';
import { indexExternalFiles } from './external-file-indexer.js';
import type { MemoryGraph, MemoryIndex } from '../types/memory.js';
import { MemoryType, EdgeType, Scope } from '../types/enums.js';
import { writeMemory } from '../core/write.js';
import { linkMemories } from '../graph/link.js';
import { saveGraph, loadGraph } from '../graph/structure.js';
import { saveIndex } from '../core/index.js';

describe('External File Integration Tests', () => {
  let tempDir: string;
  let baseGraph: MemoryGraph;
  let baseIndex: MemoryIndex;
  let embeddingsPath: string;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-integration-test-'));
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
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // T059: Integration test - Full rule discovery and indexing pipeline
  it('should discover and index rule files end-to-end', async () => {
    // Setup: Create rule files
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Project rules\nNo wrapper abstractions');

    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security rules');
    fs.writeFileSync(path.join(rulesDir, 'tdd.md'), '# TDD rules');

    // Phase 1: Discovery
    const discoveredRules = discoverRuleFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
    });

    expect(discoveredRules).toHaveLength(3); // CLAUDE.md + 2 rules files
    expect(discoveredRules.some(r => r.absolutePath === claudePath)).toBe(true);

    // Phase 2: Indexing
    const response = await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discoveredRules,
      dryRun: false,
    });

    // Verify indexing results
    expect(response.status).toBe('success');
    expect(response.changes.addedNodes).toHaveLength(3);
    expect(response.summary.ruleNodes).toBe(3);
    expect(response.summary.reminderNodes).toBe(0);

    // Verify graph nodes
    expect(baseGraph.nodes).toHaveLength(3);
    const claudeNode = baseGraph.nodes.find(n => n.title === 'CLAUDE.md');
    expect(claudeNode).toBeDefined();
    expect((claudeNode as any)!.type).toBe(MemoryType.Rule);

    // Verify index entries
    expect(baseIndex.memories).toHaveLength(3);
    const claudeEntry = baseIndex.memories.find(e => e.title === 'CLAUDE.md');
    expect(claudeEntry).toBeDefined();
    expect(claudeEntry?.externalPath).toBe(claudePath);
    expect(claudeEntry?.externalFileKind).toBe('claude-instructions');
  });

  // T060: Integration test - Full reminder discovery and indexing pipeline
  it('should discover and index reminder files end-to-end', async () => {
    // Setup: Create reminder files
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });

    const memoryPath = path.join(agentMemoryDir, 'MEMORY.md');
    fs.writeFileSync(memoryPath, '# Curator agent memory\nGraph integrity patterns');

    const patternsPath = path.join(agentMemoryDir, 'patterns.md');
    fs.writeFileSync(patternsPath, '# Code patterns');

    // Phase 1: Discovery
    const discoveredReminders = discoverReminderFiles({
      projectRoot: tempDir,
      homeDir: tempDir,
    });

    expect(discoveredReminders).toHaveLength(2); // MEMORY.md + patterns.md
    expect(discoveredReminders.some(r => r.absolutePath === memoryPath)).toBe(true);
    expect(discoveredReminders.every(r => r.agentName === 'curator')).toBe(true);

    // Phase 2: Indexing
    const response = await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discoveredReminders,
      dryRun: false,
    });

    // Verify indexing results
    expect(response.status).toBe('success');
    expect(response.changes.addedNodes).toHaveLength(2);
    expect(response.summary.ruleNodes).toBe(0);
    expect(response.summary.reminderNodes).toBe(2);

    // Verify graph nodes
    expect(baseGraph.nodes).toHaveLength(2);
    const memoryNode = baseGraph.nodes.find(n => n.title === 'curator Agent Memory');
    expect(memoryNode).toBeDefined();
    expect((memoryNode as any)!.type).toBe(MemoryType.Reminder);
    expect((memoryNode as any)!.agent).toBe('curator');

    // Verify index entries
    expect(baseIndex.memories).toHaveLength(2);
    const memoryEntry = baseIndex.memories.find(e => e.title === 'curator Agent Memory');
    expect(memoryEntry).toBeDefined();
    expect(memoryEntry?.externalPath).toBe(memoryPath);
    expect(memoryEntry?.externalFileKind).toBe('agent-memory-summary');
    expect(memoryEntry?.agent).toBe('curator');
  });

  // T061: Integration test - External nodes can be linked to regular memories
  it('should allow linking external nodes to regular memories', async () => {
    // Setup: Create a rule file
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Project rules\nAlways use TDD');

    // Discover and index the rule
    const discoveredRules = discoverRuleFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
    });

    await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discoveredRules,
      dryRun: false,
    });

    // Save graph and index to disk for write operation
    await saveGraph(tempDir, baseGraph as any);
    await saveIndex(tempDir, baseIndex);

    // Create a regular memory
    const memoryResult = await writeMemory({
      id: 'learning-tdd-best-practices',
      title: 'TDD Best Practices',
      type: MemoryType.Learning,
      content: 'Always write tests before code',
      tags: ['tdd', 'testing'],
      scope: Scope.Project,
      basePath: tempDir,
    });

    expect(memoryResult.status).toBe('success');

    // Link the regular memory to the external rule node
    const ruleId = discoveredRules[0]?.id;
    expect(ruleId).toBeDefined();

    const linkResult = await linkMemories({
      source: 'learning-tdd-best-practices',
      target: ruleId!,
      relation: EdgeType.GovernedBy,
      basePath: tempDir,
    });

    expect(linkResult.status).toBe('success');

    // Verify the link was created in the graph (reload from disk)
    const updatedGraph = await loadGraph(tempDir);
    const edge = updatedGraph.edges.find(
      e => e.source === 'learning-tdd-best-practices' && e.target === ruleId
    );
    expect(edge).toBeDefined();
    expect(edge?.label).toBe(EdgeType.GovernedBy);
  });

  // T062: Integration test - External nodes appear in graph but cannot be modified
  it('should prevent modification of external nodes', async () => {
    // Setup: Create and index a rule file
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Rules');

    const discoveredRules = discoverRuleFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
    });

    await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discoveredRules,
      dryRun: false,
    });

    await saveGraph(tempDir, baseGraph as any);
    await saveIndex(tempDir, baseIndex);

    const ruleId = discoveredRules[0]?.id;
    expect(ruleId).toBeDefined();

    // Attempt to write to the external node should fail
    const writeResult = await writeMemory({
      id: ruleId!,
      title: 'Modified',
      type: MemoryType.Rule,
      content: 'Modified content',
      tags: [],
      scope: Scope.Project,
      basePath: tempDir,
    });

    expect(writeResult.status).toBe('error');
    expect(writeResult.error).toContain('read-only external node');
  });

  // T063: Integration test - Updating external files re-syncs content
  it('should detect and update changed external files', async () => {
    // Setup: Create a rule file
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Version 1\nOriginal content');

    // Initial discovery and indexing
    const discoveredRules1 = discoverRuleFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
    });

    const response1 = await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discoveredRules1,
      dryRun: false,
    });

    expect(response1.changes.addedNodes).toHaveLength(1);
    expect(response1.changes.updatedNodes).toHaveLength(0);

    // Modify the file
    fs.writeFileSync(claudePath, '# Version 2\nUpdated content');

    // Re-discover and re-index
    const discoveredRules2 = discoverRuleFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
    });

    const response2 = await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discoveredRules2,
      dryRun: false,
    });

    // Should detect the update
    expect(response2.changes.addedNodes).toHaveLength(0);
    expect(response2.changes.updatedNodes).toHaveLength(1);
    expect(response2.changes.updatedNodes[0]).toBe(discoveredRules2[0]?.id);
  });
});
