/**
 * TD11/TD12/TD13: Integration tests for cross-scope linking via CLI
 *
 * Tests that cmdLink properly creates cross-scope edges using --agent and --target-agent flags.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cmdLink } from '../../src/cli/commands/graph.js';
import { writeMemory } from '../../src/core/write.js';
import { loadGraph } from '../../src/graph/structure.js';
import { Scope, MemoryType } from '../../src/types/enums.js';
import type { ParsedArgs } from '../../src/cli/parser.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Capture safe cwd before any test manipulation

describe('Cross-scope linking via CLI', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-scope-link-test-'));
    process.chdir(testDir);
    fs.mkdirSync('.git');

    // Create an agent memory (ts-expert)
    await writeMemory({
      id: 'learning-ts-pattern',
      type: MemoryType.Learning,
      title: 'TypeScript Pattern',
      content: 'Agent-specific TS knowledge',
      tags: ['typescript'],
      scope: Scope.AgentProject,
      agent: 'ts-expert',
      projectRoot: testDir,
    });

    // Create a project-level memory
    await writeMemory({
      id: 'decision-api-design',
      type: MemoryType.Decision,
      title: 'API Design Decision',
      content: 'Project-wide API decision',
      tags: ['api'],
      scope: Scope.Project,
      basePath: path.join(testDir, '.claude', 'memory'),
    });

    // Create a second agent memory (rust-expert)
    await writeMemory({
      id: 'learning-rust-safety',
      type: MemoryType.Learning,
      title: 'Rust Safety Pattern',
      content: 'Agent-specific Rust knowledge',
      tags: ['rust'],
      scope: Scope.AgentProject,
      agent: 'rust-expert',
      projectRoot: testDir,
    });
  });

  afterEach(() => {
    process.chdir(os.homedir());
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('TD11: --agent flag (agent → project cross-scope)', () => {
    it('creates cross-scope edge in both agent and project graphs', async () => {
      const args: ParsedArgs = {
        positional: ['learning-ts-pattern', 'decision-api-design'],
        flags: {
          agent: 'ts-expert',
          relation: 'informs',
        },
      };

      const result = await cmdLink(args);
      expect(result.status).toBe('success');

      // Verify agent graph has the edge
      const agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');
      const agentGraph = await loadGraph(agentBasePath);
      const agentEdge = agentGraph.edges.find(
        e => e.source === 'learning-ts-pattern' && e.target === 'decision-api-design'
      );
      expect(agentEdge).toBeDefined();
      expect(agentEdge!.sourceScope).toBe('agent-project');
      expect(agentEdge!.targetScope).toBe('project');
      expect(agentEdge!.sourceAgent).toBe('ts-expert');

      // Verify project graph also has the edge
      const projectBasePath = path.join(testDir, '.claude', 'memory');
      const projectGraph = await loadGraph(projectBasePath);
      const projectEdge = projectGraph.edges.find(
        e => e.source === 'learning-ts-pattern' && e.target === 'decision-api-design'
      );
      expect(projectEdge).toBeDefined();
      expect(projectEdge!.sourceScope).toBe('agent-project');
      expect(projectEdge!.targetScope).toBe('project');
    });
  });

  describe('TD12: --target-agent flag (project → agent cross-scope)', () => {
    it('creates cross-scope edge in both project and agent graphs', async () => {
      const args: ParsedArgs = {
        positional: ['decision-api-design', 'learning-ts-pattern'],
        flags: {
          'target-agent': 'ts-expert',
          relation: 'relates-to',
        },
      };

      const result = await cmdLink(args);
      expect(result.status).toBe('success');

      // Verify project graph has the edge
      const projectBasePath = path.join(testDir, '.claude', 'memory');
      const projectGraph = await loadGraph(projectBasePath);
      const projectEdge = projectGraph.edges.find(
        e => e.source === 'decision-api-design' && e.target === 'learning-ts-pattern'
      );
      expect(projectEdge).toBeDefined();
      expect(projectEdge!.sourceScope).toBe('project');
      expect(projectEdge!.targetScope).toBe('agent-project');
      expect(projectEdge!.targetAgent).toBe('ts-expert');

      // Verify agent graph also has the edge
      const agentBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');
      const agentGraph = await loadGraph(agentBasePath);
      const agentEdge = agentGraph.edges.find(
        e => e.source === 'decision-api-design' && e.target === 'learning-ts-pattern'
      );
      expect(agentEdge).toBeDefined();
    });
  });

  describe('TD13: --agent and --target-agent (agent → agent cross-scope)', () => {
    it('creates cross-scope edge in both agent graphs', async () => {
      const args: ParsedArgs = {
        positional: ['learning-ts-pattern', 'learning-rust-safety'],
        flags: {
          agent: 'ts-expert',
          'target-agent': 'rust-expert',
          relation: 'relates-to',
        },
      };

      const result = await cmdLink(args);
      expect(result.status).toBe('success');

      // Verify ts-expert graph has the edge
      const tsBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'ts-expert');
      const tsGraph = await loadGraph(tsBasePath);
      const tsEdge = tsGraph.edges.find(
        e => e.source === 'learning-ts-pattern' && e.target === 'learning-rust-safety'
      );
      expect(tsEdge).toBeDefined();
      expect(tsEdge!.sourceScope).toBe('agent-project');
      expect(tsEdge!.targetScope).toBe('agent-project');
      expect(tsEdge!.sourceAgent).toBe('ts-expert');
      expect(tsEdge!.targetAgent).toBe('rust-expert');

      // Verify rust-expert graph also has the edge
      const rustBasePath = path.join(testDir, '.claude', 'memory', 'agents', 'rust-expert');
      const rustGraph = await loadGraph(rustBasePath);
      const rustEdge = rustGraph.edges.find(
        e => e.source === 'learning-ts-pattern' && e.target === 'learning-rust-safety'
      );
      expect(rustEdge).toBeDefined();
      expect(rustEdge!.sourceAgent).toBe('ts-expert');
      expect(rustEdge!.targetAgent).toBe('rust-expert');
    });
  });
});
