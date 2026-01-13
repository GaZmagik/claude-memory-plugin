/**
 * Cross-Scope Consistency Tests
 *
 * Tests that operations maintain correct behaviour when moving
 * memories between scopes or when scopes have conflicts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { moveMemory } from '../../skills/memory/src/maintenance/move.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';

describe('Cross-Scope Consistency', () => {
  let tempDir: string;
  let projectBasePath: string;
  let globalBasePath: string;
  let localBasePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-test-'));

    // Set up multiple scope directories
    projectBasePath = path.join(tempDir, 'project', '.claude', 'memory');
    globalBasePath = path.join(tempDir, 'global', '.claude', 'memory');
    localBasePath = path.join(tempDir, 'local', '.claude', 'memory');

    for (const bp of [projectBasePath, globalBasePath, localBasePath]) {
      fs.mkdirSync(path.join(bp, 'permanent'), { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Move Operations', () => {
    it('should not find memory in source scope after move', async () => {
      // Create in project scope
      const writeResult = await writeMemory({
        type: MemoryType.Learning,
        title: 'Will Be Moved',
        content: 'This memory will move scopes',
        tags: ['move-test'],
        scope: Scope.Project,
        basePath: projectBasePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const memoryId = writeResult.memory.id;

      // Verify it exists in project scope
      const beforeList = await listMemories({ basePath: projectBasePath });
      expect(beforeList.status).toBe('success');
      if (beforeList.status === 'success' && beforeList.memories) {
        expect(beforeList.memories.some(m => m.id === memoryId)).toBe(true);
      }

      // Move to global scope
      const moveResult = await moveMemory({
        id: memoryId,
        sourceBasePath: projectBasePath,
        targetBasePath: globalBasePath,
        targetScope: Scope.Global,
      });

      expect(moveResult.status).toBe('success');

      // Verify NOT in project scope anymore
      const afterProjectList = await listMemories({ basePath: projectBasePath });
      expect(afterProjectList.status).toBe('success');
      if (afterProjectList.status === 'success' && afterProjectList.memories) {
        expect(afterProjectList.memories.some(m => m.id === memoryId)).toBe(false);
      }

      // Verify IS in global scope
      const afterGlobalList = await listMemories({ basePath: globalBasePath });
      expect(afterGlobalList.status).toBe('success');
      if (afterGlobalList.status === 'success' && afterGlobalList.memories) {
        expect(afterGlobalList.memories.some(m => m.id === memoryId)).toBe(true);
      }
    });

    it('should preserve memory content after move', async () => {
      const originalContent = 'This content must survive the move intact';
      const originalTags = ['preserve', 'content', 'test'];

      const writeResult = await writeMemory({
        type: MemoryType.Decision,
        title: 'Content Preservation Test',
        content: originalContent,
        tags: originalTags,
        scope: Scope.Project,
        basePath: projectBasePath,
      });

      expect(writeResult.status).toBe('success');
      if (writeResult.status !== 'success' || !writeResult.memory) return;

      const memoryId = writeResult.memory.id;

      await moveMemory({
        id: memoryId,
        sourceBasePath: projectBasePath,
        targetBasePath: globalBasePath,
        targetScope: Scope.Global,
      });

      // Read from new location
      const readResult = await readMemory({ id: memoryId, basePath: globalBasePath });
      expect(readResult.status).toBe('success');
      if (readResult.status !== 'success') return;

      expect(readResult.memory?.content).toBe(originalContent);
      // Tags should contain original tags (move may add scope tag)
      for (const tag of originalTags) {
        expect(readResult.memory?.frontmatter.tags).toContain(tag);
      }
    });
  });

  describe('Scope Isolation', () => {
    it('should keep memories isolated between scopes', async () => {
      // Create different memories in different scopes
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Project Memory',
        content: 'Lives in project scope',
        tags: ['project'],
        scope: Scope.Project,
        basePath: projectBasePath,
      });

      await writeMemory({
        type: MemoryType.Learning,
        title: 'Global Memory',
        content: 'Lives in global scope',
        tags: ['global'],
        scope: Scope.Global,
        basePath: globalBasePath,
      });

      // List project scope - should only see project memory
      const projectList = await listMemories({ basePath: projectBasePath });
      expect(projectList.status).toBe('success');
      if (projectList.status === 'success') {
        const projectMemories = projectList.memories ?? [];
        expect(projectMemories.every(m => m.scope === Scope.Project)).toBe(true);
        expect(projectMemories.some(m => m.title === 'Project Memory')).toBe(true);
        expect(projectMemories.some(m => m.title === 'Global Memory')).toBe(false);
      }

      // List global scope - should only see global memory
      const globalList = await listMemories({ basePath: globalBasePath });
      expect(globalList.status).toBe('success');
      if (globalList.status === 'success') {
        const globalMemories = globalList.memories ?? [];
        expect(globalMemories.every(m => m.scope === Scope.Global)).toBe(true);
        expect(globalMemories.some(m => m.title === 'Global Memory')).toBe(true);
        expect(globalMemories.some(m => m.title === 'Project Memory')).toBe(false);
      }
    });
  });
});
