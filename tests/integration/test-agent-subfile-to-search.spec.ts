/**
 * T140: Integration test for agent sub-file discovery and search
 *
 * Verifies that agent sub-files (patterns.md, gotchas.md, etc.) are discovered,
 * indexed as reminder nodes, and their content is accessible.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { syncMemories } from '../../skills/memory/src/maintenance/sync.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { MemoryType } from '../../skills/memory/src/types/enums.js';

describe('T140: Agent sub-file discovery and indexing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-subfile-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should discover and index agent sub-files as reminder nodes', async () => {
    // Create agent directory with sub-files
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'rust-expert');
    fs.mkdirSync(agentDir, { recursive: true });

    const patternsContent = `# Rust Patterns

## Ownership Patterns
- Use borrowing instead of cloning
- Prefer Option<T> over null checks
- Use Result<T, E> for error handling`;

    const patternsPath = path.join(agentDir, 'patterns.md');
    fs.writeFileSync(patternsPath, patternsContent);

    // Run sync to discover and index sub-files
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalReminderNodes).toBeGreaterThan(0);

    // Load the index to verify the reminder node
    const index = await loadIndex({ basePath: tempDir });
    const reminderNode = index.memories.find(
      m => m.type === MemoryType.Reminder && m.id === 'reminder-project-rust-expert-patterns'
    );

    expect(reminderNode).toBeDefined();
    expect(reminderNode?.type).toBe(MemoryType.Reminder);
    expect(reminderNode?.externalFileKind).toBe('agent-memory-sub-file');
    expect(reminderNode?.externalPath).toBe(patternsPath);

    // Verify content is accessible
    const readResult = await readMemory({
      id: 'reminder-project-rust-expert-patterns',
      basePath: tempDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('Ownership Patterns');
    expect(readResult.memory?.content).toContain('Option<T>');
  });

  it('should discover multiple sub-files from the same agent', async () => {
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'typescript-expert');
    fs.mkdirSync(agentDir, { recursive: true });

    // Create multiple sub-files
    fs.writeFileSync(path.join(agentDir, 'patterns.md'), '# Patterns\nFactory patterns.');
    fs.writeFileSync(path.join(agentDir, 'gotchas.md'), '# Gotchas\nAvoid any type.');
    fs.writeFileSync(path.join(agentDir, 'tips.md'), '# Tips\nUse strict mode.');

    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalReminderNodes).toBe(3);

    const index = await loadIndex({ basePath: tempDir });
    const reminderNodes = index.memories.filter(m => m.type === MemoryType.Reminder);

    expect(reminderNodes.length).toBe(3);
    expect(reminderNodes.some(n => n.id === 'reminder-project-typescript-expert-patterns')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-typescript-expert-gotchas')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-typescript-expert-tips')).toBe(true);
  });

  it('should discover both MEMORY.md and sub-files from same agent', async () => {
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'python-guru');
    fs.mkdirSync(agentDir, { recursive: true });

    // Create MEMORY.md and sub-files
    fs.writeFileSync(path.join(agentDir, 'MEMORY.md'), '# Python Guru\nMain memory.');
    fs.writeFileSync(path.join(agentDir, 'patterns.md'), '# Patterns\nList comprehensions.');
    fs.writeFileSync(path.join(agentDir, 'gotchas.md'), '# Gotchas\nMutable defaults.');

    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalReminderNodes).toBe(3);

    const index = await loadIndex({ basePath: tempDir });
    const reminderNodes = index.memories.filter(m => m.type === MemoryType.Reminder);

    // Verify MEMORY.md
    const memoryNode = reminderNodes.find(n => n.id === 'reminder-project-python-guru-memory');
    expect(memoryNode?.externalFileKind).toBe('agent-memory-summary');

    // Verify sub-files
    const patternsNode = reminderNodes.find(n => n.id === 'reminder-project-python-guru-patterns');
    expect(patternsNode?.externalFileKind).toBe('agent-memory-sub-file');

    const gotchasNode = reminderNodes.find(n => n.id === 'reminder-project-python-guru-gotchas');
    expect(gotchasNode?.externalFileKind).toBe('agent-memory-sub-file');
  });

  it('should handle sub-files with underscores and hyphens', async () => {
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });

    // Create files with various naming patterns
    fs.writeFileSync(path.join(agentDir, 'coding_standards.md'), '# Standards\nCoding rules.');
    fs.writeFileSync(path.join(agentDir, 'best-practices.md'), '# Best Practices\nDo this.');

    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');

    const index = await loadIndex({ basePath: tempDir });
    const reminderNodes = index.memories.filter(m => m.type === MemoryType.Reminder);

    // Verify IDs are normalised
    expect(reminderNodes.some(n => n.id === 'reminder-project-test-agent-coding-standards')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-test-agent-best-practices')).toBe(true);
  });

  it('should discover sub-files from multiple agents', async () => {
    // Create multiple agents, each with sub-files
    const agents = [
      { name: 'rust-expert', files: ['patterns.md', 'safety.md'] },
      { name: 'go-guru', files: ['concurrency.md', 'idioms.md'] },
    ];

    for (const agent of agents) {
      const agentDir = path.join(tempDir, '.claude', 'agent-memory', agent.name);
      fs.mkdirSync(agentDir, { recursive: true });

      for (const file of agent.files) {
        fs.writeFileSync(path.join(agentDir, file), `# ${file}\nContent for ${file}`);
      }
    }

    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalReminderNodes).toBe(4);

    const index = await loadIndex({ basePath: tempDir });
    const reminderNodes = index.memories.filter(m => m.type === MemoryType.Reminder);

    // Verify all sub-files were discovered
    expect(reminderNodes.some(n => n.id === 'reminder-project-rust-expert-patterns')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-rust-expert-safety')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-go-guru-concurrency')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-go-guru-idioms')).toBe(true);
  });
});
