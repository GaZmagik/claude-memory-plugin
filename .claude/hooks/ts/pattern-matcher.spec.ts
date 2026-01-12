/**
 * T100: Unit test for file pattern matching logic
 *
 * Tests the pattern matching utilities used by hooks to match
 * file paths against memory tags and patterns.
 */

import { describe, it, expect } from 'vitest';
import {
  matchFileToPatterns,
  extractFilePatterns,
  normalisePattern,
  isGlobPattern,
  matchesGlob,
  getMatchType,
  getMatchingPatterns,
} from '../../../hooks/src/memory/pattern-matcher.js';

describe('Pattern Matcher', () => {
  describe('normalisePattern', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalisePattern('src\\utils\\helper.ts')).toBe('src/utils/helper.ts');
    });

    it('should remove leading ./', () => {
      expect(normalisePattern('./src/index.ts')).toBe('src/index.ts');
    });

    it('should handle absolute paths', () => {
      expect(normalisePattern('/home/user/project/src/index.ts')).toBe(
        '/home/user/project/src/index.ts'
      );
    });

    it('should trim whitespace', () => {
      expect(normalisePattern('  src/index.ts  ')).toBe('src/index.ts');
    });
  });

  describe('isGlobPattern', () => {
    it('should detect * wildcard', () => {
      expect(isGlobPattern('*.ts')).toBe(true);
      expect(isGlobPattern('src/*.js')).toBe(true);
    });

    it('should detect ** glob', () => {
      expect(isGlobPattern('src/**/*.ts')).toBe(true);
    });

    it('should detect ? wildcard', () => {
      expect(isGlobPattern('file?.ts')).toBe(true);
    });

    it('should detect bracket expressions', () => {
      expect(isGlobPattern('file[0-9].ts')).toBe(true);
    });

    it('should return false for plain paths', () => {
      expect(isGlobPattern('src/index.ts')).toBe(false);
      expect(isGlobPattern('package.json')).toBe(false);
    });
  });

  describe('matchesGlob', () => {
    it('should match simple wildcards', () => {
      expect(matchesGlob('src/index.ts', '*.ts')).toBe(true);
      expect(matchesGlob('src/index.js', '*.ts')).toBe(false);
    });

    it('should match directory wildcards', () => {
      expect(matchesGlob('src/utils/helper.ts', 'src/**/*.ts')).toBe(true);
      expect(matchesGlob('src/index.ts', 'src/**/*.ts')).toBe(true);
    });

    it('should match specific directories', () => {
      expect(matchesGlob('src/components/Button.tsx', 'src/components/*.tsx')).toBe(true);
      expect(matchesGlob('src/utils/helper.tsx', 'src/components/*.tsx')).toBe(false);
    });

    it('should be case-insensitive on Windows-style paths', () => {
      expect(matchesGlob('SRC/Index.ts', 'src/*.ts')).toBe(true);
    });
  });

  describe('extractFilePatterns', () => {
    it('should extract patterns from memory tags', () => {
      const tags = ['typescript', 'file:src/index.ts', 'pattern:*.spec.ts'];
      const patterns = extractFilePatterns(tags);

      expect(patterns).toContain('src/index.ts');
      expect(patterns).toContain('*.spec.ts');
      expect(patterns).not.toContain('typescript');
    });

    it('should handle tags without file patterns', () => {
      const tags = ['important', 'gotcha', 'high-priority'];
      const patterns = extractFilePatterns(tags);

      expect(patterns).toHaveLength(0);
    });

    it('should extract directory patterns', () => {
      const tags = ['dir:src/utils', 'pattern:hooks/**'];
      const patterns = extractFilePatterns(tags);

      expect(patterns).toContain('src/utils');
      expect(patterns).toContain('hooks/**');
    });
  });

  describe('matchFileToPatterns', () => {
    it('should match exact file paths', () => {
      const patterns = ['src/index.ts', 'src/utils/helper.ts'];
      expect(matchFileToPatterns('src/index.ts', patterns)).toBe(true);
      expect(matchFileToPatterns('src/other.ts', patterns)).toBe(false);
    });

    it('should match glob patterns', () => {
      const patterns = ['src/**/*.ts', '*.json'];
      expect(matchFileToPatterns('src/deep/nested/file.ts', patterns)).toBe(true);
      expect(matchFileToPatterns('package.json', patterns)).toBe(true);
      expect(matchFileToPatterns('src/file.js', patterns)).toBe(false);
    });

    it('should match directory patterns', () => {
      const patterns = ['src/utils/', 'hooks/'];
      expect(matchFileToPatterns('src/utils/helper.ts', patterns)).toBe(true);
      expect(matchFileToPatterns('hooks/pre-tool-use/check.ts', patterns)).toBe(true);
      expect(matchFileToPatterns('src/index.ts', patterns)).toBe(false);
    });

    it('should return false for empty patterns', () => {
      expect(matchFileToPatterns('src/index.ts', [])).toBe(false);
    });

    it('should handle normalisation', () => {
      const patterns = ['./src/index.ts'];
      expect(matchFileToPatterns('src/index.ts', patterns)).toBe(true);
    });

    it('should match directory without trailing slash', () => {
      const patterns = ['src/utils'];
      expect(matchFileToPatterns('src/utils/helper.ts', patterns)).toBe(true);
    });

    it('should match directory with trailing slash but file path without', () => {
      const patterns = ['src/utils/'];
      expect(matchFileToPatterns('src/utils/helper.ts', patterns)).toBe(true);
    });
  });

  describe('getMatchType', () => {
    it('should return "exact" for exact file match', () => {
      const patterns = ['src/index.ts', 'src/utils/helper.ts'];
      expect(getMatchType('src/index.ts', patterns)).toBe('exact');
    });

    it('should return "directory" for directory match', () => {
      const patterns = ['src/utils/', 'hooks/'];
      expect(getMatchType('src/utils/helper.ts', patterns)).toBe('directory');
    });

    it('should return "directory" for directory pattern without trailing slash', () => {
      const patterns = ['src/utils'];
      expect(getMatchType('src/utils/nested/file.ts', patterns)).toBe('directory');
    });

    it('should return "glob" for glob pattern match', () => {
      const patterns = ['**/*.spec.ts'];
      expect(getMatchType('src/utils/helper.spec.ts', patterns)).toBe('glob');
    });

    it('should return "none" for no match', () => {
      const patterns = ['src/other.ts'];
      expect(getMatchType('src/index.ts', patterns)).toBe('none');
    });

    it('should return "none" for empty patterns', () => {
      expect(getMatchType('src/index.ts', [])).toBe('none');
    });

    it('should prioritise exact over directory match', () => {
      const patterns = ['src/index.ts', 'src/'];
      expect(getMatchType('src/index.ts', patterns)).toBe('exact');
    });

    it('should prioritise directory over glob match', () => {
      const patterns = ['src/', '*.ts'];
      expect(getMatchType('src/index.ts', patterns)).toBe('directory');
    });
  });

  describe('getMatchingPatterns', () => {
    it('should return all matching patterns', () => {
      const patterns = ['src/index.ts', 'src/', '*.ts', 'other.js'];
      const matches = getMatchingPatterns('src/index.ts', patterns);

      expect(matches).toContain('src/index.ts');
      expect(matches).toContain('src/');
      expect(matches).toContain('*.ts');
      expect(matches).not.toContain('other.js');
    });

    it('should return empty array for no matches', () => {
      const patterns = ['other.ts', 'hooks/'];
      const matches = getMatchingPatterns('src/index.ts', patterns);

      expect(matches).toEqual([]);
    });

    it('should handle glob patterns', () => {
      const patterns = ['**/*.spec.ts', 'src/**/*.ts'];
      const matches = getMatchingPatterns('src/utils/helper.spec.ts', patterns);

      expect(matches).toContain('**/*.spec.ts');
      expect(matches).toContain('src/**/*.ts');
    });

    it('should handle directory patterns with trailing slash', () => {
      const patterns = ['src/utils/'];
      const matches = getMatchingPatterns('src/utils/helper.ts', patterns);

      expect(matches).toContain('src/utils/');
    });

    it('should return empty array for empty patterns', () => {
      const matches = getMatchingPatterns('src/index.ts', []);

      expect(matches).toEqual([]);
    });
  });
});
