/**
 * T021: Integration test for index rebuild from filesystem
 *
 * Tests the ability to rebuild the index.json from memory files on disk.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { rebuildIndex, loadIndex } from '../../skills/memory/src/core/index.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

describe('Index rebuild integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-index-rebuild-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should rebuild index from existing memory files', async () => {
    // Create some memories
    await writeMemory({
      title: 'First Memory',
      type: MemoryType.Decision,
      content: 'First content',
      tags: ['first'],
      scope: Scope.Global,
      basePath: testDir,
    });

    await writeMemory({
      title: 'Second Memory',
      type: MemoryType.Learning,
      content: 'Second content',
      tags: ['second'],
      scope: Scope.Global,
      basePath: testDir,
    });

    // Verify index exists with 2 entries
    const indexPath = path.join(testDir, 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    let index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.entries).toHaveLength(2);

    // Delete the index file
    fs.unlinkSync(indexPath);
    expect(fs.existsSync(indexPath)).toBe(false);

    // Rebuild index
    const rebuildResult = await rebuildIndex({ basePath: testDir });
    expect(rebuildResult.status).toBe('success');
    expect(rebuildResult.entriesCount).toBe(2);

    // Verify index is restored
    expect(fs.existsSync(indexPath)).toBe(true);
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.entries).toHaveLength(2);

    // Verify list still works
    const listResult = await listMemories({ basePath: testDir });
    expect(listResult.status).toBe('success');
    expect(listResult.memories).toHaveLength(2);
  });

  it('should handle corrupted index by rebuilding', async () => {
    // Create a memory
    await writeMemory({
      title: 'Valid Memory',
      type: MemoryType.Artifact,
      content: 'Valid content',
      tags: ['valid'],
      scope: Scope.Global,
      basePath: testDir,
    });

    // Corrupt the index
    const indexPath = path.join(testDir, 'index.json');
    fs.writeFileSync(indexPath, 'invalid json{{{');

    // Rebuild should fix it
    const rebuildResult = await rebuildIndex({ basePath: testDir });
    expect(rebuildResult.status).toBe('success');

    // Verify index is valid again
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.entries).toHaveLength(1);
  });

  it('should detect orphaned index entries', async () => {
    // Create memories
    const result1 = await writeMemory({
      title: 'Keep This',
      type: MemoryType.Decision,
      content: 'Keep content',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    });

    const result2 = await writeMemory({
      title: 'Delete This',
      type: MemoryType.Learning,
      content: 'Delete content',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    });

    // Manually delete the second memory file (simulating external deletion)
    const filePath = result2.memory?.filePath ?? '';
    fs.unlinkSync(filePath);

    // Rebuild should detect orphan and clean up
    const rebuildResult = await rebuildIndex({ basePath: testDir });
    expect(rebuildResult.status).toBe('success');
    expect(rebuildResult.entriesCount).toBe(1);
    expect(rebuildResult.orphansRemoved).toBe(1);

    // Verify index only has the valid memory
    const index = await loadIndex({ basePath: testDir });
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0].id).toBe(result1.memory?.id);
  });

  it('should discover unindexed memory files', async () => {
    // Create a memory normally
    await writeMemory({
      title: 'Indexed Memory',
      type: MemoryType.Decision,
      content: 'Indexed content',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    });

    // Manually create a memory file without updating index
    const unindexedContent = `---
id: learning-unindexed-memory
title: Unindexed Memory
type: learning
scope: global
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags: []
---

# Unindexed Memory

This was added manually without updating the index.
`;
    const unindexedPath = path.join(testDir, 'learning-unindexed-memory.md');
    fs.writeFileSync(unindexedPath, unindexedContent);

    // Rebuild should discover it
    const rebuildResult = await rebuildIndex({ basePath: testDir });
    expect(rebuildResult.status).toBe('success');
    expect(rebuildResult.entriesCount).toBe(2);
    expect(rebuildResult.newEntriesAdded).toBe(1);

    // Verify both are in index
    const index = await loadIndex({ basePath: testDir });
    expect(index.entries).toHaveLength(2);
  });

  it('should preserve metadata during rebuild', async () => {
    // Create memory with rich metadata
    await writeMemory({
      title: 'Rich Metadata',
      type: MemoryType.Gotcha,
      content: 'Rich content',
      tags: ['important', 'warning'],
      scope: Scope.Global,
      basePath: testDir,
      severity: 'high',
      links: ['related-decision'],
    });

    // Get original index
    const indexPath = path.join(testDir, 'index.json');
    const originalIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const originalEntry = originalIndex.entries[0];

    // Delete and rebuild
    fs.unlinkSync(indexPath);
    await rebuildIndex({ basePath: testDir });

    // Verify metadata preserved
    const newIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const newEntry = newIndex.entries[0];

    expect(newEntry.id).toBe(originalEntry.id);
    expect(newEntry.title).toBe(originalEntry.title);
    expect(newEntry.type).toBe(originalEntry.type);
    expect(newEntry.tags).toEqual(originalEntry.tags);
  });

  it('should handle empty directory gracefully', async () => {
    // No memories created - just rebuild empty
    const rebuildResult = await rebuildIndex({ basePath: testDir });

    expect(rebuildResult.status).toBe('success');
    expect(rebuildResult.entriesCount).toBe(0);

    // Index should exist but be empty
    const indexPath = path.join(testDir, 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    expect(index.entries).toHaveLength(0);
  });

  it('should rebuild with correct timestamps', async () => {
    // Create memory
    const writeResult = await writeMemory({
      title: 'Timestamp Test',
      type: MemoryType.Learning,
      content: 'Test content',
      tags: [],
      scope: Scope.Global,
      basePath: testDir,
    });

    const originalId = writeResult.memory?.id ?? '';

    // Wait a moment and rebuild
    await new Promise(resolve => setTimeout(resolve, 10));

    const indexPath = path.join(testDir, 'index.json');
    fs.unlinkSync(indexPath);

    await rebuildIndex({ basePath: testDir });

    // Verify entry uses file's creation time, not rebuild time
    const index = await loadIndex({ basePath: testDir });
    const entry = index.entries.find(e => e.id === originalId);
    expect(entry).toBeDefined();
    expect(new Date(entry!.created).getTime()).toBeLessThan(Date.now());
  });
});
