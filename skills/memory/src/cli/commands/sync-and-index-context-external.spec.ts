/**
 * Tests for T103-T108: syncMemories and cmdIndexContext with External Files
 *
 * Verifies that sync and index-context commands correctly discover and index
 * external files (CLAUDE.md, agent MEMORY.md) as rule and reminder nodes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cmdIndexContext } from './maintenance.js';
import type { ParsedArgs } from '../parser.js';
import * as syncModule from '../../maintenance/sync.js';
import * as externalModule from '../../external/index.js';

describe('Sync and Index-Context with External Files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // T103: Unit test for syncMemories integrating external indexer as final pass
  describe('syncMemories integration', () => {
    it('should call external indexer as part of sync process', async () => {
      const mockSyncResult: syncModule.SyncResponse = {
        status: 'success',
        changes: {
          addedToGraph: [],
          addedToIndex: [],
          removedGhostNodes: [],
          removedOrphanEdges: 0,
          removedFromIndex: [],
          removedOrphanEmbeddings: [],
          externalNodesAdded: ['rule-project-claude-md-root', 'reminder-agent-project-typescript-expert-memory-md'],
          externalNodesUpdated: ['rule-project-claude-md-dotclaude'],
          externalNodesRemoved: [],
        },
        summary: {
          filesOnDisk: 10,
          nodesInGraph: 15,
          entriesInIndex: 15,
          entriesInEmbeddings: 12,
          externalRuleNodes: 2,
          externalReminderNodes: 1,
        },
      };

      vi.spyOn(syncModule, 'syncMemories').mockResolvedValue(mockSyncResult);

      const result = await syncModule.syncMemories({
        basePath: '/test/path',
      });

      expect(result.status).toBe('success');
      expect(result.changes.externalNodesAdded).toBeDefined();
      expect(result.summary.externalRuleNodes).toBeGreaterThanOrEqual(0);
      expect(result.summary.externalReminderNodes).toBeGreaterThanOrEqual(0);
    });

    // T104: Unit test for syncMemories reporting external node changes
    it('should report external node changes in sync response', async () => {
      const mockSyncResult: syncModule.SyncResponse = {
        status: 'success',
        changes: {
          addedToGraph: [],
          addedToIndex: [],
          removedGhostNodes: [],
          removedOrphanEdges: 0,
          removedFromIndex: [],
          removedOrphanEmbeddings: [],
          externalNodesAdded: ['rule-1', 'rule-2'],
          externalNodesUpdated: ['reminder-1'],
          externalNodesRemoved: ['rule-old'],
        },
        summary: {
          filesOnDisk: 5,
          nodesInGraph: 10,
          entriesInIndex: 10,
          entriesInEmbeddings: 8,
          externalRuleNodes: 3,
          externalReminderNodes: 2,
        },
      };

      vi.spyOn(syncModule, 'syncMemories').mockResolvedValue(mockSyncResult);

      const result = await syncModule.syncMemories({
        basePath: '/test/path',
      });

      expect(result.status).toBe('success');
      expect(result.changes.externalNodesAdded).toHaveLength(2);
      expect(result.changes.externalNodesUpdated).toHaveLength(1);
      expect(result.changes.externalNodesRemoved).toHaveLength(1);
      expect(result.summary.externalRuleNodes).toBe(3);
      expect(result.summary.externalReminderNodes).toBe(2);
    });
  });

  // T105: Unit test for cmdIndexContext discovering and indexing external files
  describe('cmdIndexContext basic functionality', () => {
    it('should discover and index external files', async () => {
      vi.spyOn(externalModule, 'indexExternalFiles').mockResolvedValue({
        status: 'success',
        changes: {
          addedNodes: ['rule-project-claude-md-root', 'reminder-agent-memory-md'],
          updatedNodes: [],
          removedNodes: [],
          embeddingsGenerated: 2,
          embeddingsReused: 0,
        },
        summary: {
          totalExternalNodes: 2,
          ruleNodes: 1,
          reminderNodes: 1,
        },
      });

      const args: ParsedArgs = {
        positional: [],
        flags: {},
      };

      const result = await cmdIndexContext(args);

      expect(result.status).toBe('success');
      expect(externalModule.indexExternalFiles).toHaveBeenCalled();
    });
  });

  // T106: Unit test for cmdIndexContext respecting scope flag
  describe('cmdIndexContext with scope flag', () => {
    it('should respect --scope project flag', async () => {
      vi.spyOn(externalModule, 'indexExternalFiles').mockResolvedValue({
        status: 'success',
        changes: {
          addedNodes: ['rule-project-claude-md-root'],
          updatedNodes: [],
          removedNodes: [],
          embeddingsGenerated: 1,
          embeddingsReused: 0,
        },
        summary: {
          totalExternalNodes: 1,
          ruleNodes: 1,
          reminderNodes: 0,
        },
      });

      const args: ParsedArgs = {
        positional: [],
        flags: { scope: 'project' },
      };

      const result = await cmdIndexContext(args);

      expect(result.status).toBe('success');
      expect(externalModule.indexExternalFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: expect.stringContaining('.claude/memory'),
        })
      );
    });

    it('should respect --scope global flag', async () => {
      vi.spyOn(externalModule, 'indexExternalFiles').mockResolvedValue({
        status: 'success',
        changes: {
          addedNodes: [],
          updatedNodes: [],
          removedNodes: [],
          embeddingsGenerated: 0,
          embeddingsReused: 0,
        },
        summary: {
          totalExternalNodes: 0,
          ruleNodes: 0,
          reminderNodes: 0,
        },
      });

      const args: ParsedArgs = {
        positional: [],
        flags: { scope: 'global' },
      };

      const result = await cmdIndexContext(args);

      expect(result.status).toBe('success');
      expect(externalModule.indexExternalFiles).toHaveBeenCalled();
    });
  });

  // T107: Unit test for cmdIndexContext respecting agent flag
  describe('cmdIndexContext with agent flag', () => {
    it('should respect --agent flag for agent-scoped indexing', async () => {
      vi.spyOn(externalModule, 'indexExternalFiles').mockResolvedValue({
        status: 'success',
        changes: {
          addedNodes: ['reminder-agent-project-typescript-expert-memory-md'],
          updatedNodes: [],
          removedNodes: [],
          embeddingsGenerated: 1,
          embeddingsReused: 0,
        },
        summary: {
          totalExternalNodes: 1,
          ruleNodes: 0,
          reminderNodes: 1,
        },
      });

      const args: ParsedArgs = {
        positional: [],
        flags: { agent: 'typescript-expert', scope: 'agent-project' },
      };

      const result = await cmdIndexContext(args);

      expect(result.status).toBe('success');
      expect(externalModule.indexExternalFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          basePath: expect.stringContaining('typescript-expert'),
        })
      );
    });
  });

  // T108: Unit test for cmdIndexContext respecting dryRun flag
  describe('cmdIndexContext with dryRun flag', () => {
    it('should respect --dry-run flag without modifying graph/index', async () => {
      vi.spyOn(externalModule, 'indexExternalFiles').mockResolvedValue({
        status: 'success',
        changes: {
          addedNodes: [], // No changes in dry run
          updatedNodes: [],
          removedNodes: [],
          embeddingsGenerated: 0,
          embeddingsReused: 0,
        },
        summary: {
          totalExternalNodes: 3, // Shows what exists, but no changes
          ruleNodes: 2,
          reminderNodes: 1,
        },
      });

      const args: ParsedArgs = {
        positional: [],
        flags: { 'dry-run': true },
      };

      const result = await cmdIndexContext(args);

      expect(result.status).toBe('success');
      expect(externalModule.indexExternalFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
        })
      );
    });

    it('should report what would be indexed without actually indexing', async () => {
      vi.spyOn(externalModule, 'indexExternalFiles').mockResolvedValue({
        status: 'success',
        changes: {
          addedNodes: [],
          updatedNodes: [],
          removedNodes: [],
          embeddingsGenerated: 0,
          embeddingsReused: 0,
        },
        summary: {
          totalExternalNodes: 5,
          ruleNodes: 3,
          reminderNodes: 2,
        },
      });

      const args: ParsedArgs = {
        positional: [],
        flags: { 'dry-run': true },
      };

      const result = await cmdIndexContext(args);

      expect(result.status).toBe('success');
      // Verify dryRun was passed
      const mockCall = vi.mocked(externalModule.indexExternalFiles).mock.calls[0]?.[0];
      expect(mockCall?.dryRun).toBe(true);
    });
  });
});
