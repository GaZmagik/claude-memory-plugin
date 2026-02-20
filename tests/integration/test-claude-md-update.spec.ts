/**
 * T141: Integration test for CLAUDE.md modification triggering embedding update
 *
 * Verifies that when CLAUDE.md content changes, sync detects the change
 * and updates the node (embeddings would be regenerated if provider available).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';

describe('T141: CLAUDE.md modification triggers update', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-update-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect and update node when CLAUDE.md content changes', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');

    // Create initial CLAUDE.md
    fs.writeFileSync(claudePath, '# Version 1\nOriginal rules and guidelines.');

    // Initial sync
    let syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(1);
    expect(syncResult.changes.externalNodesAdded.length).toBe(1);

    // Read initial content
    let readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('Version 1');
    expect(readResult.memory?.content).toContain('Original rules');

    // Modify CLAUDE.md
    fs.writeFileSync(claudePath, '# Version 2\nUpdated rules with new guidelines and best practices.');

    // Sync again to detect changes
    syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');

    // Read updated content
    readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('Version 2');
    expect(readResult.memory?.content).toContain('new guidelines');
    expect(readResult.memory?.content).not.toContain('Version 1');
  });

  it('should detect multiple changes across multiple syncs', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');

    // Version 1
    fs.writeFileSync(claudePath, '# V1\nFirst version.');
    await syncMemories({ basePath: tempDir });

    let readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.memory?.content).toContain('First version');

    // Version 2
    fs.writeFileSync(claudePath, '# V2\nSecond version.');
    await syncMemories({ basePath: tempDir });

    readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.memory?.content).toContain('Second version');
    expect(readResult.memory?.content).not.toContain('First version');

    // Version 3
    fs.writeFileSync(claudePath, '# V3\nThird version.');
    await syncMemories({ basePath: tempDir });

    readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.memory?.content).toContain('Third version');
    expect(readResult.memory?.content).not.toContain('Second version');
  });

  it('should maintain node ID and metadata across updates', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');

    // Create and sync initial version
    fs.writeFileSync(claudePath, '# Original\nInitial content.');
    await syncMemories({ basePath: tempDir });

    // Get initial index entry
    let index = await loadIndex({ basePath: tempDir });
    let ruleNode = index.memories.find(m => m.id === 'rule-project-claude-md-root');
    expect(ruleNode).toBeDefined();
    const originalId = ruleNode?.id;

    // Update content
    fs.writeFileSync(claudePath, '# Updated\nNew content.');
    await syncMemories({ basePath: tempDir });

    // Verify ID and externalPath unchanged
    index = await loadIndex({ basePath: tempDir });
    ruleNode = index.memories.find(m => m.id === 'rule-project-claude-md-root');

    expect(ruleNode?.id).toBe(originalId);
    expect(ruleNode?.externalPath).toBe(claudePath);
  });
});
