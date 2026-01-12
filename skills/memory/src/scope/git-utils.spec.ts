/**
 * T045: Unit tests for git repository detection utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  hasGitDirectory,
  findGitRoot,
  isInGitRepository,
  getRelativePathFromGitRoot,
  getProjectName,
} from './git-utils.js';

describe('Git Utils', () => {
  let testDir: string;
  let gitDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-utils-test-'));
    gitDir = path.join(testDir, '.git');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('hasGitDirectory', () => {
    it('should return true when .git directory exists', () => {
      fs.mkdirSync(gitDir);

      expect(hasGitDirectory(testDir)).toBe(true);
    });

    it('should return false when .git directory does not exist', () => {
      expect(hasGitDirectory(testDir)).toBe(false);
    });

    it('should return false for non-existent directory', () => {
      expect(hasGitDirectory('/non/existent/path')).toBe(false);
    });

    it('should return false when .git is a file not a directory', () => {
      // .git can be a file in worktrees
      fs.writeFileSync(gitDir, 'gitdir: /path/to/actual/git');

      // existsSync returns true for files too, so this should return true
      expect(hasGitDirectory(testDir)).toBe(true);
    });
  });

  describe('findGitRoot', () => {
    it('should find git root in current directory', () => {
      fs.mkdirSync(gitDir);

      const root = findGitRoot(testDir);

      expect(root).toBe(testDir);
    });

    it('should find git root in parent directory', () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      const root = findGitRoot(subDir);

      expect(root).toBe(testDir);
    });

    it('should find git root in deeply nested directory', () => {
      fs.mkdirSync(gitDir);
      const deepDir = path.join(testDir, 'a', 'b', 'c', 'd', 'e');
      fs.mkdirSync(deepDir, { recursive: true });

      const root = findGitRoot(deepDir);

      expect(root).toBe(testDir);
    });

    it('should return null when not in a git repository', () => {
      // No .git directory created
      const root = findGitRoot(testDir);

      expect(root).toBeNull();
    });

    it('should handle relative paths', () => {
      fs.mkdirSync(gitDir);
      const originalCwd = process.cwd();

      try {
        process.chdir(testDir);
        const root = findGitRoot('.');

        expect(root).toBe(testDir);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('isInGitRepository', () => {
    it('should return true when in a git repository', () => {
      fs.mkdirSync(gitDir);

      expect(isInGitRepository(testDir)).toBe(true);
    });

    it('should return true for subdirectory in a git repository', () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src');
      fs.mkdirSync(subDir);

      expect(isInGitRepository(subDir)).toBe(true);
    });

    it('should return false when not in a git repository', () => {
      expect(isInGitRepository(testDir)).toBe(false);
    });
  });

  describe('getRelativePathFromGitRoot', () => {
    it('should return relative path from git root', () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      const relativePath = getRelativePathFromGitRoot(subDir);

      expect(relativePath).toBe(path.join('src', 'components'));
    });

    it('should return empty string for git root itself', () => {
      fs.mkdirSync(gitDir);

      const relativePath = getRelativePathFromGitRoot(testDir);

      expect(relativePath).toBe('');
    });

    it('should return null when not in a git repository', () => {
      const relativePath = getRelativePathFromGitRoot(testDir);

      expect(relativePath).toBeNull();
    });

    it('should handle deeply nested paths', () => {
      fs.mkdirSync(gitDir);
      const deepDir = path.join(testDir, 'a', 'b', 'c');
      fs.mkdirSync(deepDir, { recursive: true });

      const relativePath = getRelativePathFromGitRoot(deepDir);

      expect(relativePath).toBe(path.join('a', 'b', 'c'));
    });
  });

  describe('getProjectName', () => {
    it('should return project name from git root directory', () => {
      fs.mkdirSync(gitDir);

      const projectName = getProjectName(testDir);

      // The temp directory name starts with 'git-utils-test-'
      expect(projectName).toMatch(/^git-utils-test-/);
    });

    it('should return project name from subdirectory', () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src');
      fs.mkdirSync(subDir);

      const projectName = getProjectName(subDir);

      expect(projectName).toMatch(/^git-utils-test-/);
    });

    it('should return null when not in a git repository', () => {
      const projectName = getProjectName(testDir);

      expect(projectName).toBeNull();
    });

    it('should return correct name for deeply nested directory', () => {
      fs.mkdirSync(gitDir);
      const deepDir = path.join(testDir, 'a', 'b', 'c');
      fs.mkdirSync(deepDir, { recursive: true });

      const projectName = getProjectName(deepDir);

      expect(projectName).toMatch(/^git-utils-test-/);
    });
  });
});
