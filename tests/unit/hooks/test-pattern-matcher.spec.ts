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
} from '../../../hooks/lib/pattern-matcher.js';

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
  });
});
