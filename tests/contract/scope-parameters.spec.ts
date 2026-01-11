/**
 * T038: Contract test for scope parameter in all CRUD operations
 *
 * Tests that all CRUD operations properly accept and handle scope parameters.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { listMemories } from '../../skills/memory/src/core/list.js';
import { searchMemories } from '../../skills/memory/src/core/search.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { MemoryType, Scope } from '../../skills/memory/src/types/enums.js';

describe('Scope Parameters in CRUD Operations', () => {
  let testDir: string;
  let globalMemoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'scope-crud-'));
    globalMemoryDir = fs.mkdtempSync(path.join(tmpdir(), 'global-memory-'));
    // Create .git directory to simulate project context
    fs.mkdirSync(path.join(testDir, '.git'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.rmSync(globalMemoryDir, { recursive: true, force: true });
  });

  describe('writeMemory with scope', () => {
    it('should accept scope parameter', async () => {
      const result = await writeMemory({
        title: 'Global Memory',
        type: MemoryType.Decision,
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      expect(result.status).toBe('success');
      expect(result.memory?.scope).toBe(Scope.Global);
    });

    it('should write to correct path for project scope', async () => {
      const result = await writeMemory({
        title: 'Project Memory',
        type: MemoryType.Decision,
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Project,
        basePath: path.join(testDir, '.claude', 'memory'),
      });

      expect(result.status).toBe('success');
      // Verify file exists in project directory
      const files = fs.readdirSync(path.join(testDir, '.claude', 'memory'));
      expect(files.some(f => f.endsWith('.md'))).toBe(true);
    });

    it('should write to correct path for local scope', async () => {
      const localPath = path.join(testDir, '.claude', 'memory', 'local');
      fs.mkdirSync(localPath, { recursive: true });

      const result = await writeMemory({
        title: 'Local Memory',
        type: MemoryType.Learning,
        content: 'Private content',
        tags: ['private'],
        scope: Scope.Local,
        basePath: localPath,
      });

      expect(result.status).toBe('success');
      // Verify file exists in local directory
      const files = fs.readdirSync(localPath);
      expect(files.some(f => f.endsWith('.md'))).toBe(true);
    });

    it('should include scope in memory frontmatter', async () => {
      const result = await writeMemory({
        title: 'Scoped Memory',
        type: MemoryType.Decision,
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Project,
        basePath: testDir,
      });

      expect(result.status).toBe('success');

      // Read the file and verify scope in frontmatter
      const filePath = result.memory?.filePath;
      if (filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain('scope: project');
      }
    });
  });

  describe('readMemory with scope', () => {
    it('should read memory from specified scope', async () => {
      // First create a memory
      const writeResult = await writeMemory({
        title: 'Read Test',
        type: MemoryType.Decision,
        content: 'Content to read',
        tags: ['test'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      expect(writeResult.status).toBe('success');
      const memoryId = writeResult.memory?.id ?? '';

      // Read it back with scope
      const readResult = await readMemory({
        id: memoryId,
        basePath: globalMemoryDir,
        scope: Scope.Global,
      });

      expect(readResult.status).toBe('success');
      expect(readResult.memory?.frontmatter.title).toBe('Read Test');
    });
  });

  describe('listMemories with scope', () => {
    it('should filter by scope when specified', async () => {
      // Create memories at different scopes (simulated with different basePaths)
      await writeMemory({
        title: 'Global Memory',
        type: MemoryType.Decision,
        content: 'Global content',
        tags: ['test'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      const projectPath = path.join(testDir, '.claude', 'memory');
      fs.mkdirSync(projectPath, { recursive: true });

      await writeMemory({
        title: 'Project Memory',
        type: MemoryType.Decision,
        content: 'Project content',
        tags: ['test'],
        scope: Scope.Project,
        basePath: projectPath,
      });

      // List global only
      const globalResult = await listMemories({
        basePath: globalMemoryDir,
        scope: Scope.Global,
      });

      expect(globalResult.status).toBe('success');
      expect(globalResult.memories?.every(m => m.scope === Scope.Global)).toBe(true);
    });

    it('should return scope indicator with each memory', async () => {
      await writeMemory({
        title: 'Test Memory',
        type: MemoryType.Decision,
        content: 'Test content',
        tags: ['test'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      const result = await listMemories({
        basePath: globalMemoryDir,
      });

      expect(result.status).toBe('success');
      expect(result.memories?.[0]?.scope).toBeDefined();
    });
  });

  describe('searchMemories with scope', () => {
    it('should search within specified scope', async () => {
      await writeMemory({
        title: 'Searchable Memory',
        type: MemoryType.Decision,
        content: 'Unique search term alpha',
        tags: ['search'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      const result = await searchMemories({
        query: 'alpha',
        basePath: globalMemoryDir,
        scope: Scope.Global,
      });

      expect(result.status).toBe('success');
      expect(result.results?.length).toBeGreaterThan(0);
    });

    it('should include scope in search results', async () => {
      await writeMemory({
        title: 'Search Result',
        type: MemoryType.Decision,
        content: 'Content with beta keyword',
        tags: ['search'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      const result = await searchMemories({
        query: 'beta',
        basePath: globalMemoryDir,
      });

      expect(result.status).toBe('success');
      expect(result.results?.[0]?.scope).toBeDefined();
    });
  });

  describe('deleteMemory with scope', () => {
    it('should delete from specified scope', async () => {
      // Create a memory
      const writeResult = await writeMemory({
        title: 'To Delete',
        type: MemoryType.Decision,
        content: 'Will be deleted',
        tags: ['delete'],
        scope: Scope.Global,
        basePath: globalMemoryDir,
      });

      const memoryId = writeResult.memory?.id ?? '';

      // Delete it
      const deleteResult = await deleteMemory({
        id: memoryId,
        basePath: globalMemoryDir,
        scope: Scope.Global,
      });

      expect(deleteResult.status).toBe('success');

      // Verify it's gone
      const readResult = await readMemory({
        id: memoryId,
        basePath: globalMemoryDir,
      });

      expect(readResult.status).toBe('error');
    });
  });
});
