/**
 * Integration Tests for Full Agent Workflow (Phase G - T132)
 *
 * Tests complete agent lifecycle: write → read → link → delete
 * Verifies end-to-end agent-scoped memory operations work correctly.
 *
 * Note: Uses basePath instead of process.chdir() since vitest workers
 * do not support process.chdir().
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { readMemory } from '../../skills/memory/src/core/read.js';
import { deleteMemory } from '../../skills/memory/src/core/delete.js';
import { linkMemories } from '../../skills/memory/src/graph/link.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';
import { getAgentDirectoryPath } from '../../skills/memory/src/scope/get-agent-directory-path.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/** Helper: resolve the agent directory path for a given agent in a test dir */
function agentBasePath(testDir: string, agentName: string): string {
  return getAgentDirectoryPath({
    scope: Scope.AgentProject,
    agentName,
    projectRoot: testDir,
  });
}

describe('Full agent workflow (write → read → link → delete)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-workflow-test-'));
    fs.mkdirSync(path.join(testDir, '.git'));
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Single agent write → read → delete lifecycle', () => {
    it('should write a memory with agent scope', async () => {
      const result = await writeMemory({
        id: 'learning-test-workflow-1',
        type: MemoryType.Learning,
        title: 'Test Workflow Learning',
        content: 'This is a test learning for the agent workflow.',
        tags: ['testing', 'workflow'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      expect(result.status).toBe('success');
      expect(result.memory?.id).toBe('learning-test-workflow-1');
    });

    it('should read back a memory written with agent scope', async () => {
      await writeMemory({
        id: 'learning-read-back-1',
        type: MemoryType.Learning,
        title: 'Read Back Test',
        content: 'Content to read back.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'test-agent');
      const result = await readMemory({
        id: 'learning-read-back-1',
        basePath,
      });

      expect(result.status).toBe('success');
      expect(result.memory).toBeDefined();
      expect(result.memory!.frontmatter.title).toBe('Read Back Test');
      expect(result.memory!.content).toContain('Content to read back.');
    });

    it('should delete a memory from agent scope', async () => {
      await writeMemory({
        id: 'learning-delete-test-1',
        type: MemoryType.Learning,
        title: 'Delete Test',
        content: 'This will be deleted.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'test-agent');

      const deleteResult = await deleteMemory({
        id: 'learning-delete-test-1',
        basePath,
      });
      expect(deleteResult.status).toBe('success');

      const readResult = await readMemory({
        id: 'learning-delete-test-1',
        basePath,
      });
      expect(readResult.status).toBe('error');
    });
  });

  describe('Agent-scoped link operations', () => {
    it('should link two memories within the same agent scope', async () => {
      await writeMemory({
        id: 'decision-link-source',
        type: MemoryType.Decision,
        title: 'Source Decision',
        content: 'This decision leads to a learning.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-link-target',
        type: MemoryType.Learning,
        title: 'Target Learning',
        content: 'This learning follows from the decision.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'test-agent');
      const linkResult = await linkMemories({
        source: 'decision-link-source',
        target: 'learning-link-target',
        relation: 'led-to',
        basePath,
      });

      expect(linkResult.status).toBe('success');
    });

    it('should preserve links in graph.json', async () => {
      await writeMemory({
        id: 'decision-linked-1',
        type: MemoryType.Decision,
        title: 'Linked Decision',
        content: 'Decision content.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-linked-1',
        type: MemoryType.Learning,
        title: 'Linked Learning',
        content: 'Learning content.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'test-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'test-agent');
      await linkMemories({
        source: 'decision-linked-1',
        target: 'learning-linked-1',
        relation: 'led-to',
        basePath,
      });

      const graphPath = path.join(basePath, 'graph.json');
      expect(fs.existsSync(graphPath)).toBe(true);

      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      const edge = graph.edges.find(
        (e: any) => e.source === 'decision-linked-1' && e.target === 'learning-linked-1'
      );
      expect(edge).toBeDefined();
      expect(edge.label).toBe('led-to');
    });
  });

  describe('Complete lifecycle: write → read → link → delete', () => {
    it('should complete full lifecycle for an agent', async () => {
      const agentName = 'lifecycle-agent';

      // Step 1: Write two memories
      const write1 = await writeMemory({
        id: 'gotcha-lifecycle-1',
        type: MemoryType.Gotcha,
        title: 'Lifecycle Gotcha',
        content: 'A gotcha discovered during testing.',
        tags: ['lifecycle', 'testing'],
        scope: Scope.AgentProject,
        agent: agentName,
        projectRoot: testDir,
      });
      expect(write1.status).toBe('success');

      const write2 = await writeMemory({
        id: 'decision-lifecycle-1',
        type: MemoryType.Decision,
        title: 'Lifecycle Decision',
        content: 'A decision made during testing.',
        tags: ['lifecycle', 'testing'],
        scope: Scope.AgentProject,
        agent: agentName,
        projectRoot: testDir,
      });
      expect(write2.status).toBe('success');

      const basePath = agentBasePath(testDir, agentName);

      // Step 2: Read both back
      const read1 = await readMemory({ id: 'gotcha-lifecycle-1', basePath });
      expect(read1.status).toBe('success');
      expect(read1.memory!.frontmatter.title).toBe('Lifecycle Gotcha');

      const read2 = await readMemory({ id: 'decision-lifecycle-1', basePath });
      expect(read2.status).toBe('success');
      expect(read2.memory!.frontmatter.title).toBe('Lifecycle Decision');

      // Step 3: Link them
      const link = await linkMemories({
        source: 'gotcha-lifecycle-1',
        target: 'decision-lifecycle-1',
        relation: 'informed-by',
        basePath,
      });
      expect(link.status).toBe('success');

      // Step 4: Delete one
      const del = await deleteMemory({ id: 'gotcha-lifecycle-1', basePath });
      expect(del.status).toBe('success');

      // Step 5: Verify deleted memory is gone but other remains
      const readDeleted = await readMemory({ id: 'gotcha-lifecycle-1', basePath });
      expect(readDeleted.status).toBe('error');

      const readRemaining = await readMemory({ id: 'decision-lifecycle-1', basePath });
      expect(readRemaining.status).toBe('success');
    });
  });

  describe('Multiple agents isolation', () => {
    it('should isolate memories between different agents', async () => {
      await writeMemory({
        id: 'learning-isolation-a',
        type: MemoryType.Learning,
        title: 'Agent A Learning',
        content: 'Belongs to agent A.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-alpha',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-isolation-b',
        type: MemoryType.Learning,
        title: 'Agent B Learning',
        content: 'Belongs to agent B.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'agent-beta',
        projectRoot: testDir,
      });

      // Agent A's memory should not be readable from agent B's scope
      const betaPath = agentBasePath(testDir, 'agent-beta');
      const crossRead = await readMemory({
        id: 'learning-isolation-a',
        basePath: betaPath,
      });
      expect(crossRead.status).toBe('error');

      // But should be readable from agent A's scope
      const alphaPath = agentBasePath(testDir, 'agent-alpha');
      const correctRead = await readMemory({
        id: 'learning-isolation-a',
        basePath: alphaPath,
      });
      expect(correctRead.status).toBe('success');
    });
  });

  describe('Agent directory structure', () => {
    it('should create correct directory structure on first write', async () => {
      await writeMemory({
        id: 'learning-dir-structure',
        type: MemoryType.Learning,
        title: 'Directory Structure Test',
        content: 'Testing directory creation.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'structure-test',
        projectRoot: testDir,
      });

      const agentDir = agentBasePath(testDir, 'structure-test');
      expect(fs.existsSync(agentDir)).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'permanent'))).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'index.json'))).toBe(true);
      expect(fs.existsSync(path.join(agentDir, 'graph.json'))).toBe(true);
    });

    it('should store memory file in correct location', async () => {
      await writeMemory({
        id: 'learning-file-location',
        type: MemoryType.Learning,
        title: 'File Location Test',
        content: 'Testing file placement.',
        tags: ['testing'],
        scope: Scope.AgentProject,
        agent: 'location-test',
        projectRoot: testDir,
      });

      const agentDir = agentBasePath(testDir, 'location-test');
      const memoryFile = path.join(agentDir, 'permanent', 'learning-file-location.md');
      expect(fs.existsSync(memoryFile)).toBe(true);

      const content = fs.readFileSync(memoryFile, 'utf-8');
      expect(content).toContain('title: File Location Test');
      expect(content).toContain('agent: location-test');
    });
  });
});
