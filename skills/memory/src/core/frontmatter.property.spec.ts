/**
 * Property-based tests for frontmatter.ts
 *
 * Tests round-trip properties: parse ∘ serialise = identity
 */

import { describe, it, expect } from 'vitest';
import { memoryId, memoryIds } from '../test-utils/branded-helpers.js';
import { parseMemoryFile, serialiseMemoryFile, createFrontmatter, updateFrontmatter } from './frontmatter.js';
import { MemoryType, Scope, Severity } from '../types/enums.js';
import type { MemoryFrontmatter } from '../types/memory.js';

describe('frontmatter property-based tests', () => {
  describe('round-trip property: parse(serialise(x)) = x', () => {
    it('should preserve all frontmatter fields through serialisation and parsing', () => {
      const testCases: MemoryFrontmatter[] = [
        {
          type: MemoryType.Learning,
          title: 'Test Learning',
          created: '2026-01-13T00:00:00.000Z',
          updated: '2026-01-13T00:00:00.000Z',
          tags: ['test', 'learning'],
          scope: Scope.Project,
        },
        {
          type: MemoryType.Gotcha,
          title: 'Critical Gotcha',
          created: '2026-01-13T00:00:00.000Z',
          updated: '2026-01-13T00:00:00.000Z',
          tags: ['critical'],
          scope: Scope.Global,
          severity: Severity.High,
        },
        {
          type: MemoryType.Decision,
          title: 'Architecture Decision',
          created: '2026-01-13T00:00:00.000Z',
          updated: '2026-01-13T00:00:00.000Z',
          tags: ['architecture', 'decision'],
          scope: Scope.Local,
          links: memoryIds(['learning-related', 'gotcha-watch-out']),
        },
      ];

      for (const original of testCases) {
        const content = 'Test content here';
        const serialised = serialiseMemoryFile(original, content);
        const parsed = parseMemoryFile(serialised);

        expect(parsed.frontmatter).toBeDefined();
        expect(parsed.frontmatter?.type).toBe(original.type);
        expect(parsed.frontmatter?.title).toBe(original.title);
        expect(parsed.frontmatter?.created).toBe(original.created);
        expect(parsed.frontmatter?.updated).toBe(original.updated);
        expect(parsed.frontmatter?.tags).toEqual(original.tags);
        expect(parsed.frontmatter?.scope).toBe(original.scope);
        expect(parsed.content).toBe(content);
      }
    });

    it('should preserve content through serialisation and parsing', () => {
      const contents = [
        'Simple content',
        'Content with\nmultiple\nlines',
        'Content with special chars: !@#$%^&*()',
        'Content with code:\n```js\nconst x = 1;\n```',
        '',
      ];

      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: [],
      };

      for (const content of contents) {
        const serialised = serialiseMemoryFile(frontmatter, content);
        const parsed = parseMemoryFile(serialised);

        expect(parsed.content).toBe(content);
      }
    });

    it('should handle optional fields correctly', () => {
      const withOptionals: MemoryFrontmatter = {
        type: MemoryType.Gotcha,
        title: 'With Optionals',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: ['test'],
        scope: Scope.Project,
        severity: Severity.Medium,
        links: memoryIds(['other-memory']),
        source: 'some-source',
      };

      const withoutOptionals: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Without Optionals',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: [],
      };

      for (const fm of [withOptionals, withoutOptionals]) {
        const serialised = serialiseMemoryFile(fm, 'content');
        const parsed = parseMemoryFile(serialised);

        expect(parsed.frontmatter?.severity).toBe(fm.severity);
        expect(parsed.frontmatter?.links).toEqual(fm.links);
        expect(parsed.frontmatter?.source).toBe(fm.source);
      }
    });
  });

  describe('createFrontmatter properties', () => {
    it('should always include required fields', () => {
      const created = createFrontmatter({
        id: memoryId('test-id'),
        type: MemoryType.Learning,
        title: 'Test',
        tags: [],
        scope: Scope.Project,
      });

      expect(created.type).toBeDefined();
      expect(created.title).toBeDefined();
      expect(created.created).toBeDefined();
      expect(created.updated).toBeDefined();
      expect(created.tags).toBeDefined();
    });

    it('should set created and updated to same value initially', () => {
      const fm = createFrontmatter({
        id: memoryId('test-id'),
        type: MemoryType.Learning,
        title: 'Test',
        tags: [],
        scope: Scope.Project,
      });

      expect(fm.created).toBe(fm.updated);
    });

    it('should use valid ISO 8601 timestamps', () => {
      const fm = createFrontmatter({
        id: memoryId('test-id'),
        type: MemoryType.Learning,
        title: 'Test',
        tags: [],
        scope: Scope.Project,
      });

      const createdDate = new Date(fm.created);
      const updatedDate = new Date(fm.updated);

      expect(createdDate.toISOString()).toBe(fm.created);
      expect(updatedDate.toISOString()).toBe(fm.updated);
    });

    it('should preserve all provided optional fields', () => {
      const input = {
        id: memoryId('test-id'),
        type: MemoryType.Gotcha,
        title: 'Test',
        tags: ['tag1', 'tag2'],
        scope: Scope.Global,
        severity: Severity.High,
        links: memoryIds(['link1']),
        source: 'source-value',
        meta: { custom: 'field' },
      };

      const fm = createFrontmatter(input);

      expect(fm.severity).toBe(input.severity);
      expect(fm.links).toEqual(input.links);
      expect(fm.source).toBe(input.source);
      expect(fm.meta).toEqual(input.meta);
    });
  });

  describe('updateFrontmatter properties', () => {
    it('should preserve unchanged fields', () => {
      const original: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Original Title',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: ['original'],
        scope: Scope.Project,
      };

      const updated = updateFrontmatter(original, { title: 'New Title' });

      expect(updated.type).toBe(original.type);
      expect(updated.created).toBe(original.created);
      expect(updated.tags).toEqual(original.tags);
      expect(updated.scope).toBe(original.scope);
    });

    it('should update only specified fields', () => {
      const original: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Original',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: ['tag1'],
      };

      const updated = updateFrontmatter(original, {
        title: 'Updated',
        tags: ['tag1', 'tag2'],
      });

      expect(updated.title).toBe('Updated');
      expect(updated.tags).toEqual(['tag1', 'tag2']);
      expect(updated.type).toBe(original.type);
    });

    it('should update timestamp when modified', () => {
      const original: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Original',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: [],
      };

      const updated = updateFrontmatter(original, { title: 'New' });

      expect(updated.updated).not.toBe(original.updated);
      expect(new Date(updated.updated).getTime()).toBeGreaterThan(new Date(original.updated).getTime());
    });

    it('should be idempotent for empty updates', () => {
      const original: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: [],
      };

      const updated = updateFrontmatter(original, {});

      expect(updated.type).toBe(original.type);
      expect(updated.title).toBe(original.title);
      expect(updated.created).toBe(original.created);
      expect(updated.tags).toEqual(original.tags);
    });
  });

  describe('parseMemoryFile error handling', () => {
    it('should throw on files without frontmatter', () => {
      const content = 'Just plain content without frontmatter';

      expect(() => parseMemoryFile(content)).toThrow('Invalid memory file format');
    });

    it('should throw on empty files', () => {
      expect(() => parseMemoryFile('')).toThrow('Invalid memory file format');
    });

    it('should handle files with only frontmatter (empty content)', () => {
      const file = `---
type: learning
title: Test
created: 2026-01-13T00:00:00.000Z
updated: 2026-01-13T00:00:00.000Z
tags: []
---
`;

      const parsed = parseMemoryFile(file);

      expect(parsed.frontmatter).toBeDefined();
      expect(parsed.content).toBe('');
    });

    it('should throw on malformed YAML', () => {
      const file = `---
type: learning
title: Test
invalid: [unclosed
---
Content`;

      expect(() => parseMemoryFile(file)).toThrow();
    });
  });

  describe('serialisation format properties', () => {
    it('should always start with frontmatter delimiter', () => {
      const fm: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: [],
      };

      const serialised = serialiseMemoryFile(fm, 'content');

      expect(serialised.startsWith('---\n')).toBe(true);
    });

    it('should have exactly two frontmatter delimiters', () => {
      const fm: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: [],
      };

      const serialised = serialiseMemoryFile(fm, 'content');
      const delimiterCount = (serialised.match(/^---$/gm) || []).length;

      expect(delimiterCount).toBe(2);
    });

    it('should separate frontmatter from content with newline', () => {
      const fm: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: [],
      };

      const serialised = serialiseMemoryFile(fm, 'content');
      const parts = serialised.split('---\n');

      expect(parts).toHaveLength(3); // Empty before first ---, frontmatter, content
    });
  });

  describe('data type preservation', () => {
    it('should preserve array types', () => {
      const fm: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-13T00:00:00.000Z',
        updated: '2026-01-13T00:00:00.000Z',
        tags: ['tag1', 'tag2', 'tag3'],
        links: memoryIds(['link1', 'link2']),
      };

      const serialised = serialiseMemoryFile(fm, 'content');
      const parsed = parseMemoryFile(serialised);

      expect(Array.isArray(parsed.frontmatter?.tags)).toBe(true);
      expect(Array.isArray(parsed.frontmatter?.links)).toBe(true);
    });

    it('should preserve string enums', () => {
      const testCases = [
        { type: MemoryType.Learning, scope: Scope.Project },
        { type: MemoryType.Gotcha, scope: Scope.Global },
        { type: MemoryType.Decision, scope: Scope.Local },
      ];

      for (const { type, scope } of testCases) {
        const fm: MemoryFrontmatter = {
          type,
          title: 'Test',
          created: '2026-01-13T00:00:00.000Z',
          updated: '2026-01-13T00:00:00.000Z',
          tags: [],
          scope,
        };

        const serialised = serialiseMemoryFile(fm, 'content');
        const parsed = parseMemoryFile(serialised);

        expect(parsed.frontmatter?.type).toBe(type);
        expect(parsed.frontmatter?.scope).toBe(scope);
      }
    });
  });
});
