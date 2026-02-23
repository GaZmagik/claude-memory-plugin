/**
 * Integration Tests for Phase 2C: External Nodes (T109-T113)
 *
 * End-to-end tests verifying guards, read, sync, and index-context work with external files.
 * Note: More comprehensive integration already exists in external-file-integration.spec.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { discoverRuleFiles, discoverReminderFiles } from '../../skills/memory/src/external/external-file-discovery.js';
import { indexExternalFiles } from '../../skills/memory/src/external/external-file-indexer.js';
import { saveGraph } from '../../skills/memory/src/graph/structure.js';
import { saveIndex } from '../../skills/memory/src/core/index.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import type { MemoryGraph, MemoryIndex } from '../../skills/memory/src/types/memory.js';

describe('Phase 2C Integration: External Nodes', () => {
  let tempDir: string;
  let baseGraph: MemoryGraph;
  let baseIndex: MemoryIndex;
  let embeddingsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-2c-'));
    embeddingsPath = path.join(tempDir, 'embeddings.json');

    // Initialize in-memory structures
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

    // Create CLAUDE.md
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Rules\nFollow TDD.');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // T109: Write command rejects rule nodes
  it('T109: should reject write attempts on rule nodes', async () => {
    // Discover and index external files
    const discovered = await discoverRuleFiles({
      cwd: tempDir,
      homeDir: os.homedir(),
      gitRoot: tempDir,
    });

    await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discovered,
      dryRun: false,
    });

    // Save graph and index to disk
    await saveGraph(tempDir, baseGraph as any);
    await saveIndex(tempDir, baseIndex);

    const ruleId = discovered[0]?.id;
    expect(ruleId).toBeDefined();

    // Attempt to write to rule node
    const result = await writeMemory({
      id: ruleId!,
      title: 'Updated',
      content: 'Updated content',
      type: MemoryType.Rule,
      scope: Scope.Project,
      tags: [],
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only external node');
  });

  // T110: Delete command rejects reminder nodes
  it('T110: should reject delete attempts on reminder nodes', async () => {
    // Create agent MEMORY.md
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Memory\nTest agent memory.');

    // Discover and index reminder files
    const discovered = await discoverReminderFiles({
      projectRoot: tempDir,
      homeDir: tempDir,
    });

    expect(discovered.length).toBeGreaterThan(0);
    expect(discovered[0]?.agentName).toBe('test-agent');

    await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discovered,
      dryRun: false,
    });

    // Save graph and index to disk
    await saveGraph(tempDir, baseGraph as any);
    await saveIndex(tempDir, baseIndex);

    const reminderId = discovered[0]?.id;
    expect(reminderId).toBeDefined();

    // Verify the reminder is in the index
    const indexEntry = baseIndex.memories.find(m => m.id === reminderId);
    expect(indexEntry).toBeDefined();
    expect(indexEntry?.type).toBe(MemoryType.Reminder);

    // Attempt to delete reminder node
    const result = await deleteMemory({
      id: reminderId!,
      basePath: tempDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only external node');
  });

  // T111: Read command displays external file content
  it('T111: should read external file content via externalPath', async () => {
    const discovered = await discoverRuleFiles({
      cwd: tempDir,
      homeDir: os.homedir(),
      gitRoot: tempDir,
    });

    await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discovered,
      dryRun: false,
    });

    // Save graph and index to disk
    await saveGraph(tempDir, baseGraph as any);
    await saveIndex(tempDir, baseIndex);

    const ruleId = discovered[0]?.id;
    expect(ruleId).toBeDefined();

    const result = await readMemory({
      id: ruleId!,
      basePath: tempDir,
    });

    expect(result.status).toBe('success');
    expect(result.memory?.content).toContain('Follow TDD');
    expect(result.memory?.frontmatter.type).toBe(MemoryType.Rule);
  });

  // T112: Sync indexes external files
  it('T112: should index external files during sync', async () => {
    const result = await syncMemories({ basePath: tempDir });

    expect(result.status).toBe('success');
    expect(result.changes.externalNodesAdded.length).toBeGreaterThan(0);
    expect(result.summary.externalRuleNodes).toBeGreaterThan(0);
  });

  // T113: Index-context refreshes external index
  it('T113: should refresh external file index', async () => {
    const discovered = await discoverRuleFiles({
      cwd: tempDir,
      homeDir: os.homedir(),
      gitRoot: tempDir,
    });

    const result = await indexExternalFiles({
      basePath: tempDir,
      graph: baseGraph,
      index: baseIndex,
      embeddingsPath,
      externalFiles: discovered,
      dryRun: false,
    });

    expect(result.status).toBe('success');
    expect(result.changes.addedNodes.length).toBeGreaterThan(0);
    expect(result.summary.totalExternalNodes).toBeGreaterThan(0);
  });
});
