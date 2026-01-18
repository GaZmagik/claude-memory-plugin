/**
 * Maintenance Operations Integrity Tests
 *
 * Tests that rename, promote, archive maintain referential integrity
 * across graph edges and index entries.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { linkMemories } from '../../skills/memory/src/graph/link.js';
import { loadGraph } from '../../skills/memory/src/graph/structure.js';
import { loadIndex } from '../../skills/memory/src/core/index.js';
import { renameMemory } from '../../skills/memory/src/maintenance/rename.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';

describe('Maintenance Operations Integrity', () => {
  let tempDir: string;
  let basePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maintenance-test-'));
    basePath = path.join(tempDir, '.claude', 'memory');
    fs.mkdirSync(path.join(basePath, 'permanent'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Rename Operation', () => {
    it('should update graph edges when renaming a linked memory', async () => {
      // Create three memories: A -> B -> C
      const memA = await writeMemory({
        type: MemoryType.Learning,
        title: 'Memory A',
        content: 'First memory',
        tags: ['chain'],
        scope: Scope.Local,
        basePath,
      });

      const memB = await writeMemory({
        type: MemoryType.Learning,
        title: 'Memory B (will be renamed)',
        content: 'Middle memory',
        tags: ['chain'],
        scope: Scope.Local,
        basePath,
      });

      const memC = await writeMemory({
        type: MemoryType.Learning,
        title: 'Memory C',
        content: 'Last memory',
        tags: ['chain'],
        scope: Scope.Local,
        basePath,
      });

      expect(memA.status).toBe('success');
      expect(memB.status).toBe('success');
      expect(memC.status).toBe('success');

      if (memA.status !== 'success' || !memA.memory) return;
      if (memB.status !== 'success' || !memB.memory) return;
      if (memC.status !== 'success' || !memC.memory) return;

      const idA = memA.memory.id;
      const idB = memB.memory.id;
      const idC = memC.memory.id;

      // Create links: A -> B -> C
      await linkMemories({ source: idA, target: idB, relation: 'leads-to', basePath });
      await linkMemories({ source: idB, target: idC, relation: 'leads-to', basePath });

      // Verify edges exist
      let graph = await loadGraph(basePath);
      expect(graph.edges.some(e => e.source === idA && e.target === idB)).toBe(true);
      expect(graph.edges.some(e => e.source === idB && e.target === idC)).toBe(true);

      // Rename B
      const renameResult = await renameMemory({
        oldId: idB,
        newId: 'learning-renamed-memory-b',
        basePath,
      });

      expect(renameResult.status).toBe('success');

      // Verify edges are updated
      graph = await loadGraph(basePath);

      // Old edges should NOT exist
      expect(graph.edges.some(e => e.source === idB || e.target === idB)).toBe(false);

      // New edges should exist with renamed ID
      expect(graph.edges.some(e => e.source === idA && e.target === 'learning-renamed-memory-b')).toBe(true);
      expect(graph.edges.some(e => e.source === 'learning-renamed-memory-b' && e.target === idC)).toBe(true);
    });

    it('should update index entry when renaming', async () => {
      const writeResult = await writeMemory({
        type: MemoryType.Decision,
        title: 'Index Update Test',
        content: 'Testing index updates',
        tags: ['index'],
        scope: Scope.Local,
        basePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const oldId = writeResult.memory.id;
      const newId = 'decision-renamed-index-test';

      // Rename
      await renameMemory({ oldId, newId, basePath });

      // Verify index
      const index = await loadIndex({ basePath });

      // Old ID should not be in index
      expect(index.memories.some(m => m.id === oldId)).toBe(false);

      // New ID should be in index with same metadata
      const newEntry = index.memories.find(m => m.id === newId);
      expect(newEntry).toBeDefined();
      expect(newEntry?.title).toBe('Index Update Test');
    });

    it('should update filesystem when renaming', async () => {
      const writeResult = await writeMemory({
        type: MemoryType.Artifact,
        title: 'File Rename Test',
        content: 'Testing file renaming',
        tags: ['filesystem'],
        scope: Scope.Local,
        basePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const oldId = writeResult.memory.id;
      const newId = 'artifact-renamed-file-test';
      const oldPath = path.join(basePath, 'permanent', `${oldId}.md`);
      const newPath = path.join(basePath, 'permanent', `${newId}.md`);

      // Verify old file exists
      expect(fs.existsSync(oldPath)).toBe(true);

      // Rename
      await renameMemory({ oldId, newId, basePath });

      // Old file should not exist
      expect(fs.existsSync(oldPath)).toBe(false);

      // New file should exist
      expect(fs.existsSync(newPath)).toBe(true);
    });
  });

  describe('Linked Memory Operations', () => {
    it('should handle deletion of linked memory gracefully', async () => {
      // Create A -> B link
      const memA = await writeMemory({
        type: MemoryType.Learning,
        title: 'Source Memory',
        content: 'Links to another',
        tags: ['link'],
        scope: Scope.Local,
        basePath,
      });

      const memB = await writeMemory({
        type: MemoryType.Learning,
        title: 'Target Memory',
        content: 'Linked from another',
        tags: ['link'],
        scope: Scope.Local,
        basePath,
      });

      expect(memA.status).toBe('success');
      expect(memB.status).toBe('success');
      if (memA.status !== 'success' || !memA.memory) return;
      if (memB.status !== 'success' || !memB.memory) return;

      const idA = memA.memory.id;
      const idB = memB.memory.id;

      await linkMemories({ source: idA, target: idB, relation: 'references', basePath });

      // Delete the target
      const deleteResult = await deleteMemory({ id: idB, basePath });
      expect(deleteResult.status).toBe('success');

      // Graph should have removed the edge
      const graph = await loadGraph(basePath);
      expect(graph.edges.some(e => e.target === idB)).toBe(false);

      // Source memory should still be readable
      const readResult = await readMemory({ id: idA, basePath });
      expect(readResult.status).toBe('success');
    });
  });
});
