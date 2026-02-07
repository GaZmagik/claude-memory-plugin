/**
 * Integration Tests for Agent Directory Auto-Creation (Phase G - T135)
 *
 * Tests that agent directories are automatically created on first write,
 * including permanent/, temporary/ subdirectories, index.json, and graph.json.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';
import { getAgentDirectoryPath } from '../../skills/memory/src/scope/get-agent-directory-path.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Agent directory auto-creation on first write', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-autodir-test-'));
    fs.mkdirSync(path.join(testDir, '.git'));
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Directory structure creation', () => {
    it('should create agents/ parent directory on first agent write', async () => {
      const agentsParent = path.join(testDir, '.claude', 'memory', 'agents');
      expect(fs.existsSync(agentsParent)).toBe(false);

      await writeMemory({
        id: 'learning-first-write',
        type: MemoryType.Learning,
        title: 'First Write',
        content: 'Triggers directory creation.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'new-agent',
        projectRoot: testDir,
      });

      expect(fs.existsSync(agentsParent)).toBe(true);
    });

    it('should create permanent/ subdirectory', async () => {
      await writeMemory({
        id: 'learning-perm-dir',
        type: MemoryType.Learning,
        title: 'Permanent Dir Test',
        content: 'Tests permanent directory creation.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'dir-test-agent',
        projectRoot: testDir,
      });

      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'dir-test-agent',
        projectRoot: testDir,
      });

      expect(fs.existsSync(path.join(agentDir, 'permanent'))).toBe(true);
    });

    it('should create temporary/ subdirectory', async () => {
      await writeMemory({
        id: 'learning-temp-dir',
        type: MemoryType.Learning,
        title: 'Temporary Dir Test',
        content: 'Tests temporary directory creation.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'temp-dir-agent',
        projectRoot: testDir,
      });

      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'temp-dir-agent',
        projectRoot: testDir,
      });

      expect(fs.existsSync(path.join(agentDir, 'temporary'))).toBe(true);
    });

    it('should create index.json on first write', async () => {
      await writeMemory({
        id: 'learning-index-create',
        type: MemoryType.Learning,
        title: 'Index Creation Test',
        content: 'Triggers index.json creation.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'index-agent',
        projectRoot: testDir,
      });

      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'index-agent',
        projectRoot: testDir,
      });

      const indexPath = path.join(agentDir, 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      expect(index.memories).toBeDefined();
      expect(Array.isArray(index.memories)).toBe(true);
      expect(index.memories.length).toBeGreaterThanOrEqual(1);

      const entry = index.memories.find(
        (m: { id: string }) => m.id === 'learning-index-create'
      );
      expect(entry).toBeDefined();
    });

    it('should create graph.json on first write', async () => {
      await writeMemory({
        id: 'learning-graph-create',
        type: MemoryType.Learning,
        title: 'Graph Creation Test',
        content: 'Triggers graph.json creation.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'graph-agent',
        projectRoot: testDir,
      });

      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'graph-agent',
        projectRoot: testDir,
      });

      const graphPath = path.join(agentDir, 'graph.json');
      expect(fs.existsSync(graphPath)).toBe(true);

      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      expect(graph.nodes).toBeDefined();
      expect(Array.isArray(graph.nodes)).toBe(true);
    });
  });

  describe('Idempotent directory creation', () => {
    it('should not fail on second write to same agent', async () => {
      const writeOpts = {
        type: MemoryType.Learning as const,
        tags: ['testing'],
        scope: Scope.AgentProject as const,
        agent: 'idempotent-agent',
        projectRoot: testDir,
      };

      const result1 = await writeMemory({
        ...writeOpts,
        id: 'learning-idempotent-1',
        title: 'First Write',
        content: 'First memory.',
      });
      expect(result1.status).toBe('success');

      const result2 = await writeMemory({
        ...writeOpts,
        id: 'learning-idempotent-2',
        title: 'Second Write',
        content: 'Second memory.',
      });
      expect(result2.status).toBe('success');

      // Both should be readable
      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'idempotent-agent',
        projectRoot: testDir,
      });

      expect(
        fs.existsSync(path.join(agentDir, 'permanent', 'learning-idempotent-1.md'))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(agentDir, 'permanent', 'learning-idempotent-2.md'))
      ).toBe(true);
    });
  });

  describe('Multiple agents in same project', () => {
    it('should create separate directories for each agent', async () => {
      await writeMemory({
        id: 'learning-multi-a',
        type: MemoryType.Learning,
        title: 'Agent A Memory',
        content: 'Belongs to agent A.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-alpha',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-multi-b',
        type: MemoryType.Learning,
        title: 'Agent B Memory',
        content: 'Belongs to agent B.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-beta',
        projectRoot: testDir,
      });

      const alphaDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'agent-alpha',
        projectRoot: testDir,
      });
      const betaDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'agent-beta',
        projectRoot: testDir,
      });

      expect(fs.existsSync(alphaDir)).toBe(true);
      expect(fs.existsSync(betaDir)).toBe(true);
      expect(alphaDir).not.toBe(betaDir);

      // Each should have their own permanent/ directory with their own file
      expect(
        fs.existsSync(path.join(alphaDir, 'permanent', 'learning-multi-a.md'))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(betaDir, 'permanent', 'learning-multi-b.md'))
      ).toBe(true);

      // Cross-contamination check
      expect(
        fs.existsSync(path.join(alphaDir, 'permanent', 'learning-multi-b.md'))
      ).toBe(false);
      expect(
        fs.existsSync(path.join(betaDir, 'permanent', 'learning-multi-a.md'))
      ).toBe(false);
    });
  });

  describe('Agent name sanitisation during creation', () => {
    it('should sanitise agent names with uppercase letters', async () => {
      const result = await writeMemory({
        id: 'learning-sanitise-upper',
        type: MemoryType.Learning,
        title: 'Uppercase Agent',
        content: 'Agent name should be lowercased.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'TypeScript-Pro',
        projectRoot: testDir,
      });

      expect(result.status).toBe('success');

      // Should be stored under sanitised (lowercase) name
      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'typescript-pro',
        projectRoot: testDir,
      });
      expect(fs.existsSync(agentDir)).toBe(true);
      expect(
        fs.existsSync(path.join(agentDir, 'permanent', 'learning-sanitise-upper.md'))
      ).toBe(true);
    });

    it('should reject invalid agent names', async () => {
      const result = await writeMemory({
        id: 'learning-invalid-agent',
        type: MemoryType.Learning,
        title: 'Invalid Agent',
        content: 'Should fail.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: '',
        projectRoot: testDir,
      });

      expect(result.status).toBe('error');
    });
  });

  describe('Agent field in frontmatter', () => {
    it('should include agent field in written memory frontmatter', async () => {
      await writeMemory({
        id: 'learning-frontmatter-agent',
        type: MemoryType.Learning,
        title: 'Frontmatter Agent Test',
        content: 'Should have agent in frontmatter.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'frontmatter-test',
        projectRoot: testDir,
      });

      const agentDir = getAgentDirectoryPath({
        scope: Scope.AgentProject,
        agentName: 'frontmatter-test',
        projectRoot: testDir,
      });
      const filePath = path.join(agentDir, 'permanent', 'learning-frontmatter-agent.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content).toContain('agent: frontmatter-test');
    });
  });
});
