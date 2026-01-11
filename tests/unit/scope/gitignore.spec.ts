/**
 * T037: Unit test for gitignore automation
 *
 * Tests the gitignore utilities that automatically add
 * .claude/memory/local/ to .gitignore for local scope privacy.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import {
  ensureLocalScopeGitignored,
  isPathGitignored,
  addToGitignore,
  createGitignoreIfMissing,
  removeFromGitignore,
  validateGitignorePatterns,
  MEMORY_LOCAL_PATTERN,
} from '../../../skills/memory/src/scope/gitignore.js';

describe('Gitignore Automation', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'gitignore-'));
    // Create .git directory to simulate git repo
    fs.mkdirSync(path.join(testDir, '.git'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('MEMORY_LOCAL_PATTERN', () => {
    it('should export the correct pattern for local memory', () => {
      expect(MEMORY_LOCAL_PATTERN).toBe('.claude/memory/local/');
    });
  });

  describe('ensureLocalScopeGitignored', () => {
    it('should create .gitignore if it does not exist', () => {
      const result = ensureLocalScopeGitignored(testDir);

      expect(result.created).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.gitignore'))).toBe(true);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('.claude/memory/local/');
    });

    it('should add to existing .gitignore if pattern missing', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n');

      const result = ensureLocalScopeGitignored(testDir);

      expect(result.modified).toBe(true);
      expect(result.created).toBe(false);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.claude/memory/local/');
    });

    it('should not modify .gitignore if pattern already present', () => {
      const originalContent = 'node_modules/\n.claude/memory/local/\n';
      fs.writeFileSync(path.join(testDir, '.gitignore'), originalContent);

      const result = ensureLocalScopeGitignored(testDir);

      expect(result.modified).toBe(false);
      expect(result.alreadyPresent).toBe(true);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toBe(originalContent);
    });

    it('should detect pattern with trailing whitespace', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), '.claude/memory/local/  \n');

      const result = ensureLocalScopeGitignored(testDir);

      expect(result.alreadyPresent).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should not add if not in git repository', () => {
      // Remove .git directory
      fs.rmSync(path.join(testDir, '.git'), { recursive: true });

      const result = ensureLocalScopeGitignored(testDir);

      expect(result.skipped).toBe(true);
      expect(result.reason?.toLowerCase()).toContain('not a git repository');
    });
  });

  describe('isPathGitignored', () => {
    it('should return true for exact match', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), '.claude/memory/local/\n');

      const result = isPathGitignored(testDir, '.claude/memory/local/');
      expect(result).toBe(true);
    });

    it('should return false when pattern not in gitignore', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n');

      const result = isPathGitignored(testDir, '.claude/memory/local/');
      expect(result).toBe(false);
    });

    it('should return false when no .gitignore exists', () => {
      const result = isPathGitignored(testDir, '.claude/memory/local/');
      expect(result).toBe(false);
    });

    it('should handle comments and empty lines', () => {
      fs.writeFileSync(
        path.join(testDir, '.gitignore'),
        '# Comment\n\n.claude/memory/local/\n\n# Another comment\n'
      );

      const result = isPathGitignored(testDir, '.claude/memory/local/');
      expect(result).toBe(true);
    });
  });

  describe('addToGitignore', () => {
    it('should append pattern with newline', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/');

      addToGitignore(testDir, '.claude/memory/local/');

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.claude/memory/local/');
      expect(content.endsWith('\n')).toBe(true);
    });

    it('should add section comment before pattern', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n');

      addToGitignore(testDir, '.claude/memory/local/', 'Claude Code local memories');

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('# Claude Code local memories');
      expect(content).toContain('.claude/memory/local/');
    });

    it('should handle file without trailing newline', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/');

      addToGitignore(testDir, '.claude/memory/local/');

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      // Should have newline between existing content and new pattern
      expect(content).toMatch(/node_modules\/\n.*\.claude\/memory\/local\//);
    });
  });

  describe('createGitignoreIfMissing', () => {
    it('should create .gitignore if missing', () => {
      const result = createGitignoreIfMissing(testDir);

      expect(result).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.gitignore'))).toBe(true);
    });

    it('should not overwrite existing .gitignore', () => {
      const originalContent = 'existing content\n';
      fs.writeFileSync(path.join(testDir, '.gitignore'), originalContent);

      const result = createGitignoreIfMissing(testDir);

      expect(result).toBe(false);
      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toBe(originalContent);
    });

    it('should create with standard header', () => {
      createGitignoreIfMissing(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('# Generated by Claude Code');
    });
  });

  describe('edge cases', () => {
    it('should handle .gitignore with Windows line endings', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\r\n.env\r\n');

      ensureLocalScopeGitignored(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('.claude/memory/local/');
    });

    it('should handle negation patterns', () => {
      fs.writeFileSync(
        path.join(testDir, '.gitignore'),
        '.claude/\n!.claude/config.json\n'
      );

      ensureLocalScopeGitignored(testDir);

      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).toContain('.claude/memory/local/');
    });
  });

  describe('removeFromGitignore', () => {
    it('should remove pattern from .gitignore', () => {
      fs.writeFileSync(
        path.join(testDir, '.gitignore'),
        'node_modules/\n.claude/memory/local/\n.env\n'
      );

      const result = removeFromGitignore(testDir, '.claude/memory/local/');

      expect(result).toBe(true);
      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).not.toContain('.claude/memory/local/');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
    });

    it('should return false when pattern not found', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n');

      const result = removeFromGitignore(testDir, '.claude/memory/local/');

      expect(result).toBe(false);
    });

    it('should return false when .gitignore does not exist', () => {
      const result = removeFromGitignore(testDir, '.claude/memory/local/');

      expect(result).toBe(false);
    });

    it('should handle pattern with whitespace', () => {
      fs.writeFileSync(
        path.join(testDir, '.gitignore'),
        'node_modules/\n  .claude/memory/local/  \n.env\n'
      );

      const result = removeFromGitignore(testDir, '.claude/memory/local/');

      expect(result).toBe(true);
      const content = fs.readFileSync(path.join(testDir, '.gitignore'), 'utf-8');
      expect(content).not.toContain('.claude/memory/local/');
    });
  });

  describe('validateGitignorePatterns', () => {
    it('should return valid: true when all patterns present', () => {
      fs.writeFileSync(
        path.join(testDir, '.gitignore'),
        '.claude/memory/local/\n'
      );

      const result = validateGitignorePatterns(testDir);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return valid: false when pattern missing', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'node_modules/\n');

      const result = validateGitignorePatterns(testDir);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('.claude/memory/local/');
    });

    it('should return valid: false when .gitignore does not exist', () => {
      const result = validateGitignorePatterns(testDir);

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('.claude/memory/local/');
    });
  });
});
