/**
 * T137: Integration test for CLAUDE.md discovery and semantic search
 *
 * Verifies that CLAUDE.md files are discovered, indexed as rule nodes,
 * and their content is accessible. Note: Search functionality for external
 * nodes will be implemented in a future phase.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { MemoryType } from '../../skills/memory/src/types/enums.js';

describe('T137: CLAUDE.md discovery and indexing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-md-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should discover and index CLAUDE.md as rule node', async () => {
    // Create CLAUDE.md with known content
    const claudeContent = `# Project Rules

## Code Standards
- Always use TypeScript strict mode
- Follow TDD principles with red-green-refactor cycle
- Write comprehensive tests before implementation

## Git Workflow
- Never commit directly to main
- Use feature branches for all changes
- Squash commits before merging`;

    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, claudeContent);

    // Run sync to discover and index the CLAUDE.md file
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(1);
    expect(syncResult.changes.externalNodesAdded.length).toBe(1);
    expect(syncResult.changes.externalNodesAdded[0]).toBe('rule-project-claude-md-root');

    // Load the index to verify the rule node details
    const index = await loadIndex({ basePath: tempDir });
    const ruleNode = index.memories.find(
      m => m.type === MemoryType.Rule && m.id === 'rule-project-claude-md-root'
    );

    expect(ruleNode).toBeDefined();
    expect(ruleNode?.type).toBe(MemoryType.Rule);
    expect(ruleNode?.title).toBe('CLAUDE.md');
    expect(ruleNode?.externalFileKind).toBe('claude-instructions');
    expect(ruleNode?.externalPath).toBe(claudePath);

    // Verify content is accessible via read
    const readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('TDD principles');
    expect(readResult.memory?.content).toContain('TypeScript strict mode');
    expect(readResult.memory?.frontmatter.type).toBe(MemoryType.Rule);
  });

  it('should discover multiple rule files', async () => {
    // Create CLAUDE.md
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Main rules\nFollow TDD.');

    // Create rules directory with additional files
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security\nUse HTTPS.');
    fs.writeFileSync(path.join(rulesDir, 'testing.md'), '# Testing\nWrite tests first.');

    // Sync to discover all rule files
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(3);
    expect(syncResult.changes.externalNodesAdded.length).toBe(3);

    // Verify all rule nodes are in the index
    const index = await loadIndex({ basePath: tempDir });
    const ruleNodes = index.memories.filter(m => m.type === MemoryType.Rule);

    expect(ruleNodes.length).toBe(3);
    expect(ruleNodes.some(n => n.id === 'rule-project-claude-md-root')).toBe(true);
    expect(ruleNodes.some(n => n.id === 'rule-project-security')).toBe(true);
    expect(ruleNodes.some(n => n.id === 'rule-project-testing')).toBe(true);
  });

  it('should update rule node when CLAUDE.md content changes', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');

    // Create initial CLAUDE.md
    fs.writeFileSync(claudePath, '# Old rules\nOriginal content.');
    await syncMemories({ basePath: tempDir });

    // Verify initial content
    let readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });
    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('Original content');

    // Modify CLAUDE.md
    fs.writeFileSync(claudePath, '# New rules\nUpdated content with new guidelines.');

    // Sync again to detect changes
    const syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');

    // Verify updated content is accessible (content should be from the updated file)
    readResult = await readMemory({
      id: 'rule-project-claude-md-root',
      basePath: tempDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('Updated content');
    expect(readResult.memory?.content).not.toContain('Original content');
  });
});
