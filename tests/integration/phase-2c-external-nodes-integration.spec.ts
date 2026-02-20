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
  let memoryDir: string;
  let baseGraph: MemoryGraph;
  let baseIndex: MemoryIndex;
  let embeddingsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-2c-'));
    memoryDir = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.mkdirSync(path.join(memoryDir, 'permanent'), { recursive: true });

    embeddingsPath = path.join(memoryDir, 'embeddings.json');

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

    // Create empty files
    fs.writeFileSync(embeddingsPath, JSON.stringify({}));

    // Create CLAUDE.md
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Rules\nFollow TDD.');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // T109: Write command rejects rule nodes
  it('T109: should reject write attempts on rule nodes', async () => {
    // Discover and index external files
    const discovered = discoverExternalFiles({ cwd: tempDir, homeDir: os.homedir(), gitRoot: tempDir });
    const graph = await loadGraph(memoryDir);
    const index = await loadIndex({ basePath: memoryDir });

    await indexExternalFiles({
      basePath: memoryDir,
      graph: graph as any,
      index,
      embeddingsPath: path.join(memoryDir, 'embeddings.json'),
      externalFiles: discovered,
    });

    // Attempt to write to rule node
    const result = await writeMemory({
      id: 'rule-project-claude-md-root',
      title: 'Updated',
      content: 'Updated content',
      type: MemoryType.Rule,
      scope: Scope.Project,
      tags: [],
      basePath: memoryDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
  });

  // T110: Delete command rejects reminder nodes
  it('T110: should reject delete attempts on reminder nodes', async () => {
    // Create agent MEMORY.md
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Memory\nTest.');

    const agentMemoryDir = path.join(tempDir, '.claude', 'memory', 'agents', 'test-agent');
    fs.mkdirSync(agentMemoryDir, { recursive: true });
    fs.mkdirSync(path.join(agentMemoryDir, 'permanent'), { recursive: true });
    fs.writeFileSync(path.join(agentMemoryDir, 'graph.json'), JSON.stringify({ version: 1, nodes: [], edges: [] }));
    fs.writeFileSync(path.join(agentMemoryDir, 'index.json'), JSON.stringify({ version: '1.0.0', lastUpdated: new Date().toISOString(), memories: [] }));
    fs.writeFileSync(path.join(agentMemoryDir, 'embeddings.json'), JSON.stringify({}));

    const discovered = discoverExternalFiles({ cwd: tempDir, homeDir: os.homedir(), gitRoot: tempDir });
    const graph = await loadGraph(agentMemoryDir);
    const index = await loadIndex({ basePath: agentMemoryDir });

    await indexExternalFiles({
      basePath: agentMemoryDir,
      graph: graph as any,
      index,
      embeddingsPath: path.join(agentMemoryDir, 'embeddings.json'),
      externalFiles: discovered,
    });

    // Attempt to delete reminder node
    const result = await deleteMemory({
      id: 'reminder-agent-project-test-agent-memory-md',
      basePath: agentMemoryDir,
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('read-only');
  });

  // T111: Read command displays external file content
  it('T111: should read external file content via externalPath', async () => {
    const discovered = discoverExternalFiles({ cwd: tempDir, homeDir: os.homedir(), gitRoot: tempDir });
    const graph = await loadGraph(memoryDir);
    const index = await loadIndex({ basePath: memoryDir });

    await indexExternalFiles({
      basePath: memoryDir,
      graph: graph as any,
      index,
      embeddingsPath: path.join(memoryDir, 'embeddings.json'),
      externalFiles: discovered,
    });

    const result = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: memoryDir,
    });

    expect(result.status).toBe('success');
    expect(result.memory?.content).toContain('Follow TDD');
    expect(result.memory?.frontmatter.type).toBe(MemoryType.Rule);
  });

  // T112: Sync indexes external files
  it('T112: should index external files during sync', async () => {
    const result = await syncMemories({ basePath: memoryDir });

    expect(result.status).toBe('success');
    expect(result.changes.externalNodesAdded.length).toBeGreaterThan(0);
    expect(result.summary.externalRuleNodes).toBeGreaterThan(0);
  });

  // T113: Index-context refreshes external index
  it('T113: should refresh external file index', async () => {
    const discovered = discoverExternalFiles({ cwd: tempDir, homeDir: os.homedir(), gitRoot: tempDir });
    const graph = await loadGraph(memoryDir);
    const index = await loadIndex({ basePath: memoryDir });

    const result = await indexExternalFiles({
      basePath: memoryDir,
      graph,
      index,
      embeddingsPath: path.join(memoryDir, 'embeddings.json'),
      externalFiles: discovered,
    });

    expect(result.status).toBe('success');
    expect(result.changes.addedNodes.length).toBeGreaterThan(0);
    expect(result.summary.totalExternalNodes).toBeGreaterThan(0);
  });
});
