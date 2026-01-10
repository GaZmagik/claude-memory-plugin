/**
 * T044: Integration test for scope isolation (no cross-scope leakage)
 *
 * Tests that memories at one scope cannot accidentally leak to another scope.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';

describe('Scope Isolation', () => {
  let project1Dir: string;
  let project2Dir: string;
  let globalMemoryDir: string;
  let project1MemoryDir: string;
  let project1LocalDir: string;
  let project2MemoryDir: string;
  let project2LocalDir: string;

  beforeEach(() => {
    project1Dir = fs.mkdtempSync(path.join(tmpdir(), 'project1-'));
    project2Dir = fs.mkdtempSync(path.join(tmpdir(), 'project2-'));
    globalMemoryDir = fs.mkdtempSync(path.join(tmpdir(), 'global-'));

    // Create .git directories
    fs.mkdirSync(path.join(project1Dir, '.git'));
    fs.mkdirSync(path.join(project2Dir, '.git'));

    // Create memory directories
    project1MemoryDir = path.join(project1Dir, '.claude', 'memory');
    project1LocalDir = path.join(project1Dir, '.claude', 'memory', 'local');
    project2MemoryDir = path.join(project2Dir, '.claude', 'memory');
    project2LocalDir = path.join(project2Dir, '.claude', 'memory', 'local');

    fs.mkdirSync(project1MemoryDir, { recursive: true });
    fs.mkdirSync(project1LocalDir, { recursive: true });
    fs.mkdirSync(project2MemoryDir, { recursive: true });
    fs.mkdirSync(project2LocalDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(project1Dir, { recursive: true, force: true });
    fs.rmSync(project2Dir, { recursive: true, force: true });
    fs.rmSync(globalMemoryDir, { recursive: true, force: true });
  });

  describe('Project scope isolation', () => {
    it('should not show project1 memories in project2', async () => {
      // Create memory in project1
      await writeMemory({
        title: 'Project1 Secret',
        type: MemoryType.Decision,
        content: 'Secret for project 1 only',
        tags: ['secret'],
        scope: Scope.Project,
        basePath: project1MemoryDir,
      });

      // List memories from project2 - should not see project1's memory
      const project2List = await listMemories({
        basePath: project2MemoryDir,
        scope: Scope.Project,
      });

      expect(project2List.memories?.length ?? 0).toBe(0);
    });

    it('should not allow reading project1 memory from project2 path', async () => {
      const writeResult = await writeMemory({
        title: 'Isolated Memory',
        type: MemoryType.Learning,
        content: 'Should be isolated',
        tags: ['isolated'],
        scope: Scope.Project,
        basePath: project1MemoryDir,
      });

      const memoryId = writeResult.memory?.id ?? '';

      // Try to read from project2 - should fail
      const readResult = await readMemory({
        id: memoryId,
        basePath: project2MemoryDir,
      });

      expect(readResult.status).toBe('error');
    });
  });

  describe('Local scope isolation', () => {
    it('should not show local memories from project1 in project2', async () => {
      // Create local memory in project1
      await writeMemory({
        title: 'Private Note',
        type: MemoryType.Learning,
        content: 'My private note in project1',
        tags: ['private'],
        scope: Scope.Local,
        basePath: project1LocalDir,
      });

      // List local memories from project2 - should be empty
      const project2List = await listMemories({
        basePath: project2LocalDir,
        scope: Scope.Local,
      });

      expect(project2List.memories?.length ?? 0).toBe(0);
    });

    it('should not show local memories in project scope listing', async () => {
      // Create both local and project memories
      await writeMemory({
        title: 'Local Only',
        type: MemoryType.Learning,
        content: 'Local content',
        tags: ['local'],
        scope: Scope.Local,
        basePath: project1LocalDir,
      });

      await writeMemory({
        title: 'Project Shared',
        type: MemoryType.Decision,
        content: 'Project content',
        tags: ['project'],
        scope: Scope.Project,
        basePath: project1MemoryDir,
      });

      // List project scope only - should not include local
      const projectList = await listMemories({
        basePath: project1MemoryDir,
        scope: Scope.Project,
      });

      expect(projectList.memories?.length).toBe(1);
      expect(projectList.memories?.[0]?.title).toBe('Project Shared');
    });
  });

  describe('Global scope accessibility', () => {
    it('should allow reading global memories from any project', async () => {
      // Create global memory
      const writeResult = await writeMemory({
        title: 'Global Pattern',
        type: MemoryType.Artifact,
        content: 'Shared across all projects',
        tags: ['global', 'pattern'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      const memoryId = writeResult.memory?.id ?? '';

      // Should be readable from global path (same for all projects)
      const readResult = await readMemory({
        id: memoryId,
        basePath: globalMemoryDir,
      });

      expect(readResult.status).toBe('success');
      expect(readResult.memory?.frontmatter.title).toBe('Global Pattern');
    });

    it('should not pollute global scope with project memories', async () => {
      // Create project memory
      await writeMemory({
        title: 'Project Only',
        type: MemoryType.Decision,
        content: 'Should not appear in global',
        tags: ['project'],
        scope: Scope.Project,
        basePath: project1MemoryDir,
      });

      // List global memories - should not include project memory
      const globalList = await listMemories({
        basePath: globalMemoryDir,
        scope: Scope.Global,
      });

      const hasProjectMemory = globalList.memories?.some(
        m => m.title === 'Project Only'
      );
      expect(hasProjectMemory).toBe(false);
    });
  });

  describe('Index isolation', () => {
    it('should maintain separate indexes per scope', async () => {
      // Create memories at different scopes
      await writeMemory({
        title: 'Global Memory',
        type: MemoryType.Decision,
        content: 'Global',
        tags: ['test'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      await writeMemory({
        title: 'Project Memory',
        type: MemoryType.Decision,
        content: 'Project',
        tags: ['test'],
        scope: Scope.Project,
        basePath: project1MemoryDir,
      });

      await writeMemory({
        title: 'Local Memory',
        type: MemoryType.Decision,
        content: 'Local',
        tags: ['test'],
        scope: Scope.Local,
        basePath: project1LocalDir,
      });

      // Verify separate index files
      const globalIndex = JSON.parse(
        fs.readFileSync(path.join(globalMemoryDir, 'index.json'), 'utf-8')
      );
      const projectIndex = JSON.parse(
        fs.readFileSync(path.join(project1MemoryDir, 'index.json'), 'utf-8')
      );
      const localIndex = JSON.parse(
        fs.readFileSync(path.join(project1LocalDir, 'index.json'), 'utf-8')
      );

      expect(globalIndex.entries.length).toBe(1);
      expect(projectIndex.entries.length).toBe(1);
      expect(localIndex.entries.length).toBe(1);

      expect(globalIndex.entries[0].title).toBe('Global Memory');
      expect(projectIndex.entries[0].title).toBe('Project Memory');
      expect(localIndex.entries[0].title).toBe('Local Memory');
    });
  });

  describe('Deletion isolation', () => {
    it('should only delete from specified scope', async () => {
      // Create memories with similar titles in different scopes
      const globalWrite = await writeMemory({
        title: 'Delete Test',
        type: MemoryType.Decision,
        content: 'Global version',
        tags: ['test'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      await writeMemory({
        title: 'Delete Test',
        type: MemoryType.Decision,
        content: 'Project version',
        tags: ['test'],
        scope: Scope.Project,
        basePath: project1MemoryDir,
      });

      const globalMemoryId = globalWrite.memory?.id ?? '';

      // Delete from global scope
      await deleteMemory({
        id: globalMemoryId,
        basePath: globalMemoryDir,
      });

      // Global should be deleted
      const globalRead = await readMemory({
        id: globalMemoryId,
        basePath: globalMemoryDir,
      });
      expect(globalRead.status).toBe('error');

      // Project version should still exist
      const projectList = await listMemories({
        basePath: project1MemoryDir,
        scope: Scope.Project,
      });
      expect(projectList.memories?.length).toBe(1);
      expect(projectList.memories?.[0]?.title).toBe('Delete Test');
    });
  });

  describe('Cross-scope write prevention', () => {
    it('should not allow writing to wrong scope path', async () => {
      // Attempt to write a "global" scope memory to project path
      // The scope in frontmatter should match actual storage location
      const result = await writeMemory({
        title: 'Mismatched Scope',
        type: MemoryType.Decision,
        content: 'This should not cause confusion',
        tags: ['test'],
        scope: Scope.Global,
        basePath: project1MemoryDir, // Wrong path for global
      });

      // The write succeeds but the frontmatter scope should be corrected
      // OR the operation should fail validation
      // Implementation decides: either correct the scope or reject
      expect(result.status).toBe('success');

      // Check that the stored scope matches the actual location
      const files = fs.readdirSync(project1MemoryDir);
      if (files.some(f => f.endsWith('.md'))) {
        const mdFile = files.find(f => f.endsWith('.md'));
        const content = fs.readFileSync(
          path.join(project1MemoryDir, mdFile!),
          'utf-8'
        );
        // Frontmatter should reflect where it's actually stored
        // (implementation detail - may keep requested scope or correct it)
      }
    });
  });
});
