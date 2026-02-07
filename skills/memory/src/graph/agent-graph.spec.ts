/**
 * T029: Unit test for agent graph initialisation
 *
 * Tests that graph operations work correctly with agent directories.
 * Note: Graphs don't store agent/scope metadata - those are in frontmatter/index.
 * These tests verify that graph files can be loaded/saved in agent directories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoryId } from '../test-utils/branded-helpers.js';
import { loadGraph, saveGraph, addNode } from './structure.js';
import { MemoryType } from '../types/enums.js';
import * as fsUtils from '../core/fs-utils.js';

describe('Agent graph operations', () => {
  const mockAgentPath = '/test/.claude/memory/agents/typescript-expert';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadGraph from agent directory', () => {
    it('should load graph from agent directory', async () => {
      const mockGraphContent = {
        version: 1,
        nodes: [
          {
            id: memoryId('learning-typescript-pattern'),
            type: MemoryType.Learning,
            title: 'TypeScript Pattern',
          },
        ],
        edges: [],
      };

      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);
      vi.spyOn(fsUtils, 'readFile').mockResolvedValue(JSON.stringify(mockGraphContent));

      const result = await loadGraph(mockAgentPath);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0]!.type).toBe(MemoryType.Learning);
      expect(result.nodes[0]!.title).toBe('TypeScript Pattern');
    });

    it('should create new graph if agent directory has no graph', async () => {
      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(false);

      const result = await loadGraph(mockAgentPath);

      expect(result.version).toBe(1);
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });
  });

  describe('saveGraph to agent directory', () => {
    it('should save graph to agent directory', async () => {
      const mockGraph = {
        version: 1,
        nodes: [
          {
            id: memoryId('learning-test'),
            type: MemoryType.Learning,
            title: 'Test Learning',
          },
        ],
        edges: [],
      };

      vi.spyOn(fsUtils, 'ensureDir').mockResolvedValue(undefined);
      const writeFileSpy = vi.spyOn(fsUtils, 'writeFileAtomic').mockResolvedValue(undefined);

      await saveGraph(mockAgentPath, mockGraph);

      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining('graph.json'),
        expect.any(String)
      );
    });
  });

  describe('addNode in agent graph', () => {
    it('should add node to graph in agent directory', () => {
      const existingGraph = {
        version: 1,
        nodes: [],
        edges: [],
      };

      const newNodeId = memoryId('learning-new');
      const newNode = {
        id: newNodeId,
        type: MemoryType.Learning,
        title: 'New Learning',
      };

      const updatedGraph = addNode(existingGraph, newNode);

      expect(updatedGraph.nodes).toHaveLength(1);
      expect(updatedGraph.nodes[0]!.type).toBe(MemoryType.Learning);
      expect(updatedGraph.nodes[0]!.title).toBe('New Learning');
    });
  });

  describe('graph isolation between agents', () => {
    it('should maintain separate graph files for different agents', async () => {
      const agent1Path = '/test/.claude/memory/agents/typescript-expert';
      const agent2Path = '/test/.claude/memory/agents/rust-expert';

      vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(true);

      // Mock different graphs for different agents
      vi.spyOn(fsUtils, 'readFile').mockImplementation(async (filePath: string) => {
        if (filePath.includes('typescript-expert')) {
          return JSON.stringify({
            version: 1,
            nodes: [
              {
                id: memoryId('learning-ts'),
                type: MemoryType.Learning,
                title: 'TypeScript Learning',
              },
            ],
            edges: [],
          });
        } else {
          return JSON.stringify({
            version: 1,
            nodes: [
              {
                id: memoryId('learning-rust'),
                type: MemoryType.Learning,
                title: 'Rust Learning',
              },
            ],
            edges: [],
          });
        }
      });

      const graph1 = await loadGraph(agent1Path);
      const graph2 = await loadGraph(agent2Path);

      // Verify they loaded different graphs
      expect(graph1.nodes).toHaveLength(1);
      expect(graph1.nodes[0]!.id).toBe(memoryId('learning-ts'));

      expect(graph2.nodes).toHaveLength(1);
      expect(graph2.nodes[0]!.id).toBe(memoryId('learning-rust'));
    });
  });
});
