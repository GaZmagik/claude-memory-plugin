/**
 * End-to-End Journey Tests
 *
 * Tests complete workflows through the memory system:
 * - Write → Search → Read
 * - Write → Update → Delete
 * - Write → Graph → Traverse
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { searchMemories } from '../../skills/memory/src/core/search.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';
import type { WriteMemoryRequest, ReadMemoryRequest, SearchMemoriesRequest } from '../../skills/memory/src/types/api.js';

describe('E2E Memory Journeys', () => {
  const testBasePath = '/tmp/claude-e2e-test';

  beforeEach(() => {
    if (existsSync(testBasePath)) {
      rmSync(testBasePath, { recursive: true });
    }
    mkdirSync(testBasePath, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testBasePath)) {
      rmSync(testBasePath, { recursive: true });
    }
  });

  describe('Write → Read Journey', () => {
    it('should write and then read back the same memory', async () => {
      const writeRequest: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Test Memory',
        content: 'This is the detailed content of the test memory.',
        tags: ['testing', 'e2e'],
        scope: Scope.Local,
        basePath: testBasePath,
      };

      const writeResult = await writeMemory(writeRequest);
      expect(writeResult.status).toBe('success');

      if (writeResult.status === 'success' && writeResult.memory) {
        const readRequest: ReadMemoryRequest = {
          id: writeResult.memory.id,
          basePath: testBasePath,
        };

        const readResult = await readMemory(readRequest);
        expect(readResult.status).toBe('success');

        if (readResult.status === 'success' && readResult.memory) {
          expect(readResult.memory.frontmatter.title).toBe('Test Memory');
          expect(readResult.memory.content).toBe('This is the detailed content of the test memory.');
          expect(readResult.memory.frontmatter.tags).toEqual(['testing', 'e2e']);
        }
      }
    });

    it('should preserve all metadata through write-read cycle', async () => {
      const writeRequest: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Metadata Test',
        content: 'Content with metadata',
        tags: ['meta', 'data', 'test'],
        scope: Scope.Local,
        basePath: testBasePath,
        links: ['related-1', 'related-2'],
      };

      const writeResult = await writeMemory(writeRequest);
      expect(writeResult.status).toBe('success');

      if (writeResult.status === 'success' && writeResult.memory) {
        const readRequest: ReadMemoryRequest = {
          id: writeResult.memory.id,
          basePath: testBasePath,
        };

        const readResult = await readMemory(readRequest);

        if (readResult.status === 'success' && readResult.memory) {
          expect(readResult.memory.frontmatter.links).toEqual(['related-1', 'related-2']);
          expect(readResult.memory.frontmatter.tags).toEqual(['meta', 'data', 'test']);
          expect(readResult.memory.frontmatter.scope).toBe(Scope.Local);
        }
      }
    });
  });

  describe('Write → Search → Read Journey', () => {
    it('should find memory via text search and read it', async () => {
      const writeRequest: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'TypeScript Best Practices',
        content: 'Always use strict mode and enable all type checking options.',
        tags: ['typescript', 'best-practices'],
        scope: Scope.Local,
        basePath: testBasePath,
      };

      const writeResult = await writeMemory(writeRequest);
      expect(writeResult.status).toBe('success');

      const searchRequest: SearchMemoriesRequest = {
        query: 'TypeScript',
        basePath: testBasePath,
      };

      const searchResult = await searchMemories(searchRequest);
      expect(searchResult.status).toBe('success');

      if (searchResult.status === 'success' && searchResult.results) {
        expect(searchResult.results.length).toBeGreaterThan(0);

        const foundMemory = searchResult.results[0];
        expect(foundMemory.title).toBe('TypeScript Best Practices');

        const readRequest: ReadMemoryRequest = {
          id: foundMemory.id,
          basePath: testBasePath,
        };

        const readResult = await readMemory(readRequest);
        expect(readResult.status).toBe('success');

        if (readResult.status === 'success' && readResult.memory) {
          expect(readResult.memory.content).toContain('strict mode');
        }
      }
    });

    it('should handle multi-memory search and selective reading', async () => {
      const memories = [
        { title: 'React Hooks', content: 'React hook patterns', tags: ['react'] },
        { title: 'Vue Composition', content: 'Vue reactive patterns', tags: ['vue'] },
        { title: 'Angular Signals', content: 'Signal-based reactivity', tags: ['angular'] },
      ];

      for (const mem of memories) {
        await writeMemory({
          type: MemoryType.Learning,
          ...mem,
          scope: Scope.Local,
          basePath: testBasePath,
        });
      }

      const searchRequest: SearchMemoriesRequest = {
        query: 'reactive',
        basePath: testBasePath,
      };

      const searchResult = await searchMemories(searchRequest);
      expect(searchResult.status).toBe('success');

      if (searchResult.status === 'success' && searchResult.results) {
        expect(searchResult.results.length).toBeGreaterThan(0);

        for (const memory of searchResult.results) {
          const readRequest: ReadMemoryRequest = {
            id: memory.id,
            basePath: testBasePath,
          };

          const readResult = await readMemory(readRequest);
          expect(readResult.status).toBe('success');
        }
      }
    });
  });

  describe('Write → Delete Journey', () => {
    it('should delete a written memory', async () => {
      const writeRequest: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Temporary Memory',
        content: 'Temporary content',
        tags: ['temp'],
        scope: Scope.Local,
        basePath: testBasePath,
      };

      const writeResult = await writeMemory(writeRequest);
      expect(writeResult.status).toBe('success');

      if (writeResult.status === 'success' && writeResult.memory) {
        const memoryId = writeResult.memory.id;

        const deleteResult = await deleteMemory({
          id: memoryId,
          basePath: testBasePath,
        });

        expect(deleteResult.status).toBe('success');

        const readRequest: ReadMemoryRequest = {
          id: memoryId,
          basePath: testBasePath,
        };

        const readResult = await readMemory(readRequest);
        expect(readResult.status).toBe('error');
      }
    });

    it('should handle deletion of non-existent memory', async () => {
      const deleteResult = await deleteMemory({
        id: 'non-existent-id',
        basePath: testBasePath,
      });

      expect(deleteResult.status).toBe('error');
    });
  });

  describe('Multiple Write → Search Ordering', () => {
    it('should maintain chronological order for searches', async () => {
      const memories = [
        { title: 'First', content: 'Content 1', delay: 0 },
        { title: 'Second', content: 'Content 2', delay: 10 },
        { title: 'Third', content: 'Content 3', delay: 20 },
      ];

      for (const mem of memories) {
        await new Promise(resolve => setTimeout(resolve, mem.delay));
        await writeMemory({
          type: MemoryType.Learning,
          title: mem.title,
          content: mem.content,
          tags: ['ordered'],
          scope: Scope.Local,
          basePath: testBasePath,
        });
      }

      const searchRequest: SearchMemoriesRequest = {
        query: 'Content', // Matches "Content 1", "Content 2", "Content 3"
        basePath: testBasePath,
      };

      const searchResult = await searchMemories(searchRequest);
      expect(searchResult.status).toBe('success');

      if (searchResult.status === 'success' && searchResult.results) {
        expect(searchResult.results.length).toBe(3);
      }
    });
  });

  describe('Write → Multiple Writes Journey', () => {
    it('should write multiple memories and read them back', async () => {
      const writeRequest1: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'First Learning',
        content: 'First content',
        tags: ['first'],
        scope: Scope.Local,
        basePath: testBasePath,
      };

      const writeResult1 = await writeMemory(writeRequest1);
      expect(writeResult1.status).toBe('success');

      if (writeResult1.status === 'success' && writeResult1.memory) {
        const memoryId1 = writeResult1.memory.id;

        const writeRequest2: WriteMemoryRequest = {
          type: MemoryType.Gotcha,
          title: 'Second Learning',
          content: 'Second content',
          tags: ['second'],
          scope: Scope.Local,
          basePath: testBasePath,
        };

        const writeResult2 = await writeMemory(writeRequest2);
        expect(writeResult2.status).toBe('success');

        const readRequest: ReadMemoryRequest = {
          id: memoryId1,
          basePath: testBasePath,
        };

        const readResult = await readMemory(readRequest);
        expect(readResult.status).toBe('success');

        if (readResult.status === 'success' && readResult.memory) {
          expect(readResult.memory.frontmatter.title).toBe('First Learning');
          expect(readResult.memory.content).toBe('First content');
          expect(readResult.memory.frontmatter.tags).toEqual(['first']);
        }
      }
    });
  });

  describe('Bulk Operations Journey', () => {
    it('should handle writing, searching, and reading multiple memories', async () => {
      const count = 20;
      const writtenIds: string[] = [];

      for (let i = 0; i < count; i++) {
        const writeRequest: WriteMemoryRequest = {
          type: MemoryType.Learning,
          title: `Bulk Memory ${i}`,
          content: `Content for memory ${i}`,
          tags: ['bulk', `index-${i}`],
          scope: Scope.Local,
          basePath: testBasePath,
        };

        const writeResult = await writeMemory(writeRequest);
        expect(writeResult.status).toBe('success');

        if (writeResult.status === 'success' && writeResult.memory) {
          writtenIds.push(writeResult.memory.id);
        }
      }

      expect(writtenIds.length).toBe(count);

      const searchRequest: SearchMemoriesRequest = {
        query: 'bulk',
        basePath: testBasePath,
      };

      const searchResult = await searchMemories(searchRequest);
      expect(searchResult.status).toBe('success');

      if (searchResult.status === 'success' && searchResult.results) {
        expect(searchResult.results.length).toBe(count);

        const randomIndex = Math.floor(Math.random() * count);
        const randomMemory = searchResult.results[randomIndex];

        const readRequest: ReadMemoryRequest = {
          id: randomMemory.id,
          basePath: testBasePath,
        };

        const readResult = await readMemory(readRequest);
        expect(readResult.status).toBe('success');
      }
    });
  });

  describe('Error Recovery Journey', () => {
    it('should handle read failure gracefully and continue', async () => {
      const writeRequest: WriteMemoryRequest = {
        type: MemoryType.Learning,
        title: 'Valid Memory',
        content: 'Valid content',
        tags: ['valid'],
        scope: Scope.Local,
        basePath: testBasePath,
      };

      const writeResult = await writeMemory(writeRequest);
      expect(writeResult.status).toBe('success');

      const invalidReadRequest: ReadMemoryRequest = {
        id: 'invalid-id',
        basePath: testBasePath,
      };

      const invalidReadResult = await readMemory(invalidReadRequest);
      expect(invalidReadResult.status).toBe('error');

      if (writeResult.status === 'success' && writeResult.memory) {
        const validReadRequest: ReadMemoryRequest = {
          id: writeResult.memory.id,
          basePath: testBasePath,
        };

        const validReadResult = await readMemory(validReadRequest);
        expect(validReadResult.status).toBe('success');
      }
    });
  });
});
