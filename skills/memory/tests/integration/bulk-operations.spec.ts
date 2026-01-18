/**
 * Integration tests for bulk operations
 *
 * Tests the full flow of bulk delete, bulk link, and pattern matching
 * against real filesystem operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  writeMemory,
  bulkDelete,
  bulkLink,
  linkMemories,
  unlinkMemories,
  loadIndex,
  loadGraph,
  MemoryType,
  Scope,
} from '../../src/index.js';

describe('Bulk Operations Integration', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bulk-integration-'));
    fs.mkdirSync(path.join(testDir, 'permanent'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('bulkDelete', () => {
    it('should delete memories matching pattern', async () => {
      // Create test memories
      await writeMemory({
        type: MemoryType.Decision,
        title: 'Auth Decision',
        content: 'Use JWT',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });
      await writeMemory({
        type: MemoryType.Decision,
        title: 'API Decision',
        content: 'Use REST',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });
      await writeMemory({
        type: MemoryType.Learning,
        title: 'Test Pattern',
        content: 'Use TDD',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });

      // Verify 3 memories exist
      let index = await loadIndex({ basePath: testDir });
      expect(index.memories).toHaveLength(3);

      // Delete only decisions
      const result = await bulkDelete({
        pattern: 'decision-*',
        basePath: testDir,
      });

      expect(result.status).toBe('success');
      expect(result.deletedCount).toBe(2);

      // Verify only learning remains
      index = await loadIndex({ basePath: testDir });
      expect(index.memories).toHaveLength(1);
      expect(index.memories[0]!.type).toBe(MemoryType.Learning);
    });

    it('should support dry run mode', async () => {
      await writeMemory({
        type: MemoryType.Decision,
        title: 'Test Decision',
        content: 'Content',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });

      const result = await bulkDelete({
        pattern: 'decision-*',
        dryRun: true,
        basePath: testDir,
      });

      expect(result.status).toBe('success');
      expect(result.deletedCount).toBe(1);
      expect(result.dryRun).toBe(true);

      // Verify memory still exists
      const index = await loadIndex({ basePath: testDir });
      expect(index.memories).toHaveLength(1);
    });
  });

  describe('bulkLink', () => {
    it('should link multiple sources to a target', async () => {
      // Create hub and decisions
      const hubResult = await writeMemory({
        type: MemoryType.Artifact,
        title: 'Decisions Hub',
        content: 'Central hub for decisions',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });

      await writeMemory({
        type: MemoryType.Decision,
        title: 'Auth Decision',
        content: 'Use JWT',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });

      await writeMemory({
        type: MemoryType.Decision,
        title: 'API Decision',
        content: 'Use REST',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });

      const hubId = hubResult.memory!.id;

      // Link all decisions to hub
      const result = await bulkLink({
        sourcePattern: 'decision-*',
        target: hubId,
        relation: 'contributes-to',
        basePath: testDir,
      });

      expect(result.status).toBe('success');
      expect(result.createdCount).toBe(2);

      // Verify graph has the links
      const graph = await loadGraph(testDir);
      const hubEdges = graph.edges.filter(e => e.target === hubId);
      expect(hubEdges).toHaveLength(2);
      expect(hubEdges.every(e => e.label === 'contributes-to')).toBe(true);
    });
  });

  describe('linkMemories and unlinkMemories', () => {
    it('should create and remove links', async () => {
      // Create two memories
      const result1 = await writeMemory({
        type: MemoryType.Decision,
        title: 'Source Decision',
        content: 'Content',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });

      const result2 = await writeMemory({
        type: MemoryType.Artifact,
        title: 'Target Artifact',
        content: 'Content',
        scope: Scope.Global,
        tags: [],
        basePath: testDir,
      });

      const sourceId = result1.memory!.id;
      const targetId = result2.memory!.id;

      // Create link
      const linkResult = await linkMemories({
        source: sourceId,
        target: targetId,
        relation: 'implements',
        basePath: testDir,
      });

      expect(linkResult.status).toBe('success');
      expect(linkResult.alreadyExists).toBe(false);

      // Verify link exists
      let graph = await loadGraph(testDir);
      expect(graph.edges.some(e =>
        e.source === sourceId &&
        e.target === targetId &&
        e.label === 'implements'
      )).toBe(true);

      // Remove link
      const unlinkResult = await unlinkMemories({
        source: sourceId,
        target: targetId,
        relation: 'implements',
        basePath: testDir,
      });

      expect(unlinkResult.status).toBe('success');
      expect(unlinkResult.removedCount).toBe(1);

      // Verify link removed
      graph = await loadGraph(testDir);
      expect(graph.edges.some(e =>
        e.source === sourceId &&
        e.target === targetId
      )).toBe(false);
    });
  });
});
