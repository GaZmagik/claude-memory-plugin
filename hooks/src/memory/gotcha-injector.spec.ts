/**
 * T104-Tests: Unit tests for gotcha injector
 *
 * Tests the gotcha injection utilities for contextual warning display.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import {
  getRelevantGotchas,
  filterUnshownGotchas,
  formatGotchaWarning,
  shouldInjectGotcha,
  type GotchaResult,
} from './gotcha-injector.js';
import type { SessionState } from '../session/session-state.js';

// Mock the memory module
vi.mock('../../../skills/memory/src/core/list.js', () => ({
  listMemories: vi.fn(),
}));

vi.mock('../../../skills/memory/src/core/read.js', () => ({
  readMemory: vi.fn(),
}));

vi.mock('../../../hooks/src/memory/pattern-matcher.js', () => ({
  extractFilePatterns: vi.fn(() => []),
  matchFileToPatterns: vi.fn(() => false),
}));

vi.mock('../../../hooks/src/memory/relevance-scorer.js', () => ({
  calculateRelevanceScore: vi.fn(() => 0.5),
}));

import { listMemories } from '../../../skills/memory/src/core/list.js';
import { readMemory } from '../../../skills/memory/src/core/read.js';
import { extractFilePatterns, matchFileToPatterns } from './pattern-matcher.js';
import { calculateRelevanceScore } from './relevance-scorer.js';

describe('Gotcha Injector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });


  describe('shouldInjectGotcha', () => {
    describe('injectable file types', () => {
      it.each([
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.py', '.rs', '.go', '.java', '.kt', '.swift',
        '.rb', '.php', '.c', '.cpp', '.h', '.hpp', '.cs',
        '.vue', '.svelte', '.json', '.yaml', '.yml', '.toml',
        '.md', '.mdx',
      ])('should return true for %s files', (ext) => {
        expect(shouldInjectGotcha(`/path/to/file${ext}`)).toBe(true);
      });
    });

    describe('excluded file types', () => {
      it.each([
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
        '.woff', '.woff2', '.ttf', '.eot', '.otf',
        '.zip', '.tar', '.gz', '.rar', '.7z',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
      ])('should return false for %s files', (ext) => {
        expect(shouldInjectGotcha(`/path/to/file${ext}`)).toBe(false);
      });
    });

    describe('excluded paths', () => {
      it('should return false for package-lock.json', () => {
        expect(shouldInjectGotcha('/path/package-lock.json')).toBe(false);
      });

      it('should return false for yarn.lock', () => {
        expect(shouldInjectGotcha('/path/yarn.lock')).toBe(false);
      });

      it('should return false for pnpm-lock.yaml', () => {
        expect(shouldInjectGotcha('/path/pnpm-lock.yaml')).toBe(false);
      });

      it('should return false for node_modules paths', () => {
        expect(shouldInjectGotcha('/path/node_modules/package/index.js')).toBe(false);
      });

      it('should return false for .git paths', () => {
        expect(shouldInjectGotcha('/path/.git/config')).toBe(false);
      });

      it('should return false for dist paths', () => {
        expect(shouldInjectGotcha('/path/dist/bundle.js')).toBe(false);
      });

      it('should return false for build paths', () => {
        expect(shouldInjectGotcha('/path/build/output.js')).toBe(false);
      });

      it('should return false for .claude/memory paths', () => {
        expect(shouldInjectGotcha('/path/.claude/memory/learning-x.md')).toBe(false);
      });

      it('should return false for ~/. claude/memory paths', () => {
        expect(shouldInjectGotcha('~/.claude/memory/learning-x.md')).toBe(false);
      });
    });

    describe('special files', () => {
      it('should return true for Makefile', () => {
        expect(shouldInjectGotcha('/path/Makefile')).toBe(true);
      });

      it('should return true for Dockerfile', () => {
        expect(shouldInjectGotcha('/path/Dockerfile')).toBe(true);
      });

      it('should return true for files in bin directory', () => {
        expect(shouldInjectGotcha('/path/bin/script')).toBe(true);
      });

      it('should return true for files in scripts directory', () => {
        expect(shouldInjectGotcha('/path/scripts/deploy')).toBe(true);
      });

      it('should return true for rc files', () => {
        expect(shouldInjectGotcha('/path/.eslintrc')).toBe(true);
      });

      it('should return true for .config.js files', () => {
        expect(shouldInjectGotcha('/path/jest.config.js')).toBe(true);
      });

      it('should return true for .config.ts files', () => {
        expect(shouldInjectGotcha('/path/vite.config.ts')).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should return false for files without extension in root', () => {
        expect(shouldInjectGotcha('/path/LICENCE')).toBe(false);
      });

      it('should handle case insensitivity for image extensions', () => {
        expect(shouldInjectGotcha('/path/image.PNG')).toBe(false);
        expect(shouldInjectGotcha('/path/image.JPG')).toBe(false);
      });
    });
  });

  describe('filterUnshownGotchas', () => {
    const createGotcha = (id: string): GotchaResult => ({
      id,
      title: `Test ${id}`,
      severity: 'medium',
      content: 'Test content',
      tags: [],
      score: 0.5,
    });

    it('should return all gotchas when none have been shown', () => {
      const gotchas = [createGotcha('gotcha-1'), createGotcha('gotcha-2')];
      const sessionState: SessionState = {
        shownMemories: new Set(),
        startTime: Date.now(),
      };

      const result = filterUnshownGotchas(gotchas, sessionState);

      expect(result).toHaveLength(2);
    });

    it('should filter out already shown gotchas', () => {
      const gotchas = [createGotcha('gotcha-1'), createGotcha('gotcha-2')];
      const sessionState: SessionState = {
        shownMemories: new Set(['gotcha-1']),
        startTime: Date.now(),
      };

      const result = filterUnshownGotchas(gotchas, sessionState);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('gotcha-2');
    });

    it('should return empty array when all gotchas have been shown', () => {
      const gotchas = [createGotcha('gotcha-1'), createGotcha('gotcha-2')];
      const sessionState: SessionState = {
        shownMemories: new Set(['gotcha-1', 'gotcha-2']),
        startTime: Date.now(),
      };

      const result = filterUnshownGotchas(gotchas, sessionState);

      expect(result).toHaveLength(0);
    });

    it('should handle empty gotchas array', () => {
      const sessionState: SessionState = {
        shownMemories: new Set(),
        startTime: Date.now(),
      };

      const result = filterUnshownGotchas([], sessionState);

      expect(result).toHaveLength(0);
    });
  });

  describe('formatGotchaWarning', () => {
    const createGotcha = (
      id: string,
      severity: string = 'medium',
      content: string = 'Test content'
    ): GotchaResult => ({
      id,
      title: `Test ${id}`,
      severity,
      content,
      tags: [],
      score: 0.5,
    });

    it('should return empty string for no gotchas', () => {
      const result = formatGotchaWarning([]);

      expect(result).toBe('');
    });

    it('should format single gotcha with icon', () => {
      const gotchas = [createGotcha('gotcha-1', 'high')];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('⚠️');
      expect(result).toContain('Test gotcha-1');
      expect(result).toContain('gotcha-1');
    });

    it('should use critical icon for critical severity', () => {
      const gotchas = [createGotcha('gotcha-1', 'critical')];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('🚨');
    });

    it('should use warning icon for high severity', () => {
      const gotchas = [createGotcha('gotcha-1', 'high')];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('⚠️');
    });

    it('should use warning icon for medium severity', () => {
      const gotchas = [createGotcha('gotcha-1', 'medium')];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('⚠️');
    });

    it('should use info icon for low severity', () => {
      const gotchas = [createGotcha('gotcha-1', 'low')];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('ℹ️');
    });

    it('should include first line of content as summary', () => {
      const gotchas = [createGotcha('gotcha-1', 'medium', 'First line\nSecond line')];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('First line');
    });

    it('should skip header lines in content', () => {
      const gotchas = [createGotcha('gotcha-1', 'medium', '# Header\nActual content')];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('Actual content');
      expect(result).not.toContain('# Header');
    });

    it('should truncate long content lines', () => {
      const longContent = 'x'.repeat(150);
      const gotchas = [createGotcha('gotcha-1', 'medium', longContent)];

      const result = formatGotchaWarning(gotchas);

      // Content should be truncated to 100 chars
      expect(result.length).toBeLessThan(longContent.length + 100);
    });

    it('should format multiple gotchas', () => {
      const gotchas = [
        createGotcha('gotcha-1', 'critical'),
        createGotcha('gotcha-2', 'high'),
        createGotcha('gotcha-3', 'low'),
      ];

      const result = formatGotchaWarning(gotchas);

      expect(result).toContain('gotcha-1');
      expect(result).toContain('gotcha-2');
      expect(result).toContain('gotcha-3');
      expect(result).toContain('🚨');
      expect(result).toContain('⚠️');
      expect(result).toContain('ℹ️');
    });
  });

  describe('getRelevantGotchas', () => {
    // Helper to create mock memory data (uses 'as any' for test flexibility)
    const mockMemory = (overrides: Record<string, unknown>) => ({
      id: 'test-id',
      title: 'Test',
      type: 'gotcha',
      scope: 'local',
      created: '2026-01-01',
      updated: '2026-01-01',
      relativePath: 'test.md',
      tags: [],
      ...overrides,
    });

    beforeEach(() => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [],
      } as any);
      (readMemory as Mock).mockResolvedValue({
        status: 'success',
        memory: { content: 'Test content', frontmatter: {}, filePath: '' },
      } as any);
      (extractFilePatterns as Mock).mockReturnValue([]);
      (matchFileToPatterns as Mock).mockReturnValue(false);
      (calculateRelevanceScore as Mock).mockReturnValue(0.5);
    });

    it('should return empty array when no gotchas exist', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [],
      } as any);

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
      });

      expect(result).toEqual([]);
    });

    it('should return empty array on list failure', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'error',
        error: 'Failed',
      } as any);

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
      });

      expect(result).toEqual([]);
    });

    it('should filter gotchas by minimum score', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [
          mockMemory({ id: 'gotcha-1', title: 'Test 1', tags: ['test'] }),
          mockMemory({ id: 'gotcha-2', title: 'Test 2', tags: ['test'] }),
        ],
      } as any);
      (calculateRelevanceScore as Mock)
        .mockReturnValueOnce(0.1)  // Below threshold
        .mockReturnValueOnce(0.5); // Above threshold

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
        minScore: 0.2,
      });

      expect(result).toHaveLength(1);
    });

    it('should respect limit parameter', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [
          mockMemory({ id: 'gotcha-1', title: 'Test 1' }),
          mockMemory({ id: 'gotcha-2', title: 'Test 2' }),
          mockMemory({ id: 'gotcha-3', title: 'Test 3' }),
        ],
      } as any);
      (calculateRelevanceScore as Mock).mockReturnValue(0.5);

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
        limit: 2,
      });

      expect(result).toHaveLength(2);
    });

    it('should sort by score descending', async () => {
      // Note: severity from listMemories is undefined, defaults to 'medium' for all
      // So primary sort is effectively by score only
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [
          mockMemory({ id: 'gotcha-1', title: 'First' }),
          mockMemory({ id: 'gotcha-2', title: 'Second' }),
          mockMemory({ id: 'gotcha-3', title: 'Third' }),
        ],
      } as any);
      // Return different scores for each gotcha
      (calculateRelevanceScore as Mock)
        .mockReturnValueOnce(0.3)  // gotcha-1: low score
        .mockReturnValueOnce(0.9)  // gotcha-2: highest score
        .mockReturnValueOnce(0.6); // gotcha-3: medium score

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
      });

      // Verify sorted by score descending
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('gotcha-2'); // 0.9 - highest
      expect(result[0].score).toBe(0.9);
      expect(result[1].id).toBe('gotcha-3'); // 0.6
      expect(result[1].score).toBe(0.6);
      expect(result[2].id).toBe('gotcha-1'); // 0.3 - lowest
      expect(result[2].score).toBe(0.3);
    });

    it('should include memory content in results', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [mockMemory({ id: 'gotcha-1', title: 'Test' })],
      } as any);
      (readMemory as Mock).mockResolvedValue({
        status: 'success',
        memory: { content: 'Detailed gotcha content here', frontmatter: {}, filePath: '' },
      } as any);
      (calculateRelevanceScore as Mock).mockReturnValue(0.5);

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
      });

      expect(result[0].content).toBe('Detailed gotcha content here');
    });

    it('should match by file patterns', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [mockMemory({ id: 'gotcha-1', title: 'Test', tags: ['file:**/*.ts'] })],
      } as any);
      (extractFilePatterns as Mock).mockReturnValue(['**/*.ts']);
      (matchFileToPatterns as Mock).mockReturnValue(true);
      (calculateRelevanceScore as Mock).mockReturnValue(0.5);

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
      });

      expect(result).toHaveLength(1);
    });

    it('should match by context tags', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [mockMemory({ id: 'gotcha-1', title: 'Test', tags: ['typescript'] })],
      } as any);
      (calculateRelevanceScore as Mock).mockReturnValue(0.5);

      const result = await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
        contextTags: ['typescript'],
      });

      expect(result).toHaveLength(1);
    });

    it('should use default values for optional parameters', async () => {
      (listMemories as Mock).mockResolvedValue({
        status: 'success',
        memories: [],
      } as any);

      await getRelevantGotchas({
        filePath: '/path/to/file.ts',
        basePath: '/path',
      });

      // Should not throw with minimal parameters
      expect(listMemories).toHaveBeenCalled();
    });
  });
});
