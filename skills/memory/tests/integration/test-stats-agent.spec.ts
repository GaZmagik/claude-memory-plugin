/**
 * Integration Tests for Stats with --agent Flag (Phase E - T109)
 *
 * Tests graph statistics command with agent-scoped filtering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cmdStats } from '../../src/cli/commands/query.js';
import { writeMemory } from '../../src/core/write.js';
import { linkMemories } from '../../src/graph/link.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Stats with --agent flag', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-agent-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    // Create agent memories with links
    await writeMemory({
      id: 'learning-ts-mem-1',
      type: MemoryType.Learning,
      title: 'TS Learning 1',
      content: 'Content',
      tags: [],
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      basePath: testDir,
    });

    await writeMemory({
      id: 'decision-ts-mem-2',
      type: MemoryType.Decision,
      title: 'TS Decision 1',
      content: 'Content',
      tags: [],
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      basePath: testDir,
    });

    await writeMemory({
      id: 'artifact-ts-mem-3',
      type: MemoryType.Artifact,
      title: 'TS Artifact 1',
      content: 'Content',
      tags: [],
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      basePath: testDir,
    });

    // Create links
    await linkMemories({
      source: 'learning-ts-mem-1',
      target: 'decision-ts-mem-2',
      basePath: testDir,
      agent: 'typescript-pro',
    });

    await linkMemories({
      source: 'decision-ts-mem-2',
      target: 'artifact-ts-mem-3',
      basePath: testDir,
      agent: 'typescript-pro',
    });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('shows stats for specific agent only', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();

    const stats = result.data as any;
    expect(stats.totalNodes).toBe(3);
    expect(stats.totalEdges).toBe(2);
  });

  it('calculates correct link ratio for agent scope', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    // 2 edges / 3 nodes = 0.67 ratio
    expect(stats.linkRatio).toBeCloseTo(0.67, 2);
  });

  it('identifies hub nodes within agent scope', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.hubs).toBeDefined();
    expect(stats.hubs.length).toBeGreaterThan(0);
    // decision-ts-mem-2 should be a hub (has both inbound and outbound edges)
    expect(stats.hubs).toContain('decision-ts-mem-2');
  });

  it('identifies sink nodes within agent scope', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.sinks).toBeDefined();
    // artifact-ts-mem-3 is a sink (only inbound edges)
    expect(stats.sinks).toContain('artifact-ts-mem-3');
  });

  it('identifies source nodes within agent scope', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.sources).toBeDefined();
    // learning-ts-mem-1 is a source (only outbound edges)
    expect(stats.sources).toContain('learning-ts-mem-1');
  });

  it('calculates connectivity percentage for agent graph', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.connectivity).toBeDefined();
    expect(stats.connectivity).toBeGreaterThan(0);
    expect(stats.connectivity).toBeLessThanOrEqual(100);
  });

  it('groups memories by type within agent scope', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.byType).toBeDefined();
    expect(stats.byType.learning).toBe(1);
    expect(stats.byType.decision).toBe(1);
    expect(stats.byType.artifact).toBe(1);
  });

  it('includes agent scope indicator in output', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.scope).toBe('agent:typescript-pro');
  });

  it('calculates health score for agent graph', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.healthScore).toBeDefined();
    expect(stats.healthScore).toBeGreaterThan(0);
    expect(stats.healthScore).toBeLessThanOrEqual(100);
  });

  it('returns error for non-existent agent', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'nonexistent-agent' },
    };

    const result = await cmdStats(args);

    // Should return stats for empty agent (0 nodes, 0 edges)
    expect(result.status).toBe('success');
    const stats = result.data as any;
    expect(stats.totalNodes).toBe(0);
    expect(stats.totalEdges).toBe(0);
  });

  it('handles agent with no links (all orphans)', async () => {
    // Create isolated agent
    await writeMemory({
      id: 'learning-isolated-mem-1',
      type: MemoryType.Learning,
      title: 'Isolated',
      content: 'No links',
      tags: [],
      scope: Scope.AgentProject,
      agent: 'isolated-agent',
      basePath: testDir,
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'isolated-agent' },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.totalNodes).toBe(1);
    expect(stats.totalEdges).toBe(0);
    expect(stats.linkRatio).toBe(0);
    expect(stats.connectivity).toBe(0);
  });

  it('compares agent stats with --include-shared', async () => {
    // Add project memory
    // Note: Project scope in a git repo is <cwd>/.claude/memory/
    await writeMemory({
      id: 'artifact-project-mem-1',
      type: MemoryType.Artifact,
      title: 'Project Artifact',
      content: 'Shared',
      tags: [],
      scope: Scope.Project,
      basePath: path.join(testDir, '.claude', 'memory'),
    });

    // Note: Cross-scope linking (agent <-> project) is Phase D functionality (deferred)
    // This test only verifies that --include-shared includes project memories in stats

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', 'include-shared': true },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    // Should include project memory in node count
    expect(stats.totalNodes).toBe(4); // 3 agent + 1 project
    // Edges remain the same (only agent-to-agent links, no cross-scope)
    expect(stats.totalEdges).toBe(2);
  });

  it('outputs stats in JSON format when flag set', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', json: true },
    };

    const result = await cmdStats(args);

    expect(result.status).toBe('success');
    expect(typeof result.data).toBe('object');

    // Should be valid JSON-serializable
    const jsonStr = JSON.stringify(result.data);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.totalNodes).toBeDefined();
  });

  it('shows growth trends when historical data available', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', trends: true },
    };

    const result = await cmdStats(args);
    const stats = result.data as any;

    expect(stats.trends).toBeDefined();
    // Even with no historical data, structure should be present
    expect(stats.trends).toHaveProperty('growth');
  });
});
