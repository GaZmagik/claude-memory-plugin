/**
 * Tests for CLI Agents Commands (Phase E)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cmdAgentsList, cmdAgentsStats } from './agents.js';
import * as discoveryModule from '../../core/agent-discovery.js';
import type { ParsedArgs } from '../parser.js';
import { Scope, MemoryType } from '../../types/enums.js';
import type { AgentSummary } from '../../types/api.js';

describe('cmdAgentsList', () => {
  beforeEach(() => {
    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists all agents when no filters provided', async () => {
    const mockAgents: AgentSummary[] = [
      {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        path: '/project/.claude/memory/agents/typescript-expert',
        memoryCount: 45,
        lastUpdated: '2026-02-04T12:00:00.000Z',
      },
      {
        name: 'rust-expert',
        scope: Scope.AgentGlobal,
        path: '/home/user/.claude/memory/agents/rust-expert',
        memoryCount: 23,
        lastUpdated: '2026-02-04T11:00:00.000Z',
      },
    ];

    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue(mockAgents);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdAgentsList(args);

    expect(result.status).toBe('success');
    expect(result.data).toHaveProperty('agents');
    const data = result.data as { agents: AgentSummary[]; count: number };
    expect(data.agents).toHaveLength(2);
    expect(data.count).toBe(2);
  });

  it('filters by project scope when --scope project provided', async () => {
    const mockAgents: AgentSummary[] = [
      {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        path: '/project/.claude/memory/agents/typescript-expert',
        memoryCount: 45,
      },
    ];

    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue(mockAgents);

    const args: ParsedArgs = { positional: [], flags: { scope: 'project' } };
    await cmdAgentsList(args);

    expect(discoveryModule.discoverAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: Scope.AgentProject,
      })
    );
  });

  it('filters by global scope when --scope global provided', async () => {
    const mockAgents: AgentSummary[] = [
      {
        name: 'rust-expert',
        scope: Scope.AgentGlobal,
        path: '/home/user/.claude/memory/agents/rust-expert',
        memoryCount: 23,
      },
    ];

    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue(mockAgents);

    const args: ParsedArgs = { positional: [], flags: { scope: 'global' } };
    await cmdAgentsList(args);

    expect(discoveryModule.discoverAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: Scope.AgentGlobal,
      })
    );
  });

  it('returns error for invalid scope value', async () => {
    const args: ParsedArgs = { positional: [], flags: { scope: 'invalid' } };
    const result = await cmdAgentsList(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Invalid scope');
  });

  it('includes stats when --include-stats flag provided', async () => {
    const mockAgents: AgentSummary[] = [
      {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        path: '/project/.claude/memory/agents/typescript-expert',
        memoryCount: 45,
        memoryTypes: {
          [MemoryType.Learning]: 20,
          [MemoryType.Decision]: 15,
        } as Partial<Record<MemoryType, number>> as Record<MemoryType, number>,
        tags: ['typescript', 'patterns'],
      },
    ];

    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue(mockAgents);

    const args: ParsedArgs = { positional: [], flags: { 'include-stats': true } };
    await cmdAgentsList(args);

    expect(discoveryModule.discoverAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        includeStats: true,
      })
    );
  });

  it('returns empty list when no agents found', async () => {
    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue([]);

    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdAgentsList(args);

    expect(result.status).toBe('success');
    const data = result.data as { agents: AgentSummary[]; count: number };
    expect(data.agents).toEqual([]);
    expect(data.count).toBe(0);
  });
});

describe('cmdAgentsStats', () => {
  beforeEach(() => {
    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns stats for single named agent', async () => {
    const mockAgents: AgentSummary[] = [
      {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        path: '/project/.claude/memory/agents/typescript-expert',
        memoryCount: 45,
        memoryTypes: {
          [MemoryType.Learning]: 20,
          [MemoryType.Decision]: 15,
          [MemoryType.Artifact]: 10,
        } as Partial<Record<MemoryType, number>> as Record<MemoryType, number>,
        tags: ['typescript', 'patterns', 'api'],
      },
    ];

    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue(mockAgents);

    const args: ParsedArgs = { positional: ['typescript-expert'], flags: {} };
    const result = await cmdAgentsStats(args);

    expect(result.status).toBe('success');
    const data = result.data as { agent: AgentSummary };
    expect(data.agent).toMatchObject({
      name: 'typescript-expert',
      memoryCount: 45,
    });
  });

  it('returns stats for all agents when --all flag provided', async () => {
    const mockAgents: AgentSummary[] = [
      {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        path: '/project/.claude/memory/agents/typescript-expert',
        memoryCount: 45,
      },
      {
        name: 'rust-expert',
        scope: Scope.AgentGlobal,
        path: '/home/user/.claude/memory/agents/rust-expert',
        memoryCount: 23,
      },
    ];

    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue(mockAgents);

    const args: ParsedArgs = { positional: [], flags: { all: true } };
    const result = await cmdAgentsStats(args);

    expect(result.status).toBe('success');
    const data = result.data as { agents: AgentSummary[] };
    expect(data.agents).toHaveLength(2);
  });

  it('returns error when both agent name and --all provided', async () => {
    const args: ParsedArgs = { positional: ['typescript-expert'], flags: { all: true } };
    const result = await cmdAgentsStats(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Cannot specify agent name with --all flag');
  });

  it('returns error when no agent name and no --all flag', async () => {
    const args: ParsedArgs = { positional: [], flags: {} };
    const result = await cmdAgentsStats(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Agent name required');
  });

  it('returns error when agent not found', async () => {
    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue([
      {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        path: '/project/.claude/memory/agents/typescript-expert',
        memoryCount: 45,
      },
    ]);

    const args: ParsedArgs = { positional: ['nonexistent-agent'], flags: {} };
    const result = await cmdAgentsStats(args);

    expect(result.status).toBe('error');
    expect(result.error).toContain('Agent not found');
  });

  it('always includes stats when fetching agent details', async () => {
    const mockAgents: AgentSummary[] = [
      {
        name: 'typescript-expert',
        scope: Scope.AgentProject,
        path: '/project/.claude/memory/agents/typescript-expert',
        memoryCount: 45,
        memoryTypes: {
          [MemoryType.Learning]: 20,
        } as Partial<Record<MemoryType, number>> as Record<MemoryType, number>,
        tags: ['typescript'],
      },
    ];

    vi.spyOn(discoveryModule, 'discoverAgents').mockResolvedValue(mockAgents);

    const args: ParsedArgs = { positional: ['typescript-expert'], flags: {} };
    await cmdAgentsStats(args);

    expect(discoveryModule.discoverAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        includeStats: true,
      })
    );
  });
});
