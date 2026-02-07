/**
 * T025: Unit test for agent field in frontmatter
 *
 * Tests parsing, serialisation, and validation of agent field in memory frontmatter.
 */

import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  serialiseFrontmatter,
  createFrontmatter,
} from './frontmatter.js';
import { MemoryType, Scope } from '../types/enums.js';
import type { MemoryFrontmatter } from '../types/memory.js';

describe('Agent field in frontmatter', () => {
  describe('parseFrontmatter with agent field', () => {
    it('should parse frontmatter with agent field', () => {
      const yaml = `type: learning
title: TypeScript Pattern
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - typescript
scope: agent-project
agent: typescript-expert`;

      const result = parseFrontmatter(yaml);
      expect(result.type).toBe(MemoryType.Learning);
      expect(result.scope).toBe(Scope.AgentProject);
      expect(result.agent).toBe('typescript-expert');
    });

    it('should parse agent-global scope with agent field', () => {
      const yaml = `type: decision
title: API Design
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - api
scope: agent-global
agent: api-architect`;

      const result = parseFrontmatter(yaml);
      expect(result.scope).toBe(Scope.AgentGlobal);
      expect(result.agent).toBe('api-architect');
    });

    it('should parse frontmatter without agent field for non-agent scopes', () => {
      const yaml = `type: learning
title: General Learning
created: 2026-01-10T12:00:00Z
updated: 2026-01-10T12:00:00Z
tags:
  - test
scope: project`;

      const result = parseFrontmatter(yaml);
      expect(result.scope).toBe(Scope.Project);
      expect(result.agent).toBeUndefined();
    });
  });

  describe('serialiseFrontmatter with agent field', () => {
    it('should serialise agent field when present', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Test with Agent',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: ['test'],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
      };

      const yaml = serialiseFrontmatter(frontmatter);
      expect(yaml).toContain('scope: agent-project');
      expect(yaml).toContain('agent: typescript-expert');
    });

    it('should place agent field after scope field', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Decision,
        title: 'Test Order',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.AgentGlobal,
        agent: 'api-architect',
        project: 'test-project',
      };

      const yaml = serialiseFrontmatter(frontmatter);

      // Check order: scope line should come before agent line
      const scopeIndex = yaml.indexOf('scope:');
      const agentIndex = yaml.indexOf('agent:');
      const projectIndex = yaml.indexOf('project:');

      expect(scopeIndex).toBeGreaterThan(-1);
      expect(agentIndex).toBeGreaterThan(-1);
      expect(projectIndex).toBeGreaterThan(-1);
      expect(scopeIndex).toBeLessThan(agentIndex);
      expect(agentIndex).toBeLessThan(projectIndex);
    });

    it('should omit agent field when not present', () => {
      const frontmatter: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'No Agent',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: [],
        scope: Scope.Project,
      };

      const yaml = serialiseFrontmatter(frontmatter);
      expect(yaml).not.toContain('agent:');
    });
  });

  describe('createFrontmatter with agent field', () => {
    it('should include agent field when provided', () => {
      const result = createFrontmatter({
        type: MemoryType.Learning,
        title: 'Test',
        tags: [],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
      });

      expect(result.scope).toBe(Scope.AgentProject);
      expect(result.agent).toBe('typescript-expert');
    });

    it('should omit agent field when not provided', () => {
      const result = createFrontmatter({
        type: MemoryType.Learning,
        title: 'Test',
        tags: [],
        scope: Scope.Project,
      });

      expect(result.scope).toBe(Scope.Project);
      expect(result.agent).toBeUndefined();
    });
  });

  describe('roundtrip serialisation with agent field', () => {
    it('should preserve agent field through parse → serialise → parse', () => {
      const original: MemoryFrontmatter = {
        type: MemoryType.Learning,
        title: 'Roundtrip Test',
        created: '2026-01-10T12:00:00Z',
        updated: '2026-01-10T12:00:00Z',
        tags: ['test'],
        scope: Scope.AgentProject,
        agent: 'typescript-expert',
      };

      const serialised = serialiseFrontmatter(original);
      const parsed = parseFrontmatter(serialised);

      expect(parsed.agent).toBe('typescript-expert');
      expect(parsed.scope).toBe(Scope.AgentProject);
    });
  });
});
