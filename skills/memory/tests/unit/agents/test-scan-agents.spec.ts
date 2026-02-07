/**
 * Tests for Agent Directory Scanning (Phase E - T106)
 *
 * Tests scanning agent directories and gathering agent information.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanAgentDirectories, getAgentInfo } from '../../../src/agents/scan-agent-directories.js';
import { Scope } from '../../../src/types/enums.js';

// Mock filesystem operations
const mockReaddir = vi.fn();
const mockStat = vi.fn();
const mockAccess = vi.fn();
const mockReadFile = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    readdir: mockReaddir,
    stat: mockStat,
    access: mockAccess,
    readFile: mockReadFile,
  },
}));

describe('scanAgentDirectories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scans project agent directories', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'typescript-pro', isDirectory: () => true } as any,
      { name: 'rust-expert', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('rust-expert');
    expect(result[0]!.scope).toBe(Scope.AgentProject);
    expect(result[1]!.name).toBe('typescript-pro');
  });

  it('scans global agent directories', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'python-expert', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      globalRoot: '/home/user/.claude/memory',
      scope: Scope.AgentGlobal,
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('python-expert');
    expect(result[0]!.scope).toBe(Scope.AgentGlobal);
  });

  it('scans both project and global when no scope specified', async () => {
    mockReaddir
      .mockResolvedValueOnce([
        { name: 'project-agent', isDirectory: () => true } as any,
      ])
      .mockResolvedValueOnce([
        { name: 'global-agent', isDirectory: () => true } as any,
      ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      globalRoot: '/home/user/.claude/memory',
    });

    expect(result).toHaveLength(2);
    expect(result.some((a) => a.name === 'project-agent')).toBe(true);
    expect(result.some((a) => a.name === 'global-agent')).toBe(true);
  });

  it('filters out non-directory entries', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'typescript-pro', isDirectory: () => true } as any,
      { name: 'readme.md', isDirectory: () => false } as any,
      { name: 'config.json', isDirectory: () => false } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('typescript-pro');
  });

  it('includes statistics when includeStats option enabled', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'typescript-pro', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    // Mock index.json content
    const mockIndex = {
      memories: {
        'mem1': { tags: ['typescript', 'testing'], type: 'learning', created: '2026-01-01', updated: '2026-02-01' },
        'mem2': { tags: ['typescript', 'frontend'], type: 'decision', created: '2026-01-15', updated: '2026-02-15' },
      }
    };

    // Mock graph.json content
    const mockGraph = {
      edges: [
        { source: 'mem1', target: 'mem2' },
      ]
    };

    mockReadFile
      .mockResolvedValueOnce(JSON.stringify(mockIndex))  // First call: index.json
      .mockResolvedValueOnce(JSON.stringify(mockGraph)); // Second call: graph.json

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
      includeStats: true,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('memoryCount');
    expect(result[0]).toHaveProperty('linkCount');
    expect(result[0]).toHaveProperty('tags');
    expect(result[0]).toHaveProperty('types');
  });

  it('returns empty array when agents directory does not exist', async () => {
    mockAccess.mockRejectedValue(new Error('ENOENT'));

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
    });

    expect(result).toEqual([]);
  });

  it('handles errors gracefully and continues scanning', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'valid-agent', isDirectory: () => true } as any,
      { name: 'corrupted-agent', isDirectory: () => true } as any,
    ]);
    mockAccess
      .mockResolvedValueOnce(undefined) // valid-agent succeeds
      .mockRejectedValueOnce(new Error('Corrupted')) // corrupted-agent fails
      .mockResolvedValueOnce(undefined); // parent directory check

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
    });

    // Should return valid agent, skip corrupted
    expect(result.length).toBeGreaterThan(0);
  });

  it('sorts agents alphabetically by name', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'zebra-agent', isDirectory: () => true } as any,
      { name: 'alpha-agent', isDirectory: () => true } as any,
      { name: 'beta-agent', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
    });

    expect(result[0]!.name).toBe('alpha-agent');
    expect(result[1]!.name).toBe('beta-agent');
    expect(result[2]!.name).toBe('zebra-agent');
  });

  it('includes creation and update timestamps', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'test-agent', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({
      birthtime: new Date('2026-01-01'),
      mtime: new Date('2026-02-01'),
    } as any);

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
      includeStats: true,
    });

    expect(result[0]!.created).toEqual(new Date('2026-01-01'));
    expect(result[0]!.updated).toEqual(new Date('2026-02-01'));
  });

  it('constructs correct path for project agents', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'test-agent', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
    });

    expect(result[0]!.path).toBe('/project/.claude/memory/agents/test-agent');
  });

  it('constructs correct path for global agents', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'test-agent', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      globalRoot: '/home/user/.claude/memory',
      scope: Scope.AgentGlobal,
    });

    expect(result[0]!.path).toBe('/home/user/.claude/memory/agents/test-agent');
  });

  it('filters by agent name pattern when provided', async () => {
    mockReaddir.mockResolvedValue([
      { name: 'typescript-pro', isDirectory: () => true } as any,
      { name: 'typescript-expert', isDirectory: () => true } as any,
      { name: 'rust-expert', isDirectory: () => true } as any,
    ]);
    mockAccess.mockResolvedValue(undefined);

    const result = await scanAgentDirectories({
      projectRoot: '/project',
      scope: Scope.AgentProject,
      namePattern: 'typescript-*',
    });

    expect(result).toHaveLength(2);
    expect(result.every((a) => a.name.startsWith('typescript-'))).toBe(true);
  });
});

describe('getAgentInfo', () => {
  it('retrieves detailed info for specific agent', async () => {
    // Mock index.json for the agent
    mockReadFile.mockResolvedValueOnce(JSON.stringify({
      version: 1,
      memories: {
        'learning-ts-patterns': {
          id: 'learning-ts-patterns',
          title: 'TS Patterns',
          type: 'learning',
          tags: ['typescript'],
          scope: 'agent-project',
          relativePath: 'permanent/learning-ts-patterns.md',
        },
      },
    }));

    // Mock graph.json for the agent
    mockReadFile.mockResolvedValueOnce(JSON.stringify({
      version: 1,
      nodes: [{ id: 'learning-ts-patterns', type: 'learning' }],
      edges: [],
    }));

    const result = await getAgentInfo(
      'typescript-expert',
      '/project/.claude/memory/agents/typescript-expert'
    );

    expect(result.name).toBe('typescript-expert');
    expect(result.scope).toBe(Scope.AgentProject);
    expect(result.path).toBe('/project/.claude/memory/agents/typescript-expert');
  });

  it('returns AgentGlobal scope for global agent paths', async () => {
    // Mock index.json
    mockReadFile.mockResolvedValueOnce(JSON.stringify({
      version: 1,
      memories: {},
    }));

    // Mock graph.json — not found
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

    const result = await getAgentInfo(
      'rust-expert',
      '/home/user/.claude/memory/agents/rust-expert'
    );

    expect(result.name).toBe('rust-expert');
    expect(result.scope).toBe(Scope.AgentGlobal);
  });

  it('handles missing index.json gracefully', async () => {
    // Mock index.json — not found
    mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

    const result = await getAgentInfo(
      'test-agent',
      '/project/.claude/memory/agents/test-agent'
    );

    expect(result.name).toBe('test-agent');
    expect(result.path).toBe('/project/.claude/memory/agents/test-agent');
  });
});
