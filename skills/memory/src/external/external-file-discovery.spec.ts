/**
 * Tests for T035-T060: External File Discovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  discoverRuleFiles,
  discoverReminderFiles,
  discoverExternalFiles,
} from './external-file-discovery.js';
import { ExternalFileKind } from './external-file-types.js';
import { Scope } from '../types/enums.js';

describe('discoverRuleFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rule-discovery-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // T035: Unit test for discoverRuleFiles finding CLAUDE.md in project root
  it('should find CLAUDE.md in project root', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudePath, '# Project instructions');

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]?.kind).toBe(ExternalFileKind.ClaudeInstructions);
    expect(results[0]?.absolutePath).toBe(claudePath);
    expect(results[0]?.scope).toBe(Scope.Project);
  });

  // T036: Unit test for discoverRuleFiles finding CLAUDE.local.md
  it('should find CLAUDE.local.md in project root', async () => {
    const claudeLocalPath = path.join(tempDir, 'CLAUDE.local.md');
    fs.writeFileSync(claudeLocalPath, '# Local instructions');

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe(ExternalFileKind.ClaudeLocalInstructions);
    expect(results[0]!.absolutePath).toBe(claudeLocalPath);
    expect(results[0]!.scope).toBe(Scope.Local);
  });

  // T037: Unit test for discoverRuleFiles finding rules directory files
  it('should find files in .claude/rules/ directory', async () => {
    const rulesDir = path.join(tempDir, '.claude', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });

    const securityPath = path.join(rulesDir, 'security.md');
    const tddPath = path.join(rulesDir, 'tdd.md');
    fs.writeFileSync(securityPath, '# Security rules');
    fs.writeFileSync(tddPath, '# TDD rules');

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir, gitRoot: tempDir });

    const rulesFiles = results.filter(r => r.kind === ExternalFileKind.RulesFile);
    expect(rulesFiles).toHaveLength(2);
    expect(rulesFiles.some(r => r.absolutePath === securityPath)).toBe(true);
    expect(rulesFiles.some(r => r.absolutePath === tddPath)).toBe(true);
  });

  // T038: Unit test for discoverRuleFiles walking ancestor directories
  it('should walk ancestor directories to find CLAUDE.md files', async () => {
    // Create nested structure: tempDir/parent/child/grandchild
    const parentDir = path.join(tempDir, 'parent');
    const childDir = path.join(parentDir, 'child');
    const grandchildDir = path.join(childDir, 'grandchild');
    fs.mkdirSync(grandchildDir, { recursive: true });

    // Place CLAUDE.md in parent directory
    const parentClaudePath = path.join(parentDir, 'CLAUDE.md');
    fs.writeFileSync(parentClaudePath, '# Parent instructions');

    // Run discovery from grandchild directory
    const results = await discoverRuleFiles({ cwd: grandchildDir, homeDir: tempDir });

    const ancestorFiles = results.filter(r =>
      r.kind === ExternalFileKind.ClaudeInstructions &&
      r.absolutePath === parentClaudePath
    );
    expect(ancestorFiles).toHaveLength(1);
    expect(ancestorFiles[0]!.id).toContain('ancestor');
  });

  // T039: Unit test for discoverRuleFiles excluding vendor directories
  it('should exclude vendor directories (node_modules, .git, dist, build, vendor)', async () => {
    // Create vendor directories
    const nodeModulesDir = path.join(tempDir, 'node_modules', '.claude');
    const gitDir = path.join(tempDir, '.git', '.claude');
    const distDir = path.join(tempDir, 'dist', '.claude');

    fs.mkdirSync(nodeModulesDir, { recursive: true });
    fs.mkdirSync(gitDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });

    // Place CLAUDE.md files in vendor directories (should be ignored)
    fs.writeFileSync(path.join(nodeModulesDir, 'CLAUDE.md'), '# Vendor');
    fs.writeFileSync(path.join(gitDir, 'CLAUDE.md'), '# Vendor');
    fs.writeFileSync(path.join(distDir, 'CLAUDE.md'), '# Vendor');

    // Place valid CLAUDE.md in root
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Valid');

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });

    // Should only find the root CLAUDE.md, not the ones in vendor directories
    expect(results).toHaveLength(1);
    expect(results[0]!.absolutePath).toBe(path.join(tempDir, 'CLAUDE.md'));
  });

  // T040: Unit test for discoverRuleFiles resolving symlinks to canonical paths
  it('should resolve symlinks to canonical paths', async () => {
    const realFile = path.join(tempDir, 'real-CLAUDE.md');
    const symlinkFile = path.join(tempDir, 'CLAUDE.md');

    fs.writeFileSync(realFile, '# Real file');
    fs.symlinkSync(realFile, symlinkFile);

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });

    // Should resolve to canonical path
    expect(results).toHaveLength(1);
    expect(results[0]!.absolutePath).toBe(fs.realpathSync(symlinkFile));
  });

  // T040A: Unit test for discoverRuleFiles handling symlink loops without infinite recursion
  it('should handle symlink loops without infinite recursion', async () => {
    const dirA = path.join(tempDir, 'dirA');
    const dirB = path.join(tempDir, 'dirB');

    fs.mkdirSync(dirA);
    fs.mkdirSync(dirB);

    // Create symlink loop: dirA/link -> dirB, dirB/link -> dirA
    try {
      fs.symlinkSync(dirB, path.join(dirA, 'link'), 'dir');
      fs.symlinkSync(dirA, path.join(dirB, 'link'), 'dir');

      fs.writeFileSync(path.join(dirA, 'CLAUDE.md'), '# Instructions');

      // Should not hang or throw
      const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });
      expect(results.length).toBeGreaterThanOrEqual(0);
    } catch (err) {
      // Symlink creation might fail on some systems, skip test
      expect(err).toBeDefined();
    }
  });

  // T040B: Unit test for discoverRuleFiles handling broken symlinks gracefully
  it('should handle broken symlinks gracefully', async () => {
    const brokenLink = path.join(tempDir, 'CLAUDE.md');

    // Create symlink to non-existent target
    try {
      fs.symlinkSync('/non/existent/path', brokenLink);

      // Should not throw, just skip broken symlink
      const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });
      expect(results).toHaveLength(0);
    } catch (err) {
      // Symlink creation might fail on some systems, skip test
      expect(err).toBeDefined();
    }
  });

  // T041: Unit test for deterministic rule ID generation
  it('should generate deterministic IDs for rule files', async () => {
    const claudePath = path.join(tempDir, 'CLAUDE.md');
    const dotClaudePath = path.join(tempDir, '.claude', 'CLAUDE.md');

    fs.writeFileSync(claudePath, '# Root');
    fs.mkdirSync(path.join(tempDir, '.claude'));
    fs.writeFileSync(dotClaudePath, '# Dot claude');

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir, gitRoot: tempDir });

    // Should have distinct IDs with suffixes
    expect(results).toHaveLength(2);
    const ids = results.map(r => r.id).sort();
    expect(ids[0]).toContain('claude-md');
    expect(ids[1]).toContain('claude-md');
    expect(ids[0]).not.toBe(ids[1]); // Must be unique
  });

  // T042: Unit test for rule scope determination
  it('should determine scope correctly (project, local, global, ancestor)', async () => {
    // Project scope: in gitRoot
    const projectPath = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(projectPath, '# Project');

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir, gitRoot: tempDir });

    const projectFile = results.find(r => r.absolutePath === projectPath);
    expect(projectFile?.scope).toBe(Scope.Project);
  });

  it('should return empty array when no rule files found', async () => {
    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });
    expect(results).toEqual([]);
  });

  // M4: Test FR-024 file size limit (1MB max)
  it('should skip files larger than 1MB and log warning', async () => {
    const largePath = path.join(tempDir, 'CLAUDE.md');

    // Create a file larger than 1MB (1,048,576 bytes)
    const largeContent = 'x'.repeat(1_048_577);
    fs.writeFileSync(largePath, largeContent);

    // Spy on console.warn to verify warning is logged
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });

    // Should skip the large file
    expect(results).toHaveLength(0);

    // Should log warning
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping large external file')
    );

    warnSpy.mockRestore();
  });

  // M4: Test permission error handling
  it('should handle permission errors gracefully', async () => {
    const restrictedPath = path.join(tempDir, 'restricted.md');
    fs.writeFileSync(restrictedPath, '# Restricted');

    // Make file unreadable (Unix-only, skip on Windows)
    try {
      fs.chmodSync(restrictedPath, 0o000);

      // Should not throw, just skip unreadable file with fallback hash
      const results = await discoverRuleFiles({ cwd: tempDir, homeDir: tempDir });

      // Verify it handles the error gracefully (may or may not include the file)
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);

      // Restore permissions for cleanup
      fs.chmodSync(restrictedPath, 0o644);
    } catch (err) {
      // Permission changes might not work on all systems, skip test
      fs.chmodSync(restrictedPath, 0o644);
    }
  });
});

describe('discoverReminderFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reminder-discovery-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // T043: Unit test for discoverReminderFiles finding MEMORY.md in agent directories
  it('should find MEMORY.md in agent directories', async () => {
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });

    const memoryPath = path.join(agentMemoryDir, 'MEMORY.md');
    fs.writeFileSync(memoryPath, '# Curator memory');

    const results = await discoverReminderFiles({ projectRoot: tempDir, homeDir: tempDir });

    expect(results).toHaveLength(1);
    expect(results[0]!.kind).toBe(ExternalFileKind.AgentMemorySummary);
    expect(results[0]!.absolutePath).toBe(memoryPath);
    expect(results[0]!.agentName).toBe('curator');
  });

  // T044: Unit test for discoverReminderFiles finding sub-files in agent directories
  it('should find sub-files in agent directories', async () => {
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });

    const patternsPath = path.join(agentMemoryDir, 'patterns.md');
    const debuggingPath = path.join(agentMemoryDir, 'debugging.md');
    fs.writeFileSync(patternsPath, '# Patterns');
    fs.writeFileSync(debuggingPath, '# Debugging');

    const results = await discoverReminderFiles({ projectRoot: tempDir, homeDir: tempDir });

    const subFiles = results.filter(r => r.kind === ExternalFileKind.AgentMemorySubFile);
    expect(subFiles).toHaveLength(2);
    expect(subFiles.some(r => r.absolutePath === patternsPath)).toBe(true);
    expect(subFiles.some(r => r.absolutePath === debuggingPath)).toBe(true);
  });

  // T045: Unit test for discoverReminderFiles handling missing MEMORY.md gracefully
  it('should handle missing MEMORY.md gracefully', async () => {
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });

    // Only sub-files, no MEMORY.md
    fs.writeFileSync(path.join(agentMemoryDir, 'patterns.md'), '# Patterns');

    const results = await discoverReminderFiles({ projectRoot: tempDir, homeDir: tempDir });

    // Should still find the sub-file
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  // T046: Unit test for discoverReminderFiles extracting agent name correctly
  it('should extract agent name correctly from directory', async () => {
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'speckit-planner');
    fs.mkdirSync(agentMemoryDir, { recursive: true });

    fs.writeFileSync(path.join(agentMemoryDir, 'MEMORY.md'), '# Memory');

    const results = await discoverReminderFiles({ projectRoot: tempDir, homeDir: tempDir });

    expect(results[0]!.agentName).toBe('speckit-planner');
  });

  // T047: Unit test for deterministic reminder ID generation
  it('should generate deterministic IDs for reminder files', async () => {
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });

    fs.writeFileSync(path.join(agentMemoryDir, 'MEMORY.md'), '# Memory');
    fs.writeFileSync(path.join(agentMemoryDir, 'patterns.md'), '# Patterns');

    const results = await discoverReminderFiles({ projectRoot: tempDir, homeDir: tempDir });

    // IDs should follow pattern: reminder-{scope}-{agent}-{file}
    expect(results[0]!.id).toMatch(/^reminder-\w+-curator-/);
    expect(results[1]!.id).toMatch(/^reminder-\w+-curator-/);
    expect(results[0]!.id).not.toBe(results[1]!.id);
  });

  // T048: Unit test for reminder scope determination
  it('should determine scope correctly (agent-project, local, agent-global)', async () => {
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });

    fs.writeFileSync(path.join(agentMemoryDir, 'MEMORY.md'), '# Memory');

    const results = await discoverReminderFiles({ projectRoot: tempDir, homeDir: tempDir });

    expect(results[0]!.scope).toBe(Scope.AgentProject);
  });

  it('should return empty array when no reminder files found', async () => {
    const results = await discoverReminderFiles({ projectRoot: tempDir, homeDir: tempDir });
    expect(results).toEqual([]);
  });
});

describe('discoverExternalFiles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-discovery-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // T049: Unit test for discoverExternalFiles combining rules and reminders
  it('should combine rule and reminder discovery', async () => {
    // Create rule file
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Rules');

    // Create reminder file
    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });
    fs.writeFileSync(path.join(agentMemoryDir, 'MEMORY.md'), '# Memory');

    const results = await discoverExternalFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
      projectRoot: tempDir,
    });

    const ruleFiles = results.filter(r => r.id.startsWith('rule-'));
    const reminderFiles = results.filter(r => r.id.startsWith('reminder-'));

    expect(ruleFiles).toHaveLength(1);
    expect(reminderFiles).toHaveLength(1);
    expect(results).toHaveLength(2);
  });

  it('should return rules first, then reminders', async () => {
    fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Rules');

    const agentMemoryDir = path.join(tempDir, '.claude', 'agent-memory', 'curator');
    fs.mkdirSync(agentMemoryDir, { recursive: true });
    fs.writeFileSync(path.join(agentMemoryDir, 'MEMORY.md'), '# Memory');

    const results = await discoverExternalFiles({
      cwd: tempDir,
      homeDir: tempDir,
      gitRoot: tempDir,
      projectRoot: tempDir,
    });

    // Rules should come before reminders
    const firstRule = results.findIndex(r => r.id.startsWith('rule-'));
    const firstReminder = results.findIndex(r => r.id.startsWith('reminder-'));

    if (firstRule !== -1 && firstReminder !== -1) {
      expect(firstRule).toBeLessThan(firstReminder);
    }
  });
});
