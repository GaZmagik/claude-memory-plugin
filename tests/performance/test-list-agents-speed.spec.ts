/**
 * Performance Tests for Agent Listing (Phase G - T139)
 *
 * Verifies that listing agents completes within 200ms,
 * even with multiple agents present in the project.
 *
 * Uses real filesystem temp directories (not mocks) to avoid
 * the saveGraph corruption gotcha.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { scanAgentDirectories } from '../../skills/memory/src/agents/scan-agent-directories.js';
import { Scope, MemoryType } from '../../skills/memory/src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('Agent listing performance (<200ms)', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-list-agents-'));
    fs.mkdirSync(path.join(testDir, '.git'));
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Listing with few agents', () => {
    it('should list 3 agents in <200ms', async () => {
      // Create three agents
      for (const agent of ['alpha', 'beta', 'gamma']) {
        await writeMemory({
          id: `learning-${agent}-list`,
          type: MemoryType.Learning,
          title: `${agent} Memory`,
          content: `Memory for agent ${agent}.`,
          tags: ['performance'],
          scope: Scope.AgentProject,
          agent,
          projectRoot: testDir,
        });
      }

      const start = performance.now();

      const agents = await scanAgentDirectories({
        projectRoot: testDir,
        scope: Scope.AgentProject,
      });

      const duration = performance.now() - start;

      expect(agents).toHaveLength(3);
      expect(agents.map(a => a.name).sort()).toEqual(['alpha', 'beta', 'gamma']);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Listing with many agents', () => {
    it('should list 10 agents in <200ms', async () => {
      // Create ten agents
      const agentNames = Array.from({ length: 10 }, (_, i) => `agent-${String(i).padStart(2, '0')}`);

      for (const agent of agentNames) {
        await writeMemory({
          id: `learning-${agent}-list`,
          type: MemoryType.Learning,
          title: `${agent} Memory`,
          content: `Memory for agent ${agent}.`,
          tags: ['performance'],
          scope: Scope.AgentProject,
          agent,
          projectRoot: testDir,
        });
      }

      const start = performance.now();

      const agents = await scanAgentDirectories({
        projectRoot: testDir,
        scope: Scope.AgentProject,
      });

      const duration = performance.now() - start;

      expect(agents).toHaveLength(10);
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Listing with stats', () => {
    it('should list agents with stats in <200ms', async () => {
      // Create agents with multiple memories each
      for (const agent of ['stats-a', 'stats-b', 'stats-c']) {
        for (let i = 0; i < 3; i++) {
          await writeMemory({
            id: `learning-${agent}-${i}`,
            type: MemoryType.Learning,
            title: `${agent} Memory ${i}`,
            content: `Memory ${i} for agent ${agent}.`,
            tags: ['performance'],
            scope: Scope.AgentProject,
            agent,
            projectRoot: testDir,
          });
        }
      }

      const start = performance.now();

      const agents = await scanAgentDirectories({
        projectRoot: testDir,
        scope: Scope.AgentProject,
        includeStats: true,
      });

      const duration = performance.now() - start;

      expect(agents).toHaveLength(3);
      // Each agent should have stats populated
      for (const agent of agents) {
        expect(agent.memoryCount).toBeDefined();
        expect(agent.memoryCount).toBe(3);
      }
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Listing empty project', () => {
    it('should return empty list in <200ms when no agents exist', async () => {
      const start = performance.now();

      const agents = await scanAgentDirectories({
        projectRoot: testDir,
        scope: Scope.AgentProject,
      });

      const duration = performance.now() - start;

      expect(agents).toHaveLength(0);
      expect(duration).toBeLessThan(200);
    });
  });
});
