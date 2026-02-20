/**
 * T138: Integration test for rules file discovery and keyword search
 *
 * Verifies that files in .claude/rules/ directory are discovered, indexed as rule nodes,
 * and their content is accessible.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { MemoryType } from '../../skills/memory/src/types/enums.js';

describe('T138: Rules file discovery and indexing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-file-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should discover and index rules file from .claude/rules/ directory', async () => {
    // Create .claude/rules directory with a rules file
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });

    const codingStandardsContent = `# Coding Standards

## Formatting
- Use 2 spaces for indentation
- Maximum line length: 100 characters
- Always use trailing commas in multi-line objects

## Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for classes and types
- Use UPPER_SNAKE_CASE for constants`;

    const codingStandardsPath = path.join(rulesDir, 'coding-standards.md');
    fs.writeFileSync(codingStandardsPath, codingStandardsContent);

    // Run sync to discover and index the rules file
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(1);
    expect(syncResult.changes.externalNodesAdded.length).toBe(1);
    expect(syncResult.changes.externalNodesAdded[0]).toBe('rule-project-coding-standards');

    // Load the index to verify the rule node details
    const index = await loadIndex({ basePath: tempDir });
    const ruleNode = index.memories.find(
      m => m.type === MemoryType.Rule && m.id === 'rule-project-coding-standards'
    );

    expect(ruleNode).toBeDefined();
    expect(ruleNode?.type).toBe(MemoryType.Rule);
    expect(ruleNode?.title).toBe('coding-standards.md');
    expect(ruleNode?.externalFileKind).toBe('rules-file');
    expect(ruleNode?.externalPath).toBe(codingStandardsPath);

    // Verify content is accessible via read
    const readResult = await readMemory({
      id: 'rule-project-coding-standards',
      basePath: tempDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('camelCase for variables');
    expect(readResult.memory?.content).toContain('2 spaces for indentation');
    expect(readResult.memory?.frontmatter.type).toBe(MemoryType.Rule);
  });

  it('should discover multiple rules files in .claude/rules/ directory', async () => {
    // Create multiple rules files
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });

    fs.writeFileSync(path.join(rulesDir, 'security.md'), '# Security\nAlways validate user input.');
    fs.writeFileSync(path.join(rulesDir, 'performance.md'), '# Performance\nOptimise for O(n log n).');
    fs.writeFileSync(path.join(rulesDir, 'accessibility.md'), '# A11y\nUse semantic HTML.');

    // Sync to discover all rules files
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(3);
    expect(syncResult.changes.externalNodesAdded.length).toBe(3);

    // Verify all rule nodes are in the index
    const index = await loadIndex({ basePath: tempDir });
    const ruleNodes = index.memories.filter(m => m.type === MemoryType.Rule);

    expect(ruleNodes.length).toBe(3);
    expect(ruleNodes.some(n => n.id === 'rule-project-security')).toBe(true);
    expect(ruleNodes.some(n => n.id === 'rule-project-performance')).toBe(true);
    expect(ruleNodes.some(n => n.id === 'rule-project-accessibility')).toBe(true);

    // Verify all have correct externalFileKind
    ruleNodes.forEach(node => {
      expect(node.externalFileKind).toBe('rules-file');
    });
  });

  it('should discover rules files from both CLAUDE.md and .claude/rules/', async () => {
    // Create CLAUDE.md in project root
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Main rules\nProject guidelines.');

    // Create rules files in .claude/rules/
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'testing.md'), '# Testing\nWrite tests first.');
    fs.writeFileSync(path.join(rulesDir, 'git.md'), '# Git\nUse conventional commits.');

    // Sync to discover all rules
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(3);

    // Verify mix of rule types
    const index = await loadIndex({ basePath: tempDir });
    const ruleNodes = index.memories.filter(m => m.type === MemoryType.Rule);

    const claudeMdNode = ruleNodes.find(n => n.id === 'rule-project-claude-md-root');
    expect(claudeMdNode?.externalFileKind).toBe('claude-instructions');

    const testingNode = ruleNodes.find(n => n.id === 'rule-project-testing');
    expect(testingNode?.externalFileKind).toBe('rules-file');

    const gitNode = ruleNodes.find(n => n.id === 'rule-project-git');
    expect(gitNode?.externalFileKind).toBe('rules-file');
  });

  it('should handle rules files with underscores and spaces in names', async () => {
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });

    // Create files with various naming patterns
    fs.writeFileSync(path.join(rulesDir, 'api_design.md'), '# API Design\nRESTful principles.');
    fs.writeFileSync(path.join(rulesDir, 'error handling.md'), '# Error Handling\nAlways handle errors.');

    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalRuleNodes).toBe(2);

    const index = await loadIndex({ basePath: tempDir });
    const ruleNodes = index.memories.filter(m => m.type === MemoryType.Rule);

    // Verify IDs are normalised (underscores and spaces converted to hyphens)
    expect(ruleNodes.some(n => n.id === 'rule-project-api-design')).toBe(true);
    expect(ruleNodes.some(n => n.id === 'rule-project-error-handling')).toBe(true);
  });
});
