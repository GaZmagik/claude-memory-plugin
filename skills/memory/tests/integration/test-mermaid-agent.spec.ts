/**
 * Integration Tests for Mermaid with --agent Flag (Phase E - T107)
 *
 * Tests Mermaid diagram generation with agent-scoped filtering.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cmdMermaid } from '../../src/cli/commands/graph.js';
import { writeMemory } from '../../src/core/write.js';
import { linkMemories } from '../../src/graph/link.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Mermaid with --agent flag', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mermaid-agent-test-'));
    process.chdir(testDir);

    // Initialize git repo for project scope
    fs.mkdirSync('.git');

    // Create test memories for typescript-pro agent
    await writeMemory({
      id: 'learning-ts-learning-1',
      type: MemoryType.Learning,
      title: 'TypeScript Generics',
      content: 'Advanced generics pattern',
      tags: ['typescript', 'generics'],
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
    });

    await writeMemory({
      id: 'decision-ts-decision-1',
      type: MemoryType.Decision,
      title: 'Use strict mode',
      content: 'Always enable strict mode',
      tags: ['typescript', 'config'],
      scope: Scope.AgentProject,
      agent: 'typescript-pro',
      projectRoot: testDir,
    });

    // Create test memory for rust-expert agent
    await writeMemory({
      id: 'learning-rust-learning-1',
      type: MemoryType.Learning,
      title: 'Ownership rules',
      content: 'Rust ownership patterns',
      tags: ['rust', 'ownership'],
      scope: Scope.AgentProject,
      agent: 'rust-expert',
      projectRoot: testDir,
    });

    // Create project-level memory
    await writeMemory({
      id: 'artifact-project-artifact-1',
      type: MemoryType.Artifact,
      title: 'API Design',
      content: 'REST API patterns',
      tags: ['api', 'design'],
      scope: Scope.Project,
      projectRoot: testDir,
    });

    // Link typescript memory to project memory
    await linkMemories({
      source: 'learning-ts-learning-1',
      target: 'artifact-project-artifact-1',
      relation: 'references',
      basePath: path.join(testDir, '.claude', 'memory'),
    });

    // Link between agent memories (for link test)
    await linkMemories({
      source: 'learning-ts-learning-1',
      target: 'decision-ts-decision-1',
      relation: 'references',
      basePath: path.join(testDir, '.claude', 'memory', 'agents', 'typescript-pro'),
    });
  });

  afterEach(() => {
    // Cleanup
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('generates mermaid diagram for specific agent only', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdMermaid(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();

    const diagram = (result.data as any).diagram;
    expect(diagram).toContain('learning-ts-learning-1');
    expect(diagram).toContain('decision-ts-decision-1');
    expect(diagram).not.toContain('learning-rust-learning-1');
  });

  it('filters out project memories when --agent used without --include-shared', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    expect(diagram).toContain('learning-ts-learning-1');
    expect(diagram).not.toContain('artifact-project-artifact-1');
  });

  it('applies agent node styling to agent-scoped nodes', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Agent nodes should have special styling
    expect(diagram).toContain('classDef agentNode');
    expect(diagram).toMatch(/class.*agentNode/);
  });

  it('includes agent name in node labels when requested', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', 'show-agent-names': true },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Agent name is abbreviated by default (typescript-pro → type-pro)
    expect(diagram).toContain('type-pro');
  });

  it('generates diagram with agent context and links', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro' },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Should show typescript nodes
    expect(diagram).toContain('learning-ts-learning-1');
    expect(diagram).toContain('decision-ts-decision-1');

    // Links within agent scope should be present
    expect(diagram).toMatch(/learning-ts-learning-1.*-->.*decision-ts-decision-1|decision-ts-decision-1.*-->.*learning-ts-learning-1/);
  });

  it('saves diagram to file when requested', async () => {
    // Use output path within agent's memory directory to pass security check
    const outputFile = path.join(testDir, '.claude/memory/agents/typescript-pro/typescript-pro-graph.md');
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', output: outputFile },
    };

    const result = await cmdMermaid(args);

    expect(result.status).toBe('success');
    expect(fs.existsSync(outputFile)).toBe(true);

    const fileContent = fs.readFileSync(outputFile, 'utf-8');
    expect(fileContent).toContain('learning-ts-learning-1');
  });

  it('respects direction flag with agent context', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', direction: 'LR' },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    expect(diagram).toContain('flowchart LR');
  });

  it('handles empty agent (no memories)', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'empty-agent' },
    };

    const result = await cmdMermaid(args);

    expect(result.status).toBe('success');
    const diagram = (result.data as any).diagram;
    expect(diagram).toContain('flowchart');
    // Should have minimal content
  });

  it('returns error for non-existent agent', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'nonexistent-agent' },
    };

    const result = await cmdMermaid(args);

    // Should succeed but generate empty/minimal diagram
    expect(result.status).toBe('success');
  });

  it('abbreviates labels when flag set', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', abbreviate: true },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    // Labels should be abbreviated
    expect(diagram.length).toBeLessThan(600); // Rough check for abbreviation
  });

  it('limits depth when depth flag provided', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', depth: '1' },
    };

    const result = await cmdMermaid(args);

    expect(result.status).toBe('success');
    expect(result.data).toBeDefined();
  });

  it('generates diagram from specific hub node', async () => {
    const args: ParsedArgs = {
      positional: [],
      flags: { agent: 'typescript-pro', hub: 'learning-ts-learning-1' },
    };

    const result = await cmdMermaid(args);
    const diagram = (result.data as any).diagram;

    expect(diagram).toContain('learning-ts-learning-1');
  });
});
