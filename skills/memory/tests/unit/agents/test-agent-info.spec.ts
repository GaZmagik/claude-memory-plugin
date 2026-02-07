/**
 * Tests for AgentInfo Structure and Validation (Phase E - T105)
 *
 * Tests the AgentInfo interface used for agent discovery and listing.
 */

import { describe, it, expect } from 'vitest';
import type { AgentInfo } from '../../../src/types/agent-info.js';
import { validateAgentInfo } from '../../../src/agents/validate-agent-info.js';
import { Scope, MemoryType } from '../../../src/types/enums.js';

describe('AgentInfo interface', () => {
  it('validates complete AgentInfo structure', () => {
    const agentInfo: AgentInfo = {
      name: 'typescript-pro',
      scope: Scope.AgentProject,
      path: '/project/.claude/memory/agents/typescript-pro',
      memoryCount: 10,
      linkCount: 5,
      tags: ['typescript', 'frontend'],
      types: [MemoryType.Learning, MemoryType.Decision],
      created: new Date('2026-01-01'),
      updated: new Date('2026-02-01'),
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(true);
  });

  it('validates minimal AgentInfo structure', () => {
    const agentInfo: AgentInfo = {
      name: 'rust-expert',
      scope: Scope.AgentGlobal,
      path: '/home/user/.claude/memory/agents/rust-expert',
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(true);
  });

  it('rejects AgentInfo with missing name', () => {
    const agentInfo = {
      scope: Scope.AgentProject,
      path: '/path',
    } as AgentInfo;

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('name');
  });

  it('rejects AgentInfo with missing scope', () => {
    const agentInfo = {
      name: 'test-agent',
      path: '/path',
    } as AgentInfo;

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('scope');
  });

  it('rejects AgentInfo with missing path', () => {
    const agentInfo = {
      name: 'test-agent',
      scope: Scope.AgentProject,
    } as AgentInfo;

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('path');
  });

  it('rejects AgentInfo with non-agent scope', () => {
    const agentInfo: AgentInfo = {
      name: 'test-agent',
      scope: Scope.Project as any, // Invalid - must be agent scope
      path: '/path',
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('agent scope');
  });

  it('rejects AgentInfo with invalid agent name format', () => {
    const agentInfo: AgentInfo = {
      name: 'Invalid Agent Name!', // Spaces and special chars
      scope: Scope.AgentProject,
      path: '/path',
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('name');
  });

  it('rejects AgentInfo with negative memory count', () => {
    const agentInfo: AgentInfo = {
      name: 'test-agent',
      scope: Scope.AgentProject,
      path: '/path',
      memoryCount: -1,
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('memoryCount');
  });

  it('rejects AgentInfo with negative link count', () => {
    const agentInfo: AgentInfo = {
      name: 'test-agent',
      scope: Scope.AgentProject,
      path: '/path',
      linkCount: -5,
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('linkCount');
  });

  it('accepts zero memory count', () => {
    const agentInfo: AgentInfo = {
      name: 'new-agent',
      scope: Scope.AgentProject,
      path: '/path',
      memoryCount: 0,
      linkCount: 0,
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(true);
  });

  it('validates tags array format', () => {
    const agentInfo: AgentInfo = {
      name: 'test-agent',
      scope: Scope.AgentProject,
      path: '/path',
      tags: ['valid-tag', 'another-tag'],
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(true);
  });

  it('validates types array format', () => {
    const agentInfo: AgentInfo = {
      name: 'test-agent',
      scope: Scope.AgentProject,
      path: '/path',
      types: [MemoryType.Learning, MemoryType.Decision, MemoryType.Artifact],
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(true);
  });

  it('validates date fields are Date objects', () => {
    const agentInfo: AgentInfo = {
      name: 'test-agent',
      scope: Scope.AgentProject,
      path: '/path',
      created: new Date(),
      updated: new Date(),
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid date fields', () => {
    const agentInfo: AgentInfo = {
      name: 'test-agent',
      scope: Scope.AgentProject,
      path: '/path',
      created: 'invalid-date' as any,
    };

    const result = validateAgentInfo(agentInfo);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('created');
  });
});

describe('AgentInfo comparison and sorting', () => {
  it('can be sorted by name alphabetically', () => {
    const agents: AgentInfo[] = [
      { name: 'zebra-agent', scope: Scope.AgentProject, path: '/z' },
      { name: 'alpha-agent', scope: Scope.AgentProject, path: '/a' },
      { name: 'beta-agent', scope: Scope.AgentProject, path: '/b' },
    ];

    agents.sort((a, b) => a.name.localeCompare(b.name));

    expect(agents[0]!.name).toBe('alpha-agent');
    expect(agents[1]!.name).toBe('beta-agent');
    expect(agents[2]!.name).toBe('zebra-agent');
  });

  it('can be sorted by memory count descending', () => {
    const agents: AgentInfo[] = [
      { name: 'agent1', scope: Scope.AgentProject, path: '/1', memoryCount: 5 },
      { name: 'agent2', scope: Scope.AgentProject, path: '/2', memoryCount: 20 },
      { name: 'agent3', scope: Scope.AgentProject, path: '/3', memoryCount: 10 },
    ];

    agents.sort((a, b) => (b.memoryCount || 0) - (a.memoryCount || 0));

    expect(agents[0]!.memoryCount).toBe(20);
    expect(agents[1]!.memoryCount).toBe(10);
    expect(agents[2]!.memoryCount).toBe(5);
  });

  it('can be sorted by scope priority', () => {
    const agents: AgentInfo[] = [
      { name: 'global1', scope: Scope.AgentGlobal, path: '/g1' },
      { name: 'project1', scope: Scope.AgentProject, path: '/p1' },
      { name: 'project2', scope: Scope.AgentProject, path: '/p2' },
    ];

    // Project scope should come before global scope
    agents.sort((a, b) => {
      if (a.scope === b.scope) return 0;
      return a.scope === Scope.AgentProject ? -1 : 1;
    });

    expect(agents[0]!.scope).toBe(Scope.AgentProject);
    expect(agents[1]!.scope).toBe(Scope.AgentProject);
    expect(agents[2]!.scope).toBe(Scope.AgentGlobal);
  });
});
