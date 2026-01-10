/**
 * T106: Integration test for hook performance (<50ms latency)
 *
 * Tests that hooks execute within acceptable latency bounds
 * to avoid impacting user experience.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { MemoryType, Scope, Severity } from '../../skills/memory/src/types/enums.js';
import { getRelevantGotchas } from '../../hooks/lib/gotcha-injector.js';
import { matchFileToPatterns } from '../../hooks/lib/pattern-matcher.js';
import { calculateRelevanceScore } from '../../hooks/lib/relevance-scorer.js';
import { createSessionState, markAsShown, hasBeenShown } from '../../hooks/lib/session-state.js';

describe('Hook Performance', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'hook-perf-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Gotcha injection latency', () => {
    it('should complete gotcha lookup in <50ms with small dataset', async () => {
      // Create a few gotchas
      for (let i = 0; i < 5; i++) {
        await writeMemory({
          title: `Gotcha ${i}`,
          type: MemoryType.Gotcha,
          content: `Content for gotcha ${i}`,
          tags: ['test', `tag-${i}`],
          scope: Scope.Local,
          basePath: memoryDir,
          severity: Severity.Medium,
        });
      }

      const start = performance.now();
      await getRelevantGotchas({
        filePath: 'src/index.ts',
        contextTags: ['test'],
        basePath: memoryDir,
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('should complete gotcha lookup in <100ms with larger dataset', async () => {
      // Create more gotchas
      for (let i = 0; i < 50; i++) {
        await writeMemory({
          title: `Gotcha ${i}`,
          type: MemoryType.Gotcha,
          content: `Content for gotcha ${i} with some extra text to make it more realistic`,
          tags: ['test', `category-${i % 5}`, `priority-${i % 3}`],
          scope: Scope.Local,
          basePath: memoryDir,
          severity: i % 4 === 0 ? Severity.Critical : Severity.Medium,
        });
      }

      const start = performance.now();
      await getRelevantGotchas({
        filePath: 'src/components/Button.tsx',
        contextTags: ['test', 'category-2'],
        basePath: memoryDir,
        limit: 5,
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Pattern matching performance', () => {
    it('should match patterns in <1ms', () => {
      const patterns = [
        'src/**/*.ts',
        'tests/**/*.spec.ts',
        'lib/*.js',
        'components/**/*.tsx',
        '*.json',
      ];

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        matchFileToPatterns('src/utils/deep/nested/helper.ts', patterns);
      }

      const duration = performance.now() - start;
      const perIteration = duration / iterations;

      expect(perIteration).toBeLessThan(1);
    });

    it('should handle complex glob patterns efficiently', () => {
      const complexPatterns = [
        'src/**/components/**/*.{ts,tsx}',
        '!**/node_modules/**',
        'tests/**/__tests__/**/*.test.{js,ts}',
        '**/[A-Z]*.tsx',
      ];

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        matchFileToPatterns('src/features/auth/components/LoginForm.tsx', complexPatterns);
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Relevance scoring performance', () => {
    it('should calculate relevance score in <1ms', () => {
      const memory = {
        tags: ['typescript', 'hooks', 'gotcha'],
        patterns: ['src/hooks/**', 'hooks/lib/**'],
        updated: new Date().toISOString(),
        severity: Severity.High,
      };

      const context = {
        filePath: 'src/hooks/pre-tool-use/check.ts',
        contextTags: ['hooks', 'typescript'],
      };

      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        calculateRelevanceScore(memory, context);
      }

      const duration = performance.now() - start;
      const perIteration = duration / iterations;

      expect(perIteration).toBeLessThan(1);
    });
  });

  describe('Session state performance', () => {
    it('should handle large session state efficiently', () => {
      const state = createSessionState();

      // Add many entries
      for (let i = 0; i < 1000; i++) {
        markAsShown(state, `memory-${i}`);
      }

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        hasBeenShown(state, `memory-${i % 1000}`);
      }

      const duration = performance.now() - start;
      const perIteration = duration / iterations;

      // Set operations should be O(1)
      expect(perIteration).toBeLessThan(0.1);
    });
  });

  describe('Cold start performance', () => {
    it('should initialise session state in <1ms', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        createSessionState();
      }

      const duration = performance.now() - start;
      const perIteration = duration / iterations;

      expect(perIteration).toBeLessThan(1);
    });
  });

  describe('Memory usage', () => {
    it('should not accumulate memory with repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const state = createSessionState();
        for (let j = 0; j < 100; j++) {
          markAsShown(state, `memory-${j}`);
          hasBeenShown(state, `memory-${j}`);
        }
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Should not grow by more than 10MB
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
