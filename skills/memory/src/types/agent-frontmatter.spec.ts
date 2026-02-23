/**
 * Tests for AgentMemoryFrontmatter type guard
 */

import { describe, it, expect } from 'vitest';
import { isAgentMemoryFrontmatter } from './agent-frontmatter.js';
import { Scope, MemoryType } from './enums.js';
import { unsafeAsMemoryId } from './branded.js';
import type { MemoryFrontmatter } from './memory.js';

const baseFrontmatter: MemoryFrontmatter = {
  id: unsafeAsMemoryId('learning-foo'),
  title: 'Foo',
  type: MemoryType.Learning,
  scope: Scope.Project,
  created: '2026-01-01T00:00:00Z',
  updated: '2026-01-01T00:00:00Z',
  tags: [],
};

describe('isAgentMemoryFrontmatter', () => {
  it('returns true for agent-project scope with agent field', () => {
    expect(
      isAgentMemoryFrontmatter({ ...baseFrontmatter, scope: Scope.AgentProject, agent: 'curator' })
    ).toBe(true);
  });

  it('returns true for agent-global scope with agent field', () => {
    expect(
      isAgentMemoryFrontmatter({ ...baseFrontmatter, scope: Scope.AgentGlobal, agent: 'recall' })
    ).toBe(true);
  });

  it('returns false when agent field is absent', () => {
    expect(
      isAgentMemoryFrontmatter({ ...baseFrontmatter, scope: Scope.AgentProject })
    ).toBe(false);
  });

  it('returns false when agent field is empty string', () => {
    expect(
      isAgentMemoryFrontmatter({ ...baseFrontmatter, scope: Scope.AgentProject, agent: '' })
    ).toBe(false);
  });

  it('returns false for project scope even with agent field', () => {
    expect(
      isAgentMemoryFrontmatter({ ...baseFrontmatter, scope: Scope.Project, agent: 'curator' })
    ).toBe(false);
  });

  it('returns false for global scope even with agent field', () => {
    expect(
      isAgentMemoryFrontmatter({ ...baseFrontmatter, scope: Scope.Global, agent: 'curator' })
    ).toBe(false);
  });

  it('returns false for local scope even with agent field', () => {
    expect(
      isAgentMemoryFrontmatter({ ...baseFrontmatter, scope: Scope.Local, agent: 'curator' })
    ).toBe(false);
  });
});
