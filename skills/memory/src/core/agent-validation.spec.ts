/**
 * T026: Unit test for agent field validation in frontmatter
 *
 * Tests validation rules for agent field in memory frontmatter.
 */

import { describe, it, expect } from 'vitest';
import { validateFrontmatter } from './validation.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { MemoryFrontmatter } from '../types/memory.js';

describe('Agent field validation', () => {
  describe('agent-project scope validation', () => {
    it('should reject agent-project scope without agent field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentProject,
        // Missing agent field
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'agent',
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should accept agent-project scope with valid agent field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('agent-global scope validation', () => {
    it('should reject agent-global scope without agent field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Decision,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentGlobal,
        // Missing agent field
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'agent',
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should accept agent-global scope with valid agent field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Decision,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('non-agent scope validation', () => {
    it('should accept project scope without agent field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.Project,
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
    });

    it('should accept global scope without agent field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.Global,
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
    });

    it('should accept local scope without agent field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.Local,
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
    });
  });

  describe('agent name format validation', () => {
    it('should reject invalid agent name (uppercase)', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'TypeScript-Expert', // Invalid: has uppercase
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'agent',
        })
      );
    });

    it('should reject invalid agent name (special characters)', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'typescript_expert', // Invalid: has underscore
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'agent',
        })
      );
    });

    it('should reject invalid agent name (too long)', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'a'.repeat(65), // Invalid: exceeds 64 char limit
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'agent',
        })
      );
    });

    it('should reject reserved agent names', () => {
      const reservedNames = ['project', 'global', 'system', 'admin', 'root'];

      for (const reserved of reservedNames) {
        const frontmatter: MemoryFrontmatter = {
          type: MemoryType.Learning,
          title: 'Test',
          created: '2026-01-10T12:00:00Z',
          updated: '2026-01-10T12:00:00Z',
          tags: [],
          scope: Scope.AgentProject,
          agent: reserved,
        };

        const result = validateFrontmatter(frontmatter);
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'agent',
          })
        );
      }
    });

    it('should accept valid agent name', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
      };

      const result = validateFrontmatter(frontmatter);
      expect(result.valid).toBe(true);
    });
  });
});
