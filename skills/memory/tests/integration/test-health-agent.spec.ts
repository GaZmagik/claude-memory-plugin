/**
 * Integration Tests for Health with --agent Flag (Phase E - T110)
 *
 * Tests health check command with agent-scoped validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cmdHealth } from '../../src/cli/commands/quality.js';
import { writeMemory } from '../../src/core/write.js';
import { linkMemories } from '../../src/graph/link.js';
import { MemoryType, Scope } from '../../src/types/enums.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Health with --agent flag', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-agent-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('reports healthy agent with well-connected graph', async () => {
    // Create well-connected agent memories
    await writeMemory({
      id: 'learning-agent-mem-1',
      type: MemoryType.Learning,
      title: 'Learning 1',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'healthy-agent',
      basePath: testDir,
      tags: [],
    });

    await writeMemory({
      id: 'decision-agent-mem-2',
      type: MemoryType.Decision,
      title: 'Decision 1',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'healthy-agent',
      basePath: testDir,
      tags: [],
    });

    await linkMemories({
      source: 'learning-agent-mem-1',
      target: 'decision-agent-mem-2',
      basePath: testDir,
      agent: 'healthy-agent',
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'healthy-agent' },
    };

    const result = await cmdHealth(args);

    expect(result.status).toBe('success');
    const health = result.data as any;
    expect(health.score).toBeGreaterThan(70);
    expect(health.status).toBe('healthy');
  });

  it('reports unhealthy agent with orphaned nodes', async () => {
    // Create orphaned memories
    await writeMemory({
      id: 'learning-orphan-1',
      type: MemoryType.Learning,
      title: 'Orphan 1',
      content: 'No links',
      scope: Scope.AgentProject,
      agent: 'unhealthy-agent',
      basePath: testDir,
      tags: [],
    });

    await writeMemory({
      id: 'decision-orphan-2',
      type: MemoryType.Decision,
      title: 'Orphan 2',
      content: 'No links',
      scope: Scope.AgentProject,
      agent: 'unhealthy-agent',
      basePath: testDir,
      tags: [],
    });

    await writeMemory({
      id: 'artifact-orphan-3',
      type: MemoryType.Artifact,
      title: 'Orphan 3',
      content: 'No links',
      scope: Scope.AgentProject,
      agent: 'unhealthy-agent',
      basePath: testDir,
      tags: [],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'unhealthy-agent' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.score).toBeLessThan(50);
    expect(health.orphanedNodes).toHaveLength(3);
    expect(health.issues).toContain('High orphan count');
  });

  it('validates agent scope integrity', async () => {
    await writeMemory({
      id: 'learning-test-mem-1',
      type: MemoryType.Learning,
      title: 'Test',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'test-agent',
      basePath: testDir,
      tags: [],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.integrityChecks).toBeDefined();
    expect(health.integrityChecks.scopeConsistency).toBe(true);
  });

  it('detects missing index entries', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.integrityChecks).toHaveProperty('indexSync');
  });

  it('calculates health score based on multiple factors', async () => {
    await writeMemory({
      id: 'learning-mem-1',
      type: MemoryType.Learning,
      title: 'Learning',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'test-agent',
      basePath: testDir,
      tags: [],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.scoreBreakdown).toBeDefined();
    expect(health.scoreBreakdown).toHaveProperty('connectivity');
    expect(health.scoreBreakdown).toHaveProperty('orphanRatio');
    expect(health.scoreBreakdown).toHaveProperty('integrity');
  });

  it('includes recommendations for improving health', async () => {
    // Create agent with issues
    await writeMemory({
      id: 'learning-orphan-mem',
      type: MemoryType.Learning,
      title: 'Orphan',
      content: 'Unlinked',
      scope: Scope.AgentProject,
      agent: 'needs-improvement',
      basePath: testDir,
      tags: [],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'needs-improvement' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.recommendations).toBeDefined();
    expect(health.recommendations.length).toBeGreaterThan(0);
    expect(health.recommendations[0]).toContain('link');
  });

  it('compares agent health with project baseline', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', compare: 'project' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.comparison).toBeDefined();
    expect(health.comparison).toHaveProperty('projectScore');
    expect(health.comparison).toHaveProperty('delta');
  });

  it('outputs health report in JSON format', async () => {
    await writeMemory({
      id: 'learning-mem-1',
      type: MemoryType.Learning,
      title: 'Test',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'test-agent',
      basePath: testDir,
      tags: [],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', json: true },
    };

    const result = await cmdHealth(args);

    expect(result.status).toBe('success');
    const jsonStr = JSON.stringify(result.data);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.score).toBeDefined();
  });

  it('handles empty agent gracefully', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'empty-agent' },
    };

    const result = await cmdHealth(args);

    expect(result.status).toBe('success');
    const health = result.data as any;
    expect(health.score).toBe(0);
    expect(health.status).toBe('empty');
  });

  it('identifies stale memories in health check', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent', 'check-staleness': true },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.staleMemories).toBeDefined();
  });

  it('validates frontmatter consistency', async () => {
    await writeMemory({
      id: 'learning-mem-1',
      type: MemoryType.Learning,
      title: 'Test',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'test-agent',
      basePath: testDir,
      tags: [],
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.integrityChecks.frontmatterValid).toBe(true);
  });

  it('detects circular dependencies', async () => {
    await writeMemory({
      id: 'learning-mem-1',
      type: MemoryType.Learning,
      title: 'Mem 1',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'test-agent',
      basePath: testDir,
      tags: [],
    });

    await writeMemory({
      id: 'decision-mem-2',
      type: MemoryType.Decision,
      title: 'Mem 2',
      content: 'Content',
      scope: Scope.AgentProject,
      agent: 'test-agent',
      basePath: testDir,
      tags: [],
    });

    // Create circular link
    await linkMemories({
      source: 'learning-mem-1',
      target: 'decision-mem-2',
      basePath: testDir,
      agent: 'test-agent',
    });

    await linkMemories({
      source: 'decision-mem-2',
      target: 'learning-mem-1',
      basePath: testDir,
      agent: 'test-agent',
    });

    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'test-agent' },
    };

    const result = await cmdHealth(args);
    const health = result.data as any;

    expect(health.circularDependencies).toBeDefined();
    expect(health.circularDependencies.length).toBeGreaterThan(0);
  });
});
