/**
 * T104: Integration test for gotcha injection on file read
 *
 * Tests that relevant gotcha/warning memories are injected
 * when reading files that match their patterns.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { writeMemory } from '../../skills/memory/src/core/write.js';
import { MemoryType, Scope, Severity } from '../../skills/memory/src/types/enums.js';
import {
  getRelevantGotchas,
  formatGotchaWarning,
  shouldInjectGotcha,
} from '../../hooks/src/memory/gotcha-injector.js';

describe('Gotcha Injection Integration', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'gotcha-injection-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('getRelevantGotchas', () => {
    it('should find gotchas matching file path pattern', async () => {
      // Create gotcha memory with file pattern
      await writeMemory({
        title: 'TypeScript Import Gotcha',
        type: MemoryType.Gotcha,
        content: 'Always use .js extensions in imports',
        tags: ['typescript', 'file:src/**/*.ts'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.High,
      });

      const gotchas = await getRelevantGotchas({
        filePath: 'src/utils/helper.ts',
        basePath: memoryDir,
      });

      expect(gotchas.length).toBeGreaterThanOrEqual(1);
      expect(gotchas[0]!.title).toContain('TypeScript Import');
    });

    it('should find gotchas matching tags', async () => {
      await writeMemory({
        title: 'Vitest Async Gotcha',
        type: MemoryType.Gotcha,
        content: 'Use await in async tests',
        tags: ['vitest', 'testing', 'async'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.Medium,
      });

      const gotchas = await getRelevantGotchas({
        filePath: 'tests/unit/example.spec.ts',
        contextTags: ['vitest', 'testing'],
        basePath: memoryDir,
      });

      expect(gotchas.length).toBeGreaterThanOrEqual(1);
      expect(gotchas.some(g => g.title.includes('Vitest'))).toBe(true);
    });

    it('should not return gotchas for unrelated files', async () => {
      await writeMemory({
        title: 'Database Connection Gotcha',
        type: MemoryType.Gotcha,
        content: 'Always close connections',
        tags: ['database', 'file:src/db/**'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.Critical,
      });

      const gotchas = await getRelevantGotchas({
        filePath: 'src/utils/string-helper.ts',
        basePath: memoryDir,
      });

      expect(gotchas.every(g => !g.title.includes('Database'))).toBe(true);
    });

    it('should prioritise by severity', async () => {
      await writeMemory({
        title: 'Low Priority Warning',
        type: MemoryType.Gotcha,
        content: 'Minor issue',
        tags: ['hooks'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.Low,
      });

      await writeMemory({
        title: 'Critical Alert',
        type: MemoryType.Gotcha,
        content: 'Very important!',
        tags: ['hooks'],
        scope: Scope.Local,
        basePath: memoryDir,
        severity: Severity.Critical,
      });

      const gotchas = await getRelevantGotchas({
        filePath: 'hooks/test.ts',
        contextTags: ['hooks'],
        basePath: memoryDir,
      });

      // Critical should come first
      if (gotchas.length >= 2) {
        expect(gotchas[0]!.severity).toBe('critical');
      }
    });

    it('should limit number of results', async () => {
      // Create many gotchas
      for (let i = 0; i < 10; i++) {
        await writeMemory({
          title: `Gotcha ${i}`,
          type: MemoryType.Gotcha,
          content: `Content ${i}`,
          tags: ['common-tag'],
          scope: Scope.Local,
          basePath: memoryDir,
          severity: Severity.Medium,
        });
      }

      const gotchas = await getRelevantGotchas({
        filePath: 'any/file.ts',
        contextTags: ['common-tag'],
        basePath: memoryDir,
        limit: 3,
      });

      expect(gotchas.length).toBeLessThanOrEqual(3);
    });
  });

  describe('formatGotchaWarning', () => {
    it('should format single gotcha as warning', () => {
      const gotcha = {
        id: 'gotcha-test',
        title: 'Test Gotcha',
        severity: 'high',
        content: 'This is important',
        tags: [],
        score: 0.5,
      };

      const formatted = formatGotchaWarning([gotcha]);

      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('Test Gotcha');
      expect(formatted).toContain('gotcha-test');
    });

    it('should format multiple gotchas', () => {
      const gotchas = [
        { id: 'gotcha-1', title: 'First', severity: 'high', content: 'First content', tags: [], score: 0.5 },
        { id: 'gotcha-2', title: 'Second', severity: 'medium', content: 'Second content', tags: [], score: 0.5 },
      ];

      const formatted = formatGotchaWarning(gotchas);

      expect(formatted).toContain('First');
      expect(formatted).toContain('Second');
      expect(formatted).toContain('gotcha-1');
      expect(formatted).toContain('gotcha-2');
    });

    it('should return empty string for no gotchas', () => {
      expect(formatGotchaWarning([])).toBe('');
    });

    it('should use severity-appropriate icons', () => {
      const critical = [{ id: 'g', title: 'T', severity: 'critical', content: '', tags: [], score: 0.5 }];
      const low = [{ id: 'g', title: 'T', severity: 'low', content: '', tags: [], score: 0.5 }];

      expect(formatGotchaWarning(critical)).toContain('🚨');
      expect(formatGotchaWarning(low)).toContain('ℹ️');
    });
  });

  describe('shouldInjectGotcha', () => {
    it('should return true for source files', () => {
      expect(shouldInjectGotcha('src/index.ts')).toBe(true);
      expect(shouldInjectGotcha('lib/utils.js')).toBe(true);
    });

    it('should return true for test files', () => {
      expect(shouldInjectGotcha('tests/unit/test.spec.ts')).toBe(true);
      expect(shouldInjectGotcha('__tests__/component.test.tsx')).toBe(true);
    });

    it('should return false for binary files', () => {
      expect(shouldInjectGotcha('image.png')).toBe(false);
      expect(shouldInjectGotcha('font.woff2')).toBe(false);
      expect(shouldInjectGotcha('archive.zip')).toBe(false);
    });

    it('should return false for lock files', () => {
      expect(shouldInjectGotcha('package-lock.json')).toBe(false);
      expect(shouldInjectGotcha('yarn.lock')).toBe(false);
      expect(shouldInjectGotcha('pnpm-lock.yaml')).toBe(false);
    });

    it('should return false for memory files', () => {
      expect(shouldInjectGotcha('.claude/memory/decision.md')).toBe(false);
      expect(shouldInjectGotcha('~/.claude/memory/gotcha.md')).toBe(false);
    });

    it('should return true for config files', () => {
      expect(shouldInjectGotcha('tsconfig.json')).toBe(true);
      expect(shouldInjectGotcha('.eslintrc.js')).toBe(true);
      expect(shouldInjectGotcha('vitest.config.ts')).toBe(true);
    });
  });
});
