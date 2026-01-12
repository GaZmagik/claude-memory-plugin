/**
 * Integration tests for export/import operations
 *
 * Tests the full round-trip of exporting and importing memories.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  writeMemory,
  exportMemories,
  importMemories,
  loadIndex,
  loadGraph,
  linkMemories,
  MemoryType,
  Scope,
} from '../../src/index.js';

describe('Export/Import Integration', () => {
  let sourceDir: string;
  let targetDir: string;

  beforeEach(() => {
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-source-'));
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-target-'));
    fs.mkdirSync(path.join(sourceDir, 'permanent'), { recursive: true });
    fs.mkdirSync(path.join(targetDir, 'permanent'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(sourceDir, { recursive: true, force: true });
    fs.rmSync(targetDir, { recursive: true, force: true });
  });

  it('should export and import memories (JSON round-trip)', async () => {
    // Create test memories in source
    const result1 = await writeMemory({
      type: MemoryType.Decision,
      title: 'Auth Decision',
      content: 'Use JWT for authentication',
      scope: Scope.Global,
      tags: ['auth', 'security'],
      basePath: sourceDir,
    });

    const result2 = await writeMemory({
      type: MemoryType.Learning,
      title: 'TDD Learning',
      content: 'Always write tests first',
      scope: Scope.Global,
      tags: ['testing'],
      basePath: sourceDir,
    });

    // Create a link between them
    await linkMemories({
      source: result1.memory!.id,
      target: result2.memory!.id,
      relation: 'relates-to',
      basePath: sourceDir,
    });

    // Export with graph
    const exportResult = await exportMemories({
      format: 'json',
      includeGraph: true,
      basePath: sourceDir,
    });

    expect(exportResult.status).toBe('success');
    expect(exportResult.count).toBe(2);
    expect(exportResult.data?.graph?.edges).toHaveLength(1);

    // Import to target
    const importResult = await importMemories({
      data: exportResult.data!,
      basePath: targetDir,
    });

    expect(importResult.status).toBe('success');
    expect(importResult.importedCount).toBe(2);

    // Verify memories in target
    const targetIndex = await loadIndex({ basePath: targetDir });
    expect(targetIndex.memories).toHaveLength(2);

    // Verify graph in target
    const targetGraph = await loadGraph(targetDir);
    expect(targetGraph.edges).toHaveLength(1);
  });

  it('should handle merge strategy for existing memories', async () => {
    // Create memory in both source and target
    await writeMemory({
      type: MemoryType.Decision,
      title: 'Same Decision',
      content: 'Original content',
      scope: Scope.Global,
      tags: [],
      basePath: targetDir,
    });

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    await writeMemory({
      type: MemoryType.Decision,
      title: 'Same Decision',
      content: 'Updated content',
      scope: Scope.Global,
      tags: [],
      basePath: sourceDir,
    });

    // Export from source
    const exportResult = await exportMemories({
      format: 'json',
      basePath: sourceDir,
    });

    // Import with merge strategy
    const importResult = await importMemories({
      data: exportResult.data!,
      strategy: 'merge',
      basePath: targetDir,
    });

    expect(importResult.status).toBe('success');
    // The import should merge (newer wins)
    expect(importResult.mergedCount! + importResult.skippedCount!).toBe(1);
  });

  it('should support skip strategy', async () => {
    // Create memory in target first
    await writeMemory({
      type: MemoryType.Decision,
      title: 'Existing Decision',
      content: 'Original content',
      scope: Scope.Global,
      tags: [],
      basePath: targetDir,
    });

    // Create memory with same ID pattern in source
    await writeMemory({
      type: MemoryType.Decision,
      title: 'Existing Decision',
      content: 'New content',
      scope: Scope.Global,
      tags: [],
      basePath: sourceDir,
    });

    const exportResult = await exportMemories({
      format: 'json',
      basePath: sourceDir,
    });

    // Import with skip strategy
    const importResult = await importMemories({
      data: exportResult.data!,
      strategy: 'skip',
      basePath: targetDir,
    });

    expect(importResult.status).toBe('success');
    expect(importResult.skippedCount).toBe(1);
    expect(importResult.importedCount).toBe(0);
  });

  it('should export as YAML', async () => {
    await writeMemory({
      type: MemoryType.Decision,
      title: 'Test Decision',
      content: 'Test content',
      scope: Scope.Global,
      tags: ['test'],
      basePath: sourceDir,
    });

    const result = await exportMemories({
      format: 'yaml',
      basePath: sourceDir,
    });

    expect(result.status).toBe('success');
    expect(result.serialised).toContain('version:');
    expect(result.serialised).toContain('memories:');
    expect(result.serialised).toContain('- id:');
  });

  it('should support dry run for import', async () => {
    await writeMemory({
      type: MemoryType.Decision,
      title: 'Test Decision',
      content: 'Test content',
      scope: Scope.Global,
      tags: [],
      basePath: sourceDir,
    });

    const exportResult = await exportMemories({
      format: 'json',
      basePath: sourceDir,
    });

    const importResult = await importMemories({
      data: exportResult.data!,
      dryRun: true,
      basePath: targetDir,
    });

    expect(importResult.status).toBe('success');
    expect(importResult.dryRun).toBe(true);
    expect(importResult.importedCount).toBe(1);

    // Verify nothing was actually imported
    const targetIndex = await loadIndex({ basePath: targetDir });
    expect(targetIndex.memories).toHaveLength(0);
  });
});
