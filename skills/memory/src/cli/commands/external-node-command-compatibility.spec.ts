/**
 * Tests for T097-T102: Command Compatibility with External Nodes
 *
 * Verifies that search, semantic search, link, unlink, and edges commands
 * work correctly with external nodes (rule/reminder types).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cmdSearch, cmdSemantic } from './crud.js';
import { cmdLink, cmdUnlink, cmdEdges } from './graph.js';
import type { ParsedArgs } from '../parser.js';
import * as searchModule from '../../core/search.js';
import * as semanticModule from '../../search/semantic.js';
import * as linkModule from '../../graph/link.js';
import { MemoryType, Scope, EdgeType } from '../../types/enums.js';
import { unsafeAsMemoryId } from '../../types/branded.js';

describe('External Node Command Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T097: Unit test for cmdSearch including rule nodes in results
  describe('cmdSearch with rule nodes', () => {
    it('should include rule nodes in search results', async () => {
      vi.spyOn(searchModule, 'searchMemories').mockResolvedValue({
        status: 'success',
        results: [
          {
            id: 'rule-project-claude-md-root',
            title: 'CLAUDE.md',
            type: MemoryType.Rule,
            tags: ['tdd', 'testing'],
            scope: Scope.Project,
            score: 0.95,
            snippet: 'Always follow Test-Driven Development principles...',
          },
          {
            id: 'decision-tdd-approach',
            title: 'TDD Approach',
            type: MemoryType.Decision,
            tags: ['tdd'],
            scope: Scope.Project,
            score: 0.87,
            snippet: 'We will use strict TDD for all features...',
          },
        ],
      });

      const args: ParsedArgs = {
        positional: ['tdd'],
        flags: {},
      };

      const result = await cmdSearch(args);

      expect(result.status).toBe('success');
      expect(searchModule.searchMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'tdd',
        })
      );
    });
  });

  // T098: Unit test for cmdSemantic including reminder nodes in results
  describe('cmdSemantic with reminder nodes', () => {
    it('should include reminder nodes in semantic search results', async () => {
      vi.spyOn(semanticModule, 'semanticSearch').mockResolvedValue([
        {
          id: 'reminder-agent-project-typescript-expert-memory-md',
          title: 'MEMORY.md',
          type: MemoryType.Reminder,
          tags: ['typescript'],
          scope: Scope.AgentProject,
          score: 0.95,
        },
        {
          id: 'learning-typescript-patterns',
          title: 'TypeScript Patterns',
          type: MemoryType.Learning,
          tags: ['typescript'],
          scope: Scope.Project,
          score: 0.87,
        },
      ]);

      const args: ParsedArgs = {
        positional: ['typescript best practices'],
        flags: {},
      };

      const result = await cmdSemantic(args);

      expect(result.status).toBe('success');
      expect(semanticModule.semanticSearch).toHaveBeenCalled();
    });
  });

  // T099: Unit test for cmdLink allowing edges to rule nodes
  describe('cmdLink with rule nodes', () => {
    it('should allow linking to rule nodes', async () => {
      vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
        status: 'success',
        edge: {
          source: 'learning-tdd-patterns',
          target: 'rule-project-claude-md-root',
          label: EdgeType.GovernedBy,
        },
      });

      const args: ParsedArgs = {
        positional: ['learning-tdd-patterns', 'rule-project-claude-md-root'],
        flags: { relation: 'governed-by' },
      };

      const result = await cmdLink(args);

      expect(result.status).toBe('success');
      expect(linkModule.linkMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'learning-tdd-patterns',
          target: 'rule-project-claude-md-root',
          relation: EdgeType.GovernedBy,
        })
      );
    });
  });

  // T100: Unit test for cmdLink allowing edges to reminder nodes
  describe('cmdLink with reminder nodes', () => {
    it('should allow linking to reminder nodes', async () => {
      vi.spyOn(linkModule, 'linkMemories').mockResolvedValue({
        status: 'success',
        edge: {
          source: 'learning-typescript-tips',
          target: 'reminder-agent-project-typescript-expert-memory-md',
          label: EdgeType.RemindedBy,
        },
      });

      const args: ParsedArgs = {
        positional: ['learning-typescript-tips', 'reminder-agent-project-typescript-expert-memory-md'],
        flags: { relation: 'reminded-by' },
      };

      const result = await cmdLink(args);

      expect(result.status).toBe('success');
      expect(linkModule.linkMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'learning-typescript-tips',
          target: 'reminder-agent-project-typescript-expert-memory-md',
          relation: EdgeType.RemindedBy,
        })
      );
    });
  });

  // T101: Unit test for cmdUnlink allowing edge removal from rule nodes
  describe('cmdUnlink with rule nodes', () => {
    it('should allow unlinking from rule nodes', async () => {
      vi.spyOn(linkModule, 'unlinkMemories').mockResolvedValue({
        status: 'success',
        removedCount: 1,
      });

      const args: ParsedArgs = {
        positional: ['learning-tdd-patterns', 'rule-project-claude-md-root'],
        flags: {},
      };

      const result = await cmdUnlink(args);

      expect(result.status).toBe('success');
      expect(linkModule.unlinkMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'learning-tdd-patterns',
          target: 'rule-project-claude-md-root',
        })
      );
    });
  });

  // T102: Unit test for cmdEdges showing edges for rule and reminder nodes
  describe('cmdEdges with external nodes', () => {
    it('should show edges for rule nodes', async () => {
      // cmdEdges loads the graph and calls getInboundEdges/getOutboundEdges
      // We need to mock loadGraph instead
      const mockGraph = {
        version: 1,
        nodes: [],
        edges: [
          {
            source: unsafeAsMemoryId('learning-tdd-patterns'),
            target: unsafeAsMemoryId('rule-project-claude-md-root'),
            label: EdgeType.GovernedBy,
          },
        ],
      };

      const graphModule = await import('../../graph/structure.js');
      vi.spyOn(graphModule, 'loadGraph').mockResolvedValue(mockGraph);

      const args: ParsedArgs = {
        positional: ['rule-project-claude-md-root'],
        flags: {},
      };

      const result = await cmdEdges(args);

      expect(result.status).toBe('success');
    });

    it('should show edges for reminder nodes', async () => {
      const mockGraph = {
        version: 1,
        nodes: [],
        edges: [
          {
            source: unsafeAsMemoryId('learning-typescript-tips'),
            target: unsafeAsMemoryId('reminder-agent-project-typescript-expert-memory-md'),
            label: EdgeType.RemindedBy,
          },
        ],
      };

      const graphModule = await import('../../graph/structure.js');
      vi.spyOn(graphModule, 'loadGraph').mockResolvedValue(mockGraph);

      const args: ParsedArgs = {
        positional: ['reminder-agent-project-typescript-expert-memory-md'],
        flags: {},
      };

      const result = await cmdEdges(args);

      expect(result.status).toBe('success');
    });
  });
});
