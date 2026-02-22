/**
 * T139: Integration test for agent MEMORY.md discovery and search
 *
 * Verifies that agent MEMORY.md files are discovered, indexed as reminder nodes,
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

describe('T139: Agent MEMORY.md discovery and indexing', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should discover and index agent MEMORY.md as reminder node', async () => {
    // Create agent MEMORY.md file
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'typescript-expert');
    fs.mkdirSync(agentDir, { recursive: true });

    const memoryContent = `# TypeScript Expert Memory

## Key Patterns
- Always use strict mode
- Prefer type inference over explicit types
- Use discriminated unions for state management

## Common Gotchas
- avoid using 'any' type
- Remember to enable strictNullChecks`;

    const memoryPath = path.join(agentDir, 'MEMORY.md');
    fs.writeFileSync(memoryPath, memoryContent);

    // Run sync to discover and index the MEMORY.md file
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalReminderNodes).toBe(1);
    expect(syncResult.changes.externalNodesAdded.length).toBe(1);
    expect(syncResult.changes.externalNodesAdded[0]).toBe('reminder-project-typescript-expert-memory');

    // Load the index to verify the reminder node details
    const index = await loadIndex({ basePath: tempDir });
    const reminderNode = index.memories.find(
      m => m.type === MemoryType.Reminder && m.id === 'reminder-project-typescript-expert-memory'
    );

    expect(reminderNode).toBeDefined();
    expect(reminderNode?.type).toBe(MemoryType.Reminder);
    expect(reminderNode?.title).toContain('typescript-expert');
    expect(reminderNode?.externalFileKind).toBe('agent-memory-summary');
    expect(reminderNode?.externalPath).toBe(memoryPath);

    // Verify content is accessible via read
    const readResult = await readMemory({
      id: 'reminder-project-typescript-expert-memory',
      basePath: tempDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('TypeScript Expert Memory');
    expect(readResult.memory?.content).toContain('strict mode');
    expect(readResult.memory?.frontmatter.type).toBe(MemoryType.Reminder);
  });

  it('should discover MEMORY.md files from multiple agents', async () => {
    // Create multiple agent directories with MEMORY.md files
    const agents = ['typescript-expert', 'python-guru', 'rust-wizard'];

    for (const agent of agents) {
      const agentDir = path.join(tempDir, '.claude', 'agent-memory', agent);
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(
        path.join(agentDir, 'MEMORY.md'),
        `# ${agent} Memory\n\nAgent-specific knowledge.`
      );
    }

    // Sync to discover all MEMORY.md files
    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalReminderNodes).toBe(3);
    expect(syncResult.changes.externalNodesAdded.length).toBe(3);

    // Verify all reminder nodes are in the index
    const index = await loadIndex({ basePath: tempDir });
    const reminderNodes = index.memories.filter(m => m.type === MemoryType.Reminder);

    expect(reminderNodes.length).toBe(3);
    expect(reminderNodes.some(n => n.id === 'reminder-project-typescript-expert-memory')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-python-guru-memory')).toBe(true);
    expect(reminderNodes.some(n => n.id === 'reminder-project-rust-wizard-memory')).toBe(true);

    // Verify all have correct externalFileKind
    reminderNodes.forEach(node => {
      expect(node.externalFileKind).toBe('agent-memory-summary');
    });
  });

  it('should handle agent names with hyphens and special characters', async () => {
    // Create agent with hyphenated name
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'api-design-expert');
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'MEMORY.md'),
      '# API Design Expert\n\nRESTful best practices.'
    );

    const syncResult = await syncMemories({ basePath: tempDir });

    expect(syncResult.status).toBe('success');
    expect(syncResult.summary.externalReminderNodes).toBe(1);

    const index = await loadIndex({ basePath: tempDir });
    const reminderNode = index.memories.find(m => m.type === MemoryType.Reminder);

    expect(reminderNode?.id).toBe('reminder-project-api-design-expert-memory');
  });

  it('should update reminder node when MEMORY.md content changes', async () => {
    const agentDir = path.join(tempDir, '.claude', 'agent-memory', 'test-agent');
    fs.mkdirSync(agentDir, { recursive: true });
    const memoryPath = path.join(agentDir, 'MEMORY.md');

    // Create initial MEMORY.md
    fs.writeFileSync(memoryPath, '# Original Memory\n\nOld knowledge.');
    await syncMemories({ basePath: tempDir });

    // Verify initial content
    let readResult = await readMemory({
      id: 'reminder-project-test-agent-memory',
      basePath: tempDir,
    });
    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('Old knowledge');

    // Modify MEMORY.md
    fs.writeFileSync(memoryPath, '# Updated Memory\n\nNew insights and patterns.');

    // Sync again to detect changes
    const syncResult = await syncMemories({ basePath: tempDir });
    expect(syncResult.status).toBe('success');

    // Verify updated content is accessible
    readResult = await readMemory({
      id: 'reminder-project-test-agent-memory',
      basePath: tempDir,
    });

    expect(readResult.status).toBe('success');
    expect(readResult.memory?.content).toContain('New insights');
    expect(readResult.memory?.content).not.toContain('Old knowledge');
  });
});
