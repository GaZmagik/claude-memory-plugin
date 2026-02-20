/**
 * T142: Integration test for CLAUDE.md deletion triggering node removal
 *
 * Verifies that when CLAUDE.md is deleted, sync detects the deletion
 * and removes the corresponding node from the graph and index.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';

describe('T142: CLAUDE.md deletion triggers node removal', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-delete-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should remove node when CLAUDE.md is deleted', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');

    // Create and sync CLAUDE.md
    fs.writeFileSync(claudePath, '# Rules\nProject guidelines.');
    let syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(1);

    // Verify node exists
    let index = await loadIndex({ basePath: tempDir });
    let ruleNode = index.memories.find(m => m.id === 'rule-project-claude-md-root');
    expect(ruleNode).toBeDefined();

    // Delete CLAUDE.md
    fs.unlinkSync(claudePath);

    // Sync to detect deletion
    syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(0);

    // Verify node removed from index
    index = await loadIndex({ basePath: tempDir });
    ruleNode = index.memories.find(m => m.id === 'rule-project-claude-md-root');
    expect(ruleNode).toBeUndefined();

    // Verify node removed from graph
    const graph = await loadGraph(tempDir);
    const graphNode = graph.nodes.find(n => n.id === 'rule-project-claude-md-root');
    expect(graphNode).toBeUndefined();

    // Verify read fails
    const readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.status).toBe('error');
  });

  it('should remove only deleted file when multiple rules exist', async () => {
    // Create CLAUDE.md and rules files
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Main rules');

    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security');
    fs.writeFileSync(path.join(rulesDir, 'testing.md'), '# Testing');

    // Initial sync
    let syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(3);

    // Delete only security.md
    fs.unlinkSync(path.join(rulesDir, 'security.md'));

    // Sync to detect deletion
    syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(2);

    // Verify other nodes still exist
    const index = await loadIndex({ basePath: tempDir });
    expect(index.memories.some(m => m.id === 'rule-project-claude-md-root')).toBe(true);
    expect(index.memories.some(m => m.id === 'rule-project-testing')).toBe(true);
    expect(index.memories.some(m => m.id === 'rule-project-security')).toBe(false);
  });

  it('should handle deletion of all external files', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });

    // Create multiple files
    fs.writeFileSync(claudePath, '# Main');
    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security');
    fs.writeFileSync(path.join(rulesDir, 'testing.md'), '# Testing');

    // Initial sync
    await syncMemories({ basePath: tempDir });

    // Delete all external files
    fs.unlinkSync(claudePath);
    fs.unlinkSync(path.join(rulesDir, 'security.md'));
    fs.unlinkSync(path.join(rulesDir, 'testing.md'));

    // Sync to detect all deletions
    const syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(0);

    // Verify all nodes removed
    const index = await loadIndex({ basePath: tempDir });
    const ruleNodes = index.memories.filter(m => m.id.startsWith('rule-project-'));
    expect(ruleNodes.length).toBe(0);
  });

  it('should handle deletion and re-creation of same file', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');

    // Create and sync
    fs.writeFileSync(claudePath, '# Version 1');
    await syncMemories({ basePath: tempDir });

    let index = await loadIndex({ basePath: tempDir });
    expect(index.memories.some(m => m.id === 'rule-project-claude-md-root')).toBe(true);

    // Delete and sync
    fs.unlinkSync(claudePath);
    await syncMemories({ basePath: tempDir });

    index = await loadIndex({ basePath: tempDir });
    expect(index.memories.some(m => m.id === 'rule-project-claude-md-root')).toBe(false);

    // Re-create with new content and sync
    fs.writeFileSync(claudePath, '# Version 2');
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(1);
    expect(syncResult.changes.externalNodesAdded.length).toBe(1);

    // Verify new node exists
    index = await loadIndex({ basePath: tempDir });
    const ruleNode = index.memories.find(m => m.id === 'rule-project-claude-md-root');
    expect(ruleNode).toBeDefined();

    // Verify it has new content
    const readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('Version 2');
  });
});
