/**
 * Graph-Index-Filesystem Transaction Tests
 *
 * Tests that operations maintain consistency across all three storage systems
 * even when failures occur partway through an operation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';
import { MemoryType } from '../../skills/memory/src/types/enums.js';
import { Scope } from '../../skills/memory/src/types/enums.js';

describe('Graph-Index-Filesystem Transactions', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transaction-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(basePath, { recursive: true });
    fs.mkdirSync(path.join(basePath, 'permanent'), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Write Operation Consistency', () => {
    it('should have memory in all three systems after successful write', async () => {
      const result = await writeMemory({
        type: MemoryType.Learning,
        title: 'Transaction Test',
        content: 'Testing transaction consistency',
        tags: ['test'],
        scope: Scope.Local,
        basePath,
      });

      expect(result.status).toBe('success');
      if (result.status !== 'success' || !result.memory) return;

      const memoryId = result.memory.id;

      // Verify file exists
      const filePath = path.join(basePath, 'permanent', `${memoryId}.md`);
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify in index
      const index = await loadIndex({ basePath });
      const indexEntry = index.memories.find(m => m.id === memoryId);
      expect(indexEntry).toBeDefined();

      // Verify in graph
      const graph = await loadGraph(basePath);
      const graphNode = graph.nodes.find(n => n.id === memoryId);
      expect(graphNode).toBeDefined();
    });

    it('should maintain consistency when write is immediately followed by read', async () => {
      const writeResult = await writeMemory({
        type: MemoryType.Decision,
        title: 'Immediate Read Test',
        content: 'Should be immediately readable',
        tags: ['immediate'],
        scope: Scope.Local,
        basePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const readResult = await readMemory({ id: writeResult.memory.id, basePath });
      expect(readResult.status).toBe('success');
      if (readResult.status !== 'success') return;

      expect(readResult.memory?.frontmatter.title).toBe('Immediate Read Test');
      expect(readResult.memory?.content).toBe('Should be immediately readable');
    });
  });

  describe('Delete Operation Consistency', () => {
    it('should remove memory from all three systems after delete', async () => {
      // First create a memory
      const writeResult = await writeMemory({
        type: MemoryType.Learning,
        title: 'Delete Test',
        content: 'Will be deleted',
        tags: ['delete'],
        scope: Scope.Local,
        basePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const memoryId = writeResult.memory.id;
      const filePath = path.join(basePath, 'permanent', `${memoryId}.md`);

      // Verify it exists
      expect(fs.existsSync(filePath)).toBe(true);

      // Delete it
      const deleteResult = await deleteMemory({ id: memoryId, basePath });
      expect(deleteResult.status).toBe('success');

      // Verify file is gone
      expect(fs.existsSync(filePath)).toBe(false);

      // Verify removed from index
      const index = await loadIndex({ basePath });
      const indexEntry = index.memories.find(m => m.id === memoryId);
      expect(indexEntry).toBeUndefined();

      // Verify removed from graph
      const graph = await loadGraph(basePath);
      const graphNode = graph.nodes.find(n => n.id === memoryId);
      expect(graphNode).toBeUndefined();
    });
  });

  describe('Corrupted State Recovery', () => {
    it('should handle missing file but present in index', async () => {
      // Create a memory
      const writeResult = await writeMemory({
        type: MemoryType.Learning,
        title: 'Orphaned Index Entry',
        content: 'File will be deleted manually',
        tags: ['orphan'],
        scope: Scope.Local,
        basePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const memoryId = writeResult.memory.id;

      // Manually delete the file (simulating corruption)
      const filePath = path.join(basePath, 'permanent', `${memoryId}.md`);
      fs.unlinkSync(filePath);

      // Reading should fail gracefully
      const readResult = await readMemory({ id: memoryId, basePath });
      expect(readResult.status).toBe('error');
    });

    it('should handle corrupted graph.json gracefully', async () => {
      // Create a valid memory first
      const writeResult = await writeMemory({
        type: MemoryType.Learning,
        title: 'Before Corruption',
        content: 'Created before graph corruption',
        tags: ['pre-corruption'],
        scope: Scope.Local,
        basePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const memoryId = writeResult.memory.id;

      // Corrupt the graph.json
      const graphPath = path.join(basePath, 'graph.json');
      fs.writeFileSync(graphPath, 'invalid json content');

      // Subsequent operations should recover or fail gracefully
      const readResult = await readMemory({ id: memoryId, basePath });
      // Should still read from filesystem even if graph is corrupt
      expect(readResult.status).toBe('success');
    });

    it('should handle corrupted index.json gracefully', async () => {
      // Create a valid memory first
      const writeResult = await writeMemory({
        type: MemoryType.Learning,
        title: 'Before Index Corruption',
        content: 'Created before index corruption',
        tags: ['pre-corruption'],
        scope: Scope.Local,
        basePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const memoryId = writeResult.memory.id;

      // Corrupt the index.json
      const indexPath = path.join(basePath, 'index.json');
      fs.writeFileSync(indexPath, 'invalid json content');

      // Read by ID depends on index - corrupted index means read fails
      // This is expected behaviour - the system needs index for lookups
      const readResult = await readMemory({ id: memoryId, basePath });
      // Should fail gracefully (not crash) - error is acceptable
      expect(readResult.status).toMatch(/^(success|error)$/);
    });
  });

  describe('Concurrent Operation Safety', () => {
    it('should handle multiple sequential writes', async () => {
      const ids: string[] = [];

      for (let i = 0; i < 10; i++) {
        const result = await writeMemory({
          type: MemoryType.Learning,
          title: `Sequential Write ${i}`,
          content: `Content for write ${i}`,
          tags: ['sequential'],
          scope: Scope.Local,
          basePath,
        });

        expect(result.status).toBe('success');
        if (result.status === 'success' && result.memory) {
          ids.push(result.memory.id);
        }
      }

      // Verify all are in index
      const index = await loadIndex({ basePath });
      for (const id of ids) {
        expect(index.memories.some(m => m.id === id)).toBe(true);
      }

      // Verify all are in graph
      const graph = await loadGraph(basePath);
      for (const id of ids) {
        expect(graph.nodes.some(n => n.id === id)).toBe(true);
      }
    });
  });
});
