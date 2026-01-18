/**
 * T105: Integration test for session deduplication
 *
 * Tests that the same gotcha is not shown multiple times
 * within the same session.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { MemoryType, Scope, Severity } from '../../skills/memory/src/types/enums.js';
import {
  createSessionState,
  markAsShown,
  hasBeenShown,
} from '../../hooks/src/session/session-state.js';
import {
  getRelevantGotchas,
  filterUnshownGotchas,
} from '../../hooks/src/memory/gotcha-injector.js';

describe('Hook Deduplication Integration', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'hook-dedup-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Session deduplication', () => {
    it('should not show same gotcha twice in session', async () => {
      // Create a gotcha
      const writeResult = await writeMemory({
        title: 'Repeated Gotcha',
        type: MemoryType.Gotcha,
        content: 'This should only show once',
        tags: ['typescript'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.High,
      });

      const gotchaId = writeResult.memory?.id ?? '';
      const sessionState = createSessionState();

      // First request - should get the gotcha
      const firstRequest = await getRelevantGotchas({
        filePath: 'src/index.ts',
        contextTags: ['typescript'],
        basePath: memoryDir,
      });

      const firstFiltered = filterUnshownGotchas(firstRequest, sessionState);
      expect(firstFiltered.length).toBeGreaterThanOrEqual(1);

      // Mark as shown
      firstFiltered.forEach(g => markAsShown(sessionState, g.id));

      // Second request - same gotcha should be filtered out
      const secondRequest = await getRelevantGotchas({
        filePath: 'src/utils.ts',
        contextTags: ['typescript'],
        basePath: memoryDir,
      });

      const secondFiltered = filterUnshownGotchas(secondRequest, sessionState);
      expect(secondFiltered.every(g => g.id !== gotchaId)).toBe(true);
    });

    it('should show different gotchas for different contexts', async () => {
      // Create two different gotchas
      await writeMemory({
        title: 'TypeScript Gotcha',
        type: MemoryType.Gotcha,
        content: 'TS specific issue',
        tags: ['typescript', 'file:src/**/*.ts'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.High,
      });

      await writeMemory({
        title: 'React Gotcha',
        type: MemoryType.Gotcha,
        content: 'React specific issue',
        tags: ['react', 'file:src/components/**'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.High,
      });

      const sessionState = createSessionState();

      // Request for TS file
      const tsGotchas = await getRelevantGotchas({
        filePath: 'src/utils/helper.ts',
        contextTags: ['typescript'],
        basePath: memoryDir,
      });

      const tsFiltered = filterUnshownGotchas(tsGotchas, sessionState);
      tsFiltered.forEach(g => markAsShown(sessionState, g.id));

      // Request for React component
      const reactGotchas = await getRelevantGotchas({
        filePath: 'src/components/Button.tsx',
        contextTags: ['react'],
        basePath: memoryDir,
      });

      const reactFiltered = filterUnshownGotchas(reactGotchas, sessionState);

      // Should still get React gotcha (different from TS gotcha)
      expect(reactFiltered.some(g => g.title.includes('React'))).toBe(true);
    });

    it('should reset deduplication on session clear', async () => {
      await writeMemory({
        title: 'Clearable Gotcha',
        type: MemoryType.Gotcha,
        content: 'Should show after clear',
        tags: ['test'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.Medium,
      });

      const sessionState = createSessionState();

      // First request
      const firstGotchas = await getRelevantGotchas({
        filePath: 'test.ts',
        contextTags: ['test'],
        basePath: memoryDir,
      });

      filterUnshownGotchas(firstGotchas, sessionState).forEach(g =>
        markAsShown(sessionState, g.id)
      );

      // Clear session
      sessionState.shownMemories.clear();

      // After clear, should show again
      const afterClear = await getRelevantGotchas({
        filePath: 'test.ts',
        contextTags: ['test'],
        basePath: memoryDir,
      });

      const filtered = filterUnshownGotchas(afterClear, sessionState);
      expect(filtered.some(g => g.title.includes('Clearable'))).toBe(true);
    });

    it('should handle concurrent file reads', async () => {
      await writeMemory({
        title: 'Concurrent Gotcha',
        type: MemoryType.Gotcha,
        content: 'Should handle concurrency',
        tags: ['common'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.High,
      });

      const sessionState = createSessionState();

      // Simulate concurrent reads
      const results = await Promise.all([
        getRelevantGotchas({ filePath: 'a.ts', contextTags: ['common'], basePath: memoryDir }),
        getRelevantGotchas({ filePath: 'b.ts', contextTags: ['common'], basePath: memoryDir }),
        getRelevantGotchas({ filePath: 'c.ts', contextTags: ['common'], basePath: memoryDir }),
      ]);

      // Filter and mark atomically
      let shownCount = 0;
      for (const gotchas of results) {
        const filtered = filterUnshownGotchas(gotchas, sessionState);
        filtered.forEach(g => {
          if (!hasBeenShown(sessionState, g.id)) {
            markAsShown(sessionState, g.id);
            shownCount++;
          }
        });
      }

      // Should only be shown once across all concurrent reads
      expect(shownCount).toBeLessThanOrEqual(1);
    });
  });

  describe('Deduplication persistence', () => {
    it('should track shown count correctly', async () => {
      const sessionState = createSessionState();

      // Mark several as shown
      markAsShown(sessionState, 'gotcha-1');
      markAsShown(sessionState, 'gotcha-2');
      markAsShown(sessionState, 'gotcha-3');

      expect(sessionState.shownMemories.size).toBe(3);
    });

    it('should maintain state across multiple operations', async () => {
      const sessionState = createSessionState();

      // Complex sequence of operations
      markAsShown(sessionState, 'gotcha-a');
      expect(hasBeenShown(sessionState, 'gotcha-a')).toBe(true);

      markAsShown(sessionState, 'gotcha-b');
      expect(hasBeenShown(sessionState, 'gotcha-a')).toBe(true);
      expect(hasBeenShown(sessionState, 'gotcha-b')).toBe(true);

      // Marking same one again shouldn't break anything
      markAsShown(sessionState, 'gotcha-a');
      expect(sessionState.shownMemories.size).toBe(2);
    });
  });
});
