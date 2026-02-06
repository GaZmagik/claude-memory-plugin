/**
 * Performance Tests for Agent-Scoped CRUD Operations (Phase G - T137)
 *
 * Verifies that agent-scoped write, read, link, and delete
 * operations each complete within 100ms.
 *
 * Uses real filesystem temp directories (not mocks) to avoid
 * the saveGraph corruption gotcha.
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

describe('Agent-scoped CRUD performance (<100ms per operation)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-crud-'));
    fs.mkdirSync(path.join(testDir, '.git'));
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Write performance', () => {
    it('should write an agent-scoped memory in <500ms (cold start with dir creation)', async () => {
      const start = performance.now();

      await writeMemory({
        id: 'learning-perf-write',
        type: MemoryType.Learning,
        title: 'Performance Write Test',
        content: 'Testing write speed for agent-scoped memories.',
        tags: ['performance', 'testing'],
        scope: Scope.AgentProject,
        agent: 'perf-agent',
        projectRoot: testDir,
      });

      const duration = performance.now() - start;
      // Cold start includes creating agents/, permanent/, temporary/, index.json, graph.json
      // This is significantly slower than subsequent writes due to directory scaffolding
      expect(duration).toBeLessThan(500);
    });

    it('should write a second memory to same agent in <100ms', async () => {
      // First write creates the directory structure
      await writeMemory({
        id: 'learning-perf-warmup',
        type: MemoryType.Learning,
        title: 'Warmup Write',
        content: 'Warmup to create directory structure.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'perf-agent',
        projectRoot: testDir,
      });

      // Second write should be faster (dirs already exist)
      const start = performance.now();

      await writeMemory({
        id: 'decision-perf-second',
        type: MemoryType.Decision,
        title: 'Second Write Test',
        content: 'Testing subsequent write speed.',
        tags: ['performance', 'testing'],
        scope: Scope.AgentProject,
        agent: 'perf-agent',
        projectRoot: testDir,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Read performance', () => {
    it('should read an agent-scoped memory in <100ms', async () => {
      await writeMemory({
        id: 'learning-perf-read',
        type: MemoryType.Learning,
        title: 'Performance Read Test',
        content: 'Testing read speed for agent-scoped memories.',
        tags: ['performance', 'testing'],
        scope: Scope.AgentProject,
        agent: 'perf-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'perf-agent');

      const start = performance.now();

      const result = await readMemory({
        id: 'learning-perf-read',
        basePath,
      });

      const duration = performance.now() - start;
      expect(result.status).toBe('success');
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Link performance', () => {
    it('should link two agent-scoped memories in <100ms', async () => {
      await writeMemory({
        id: 'decision-perf-link-src',
        type: MemoryType.Decision,
        title: 'Link Source',
        content: 'Source for link performance test.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'perf-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-perf-link-tgt',
        type: MemoryType.Learning,
        title: 'Link Target',
        content: 'Target for link performance test.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'perf-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'perf-agent');

      const start = performance.now();

      const result = await linkMemories({
        source: 'decision-perf-link-src',
        target: 'learning-perf-link-tgt',
        relation: 'led-to',
        basePath,
      });

      const duration = performance.now() - start;
      expect(result.status).toBe('success');
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Delete performance', () => {
    it('should delete an agent-scoped memory in <100ms', async () => {
      await writeMemory({
        id: 'learning-perf-delete',
        type: MemoryType.Learning,
        title: 'Performance Delete Test',
        content: 'Testing delete speed for agent-scoped memories.',
        tags: ['performance', 'testing'],
        scope: Scope.AgentProject,
        agent: 'perf-agent',
        projectRoot: testDir,
      });

      const basePath = agentBasePath(testDir, 'perf-agent');

      const start = performance.now();

      const result = await deleteMemory({
        id: 'learning-perf-delete',
        basePath,
      });

      const duration = performance.now() - start;
      expect(result.status).toBe('success');
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Full CRUD cycle performance', () => {
    it('should complete write → read → link → delete cycle in <400ms total', async () => {
      const start = performance.now();

      // Write two memories
      await writeMemory({
        id: 'decision-perf-cycle',
        type: MemoryType.Decision,
        title: 'Cycle Decision',
        content: 'Full cycle performance test.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'cycle-agent',
        projectRoot: testDir,
      });

      await writeMemory({
        id: 'learning-perf-cycle',
        type: MemoryType.Learning,
        title: 'Cycle Learning',
        content: 'Full cycle performance test.',
        tags: ['performance'],
        scope: Scope.AgentProject,
        agent: 'cycle-agent',
        projectRoot: testDir,
      });

      // Read one back
      const basePath = agentBasePath(testDir, 'cycle-agent');
      const readResult = await readMemory({
        id: 'decision-perf-cycle',
        basePath,
      });
      expect(readResult.status).toBe('success');

      // Link them
      const linkResult = await linkMemories({
        source: 'decision-perf-cycle',
        target: 'learning-perf-cycle',
        relation: 'informed-by',
        basePath,
      });
      expect(linkResult.status).toBe('success');

      // Delete one
      const deleteResult = await deleteMemory({
        id: 'learning-perf-cycle',
        basePath,
      });
      expect(deleteResult.status).toBe('success');

      const totalDuration = performance.now() - start;
      // 5 operations × 100ms budget each = 500ms, but we expect better
      expect(totalDuration).toBeLessThan(400);
    });
  });
});
