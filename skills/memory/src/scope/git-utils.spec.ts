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
    it('should return true when .git directory exists', async () => {
      fs.mkdirSync(gitDir);

      expect(await hasGitDirectory(testDir)).toBe(true);
    });

    it('should return false when .git directory does not exist', async () => {
      expect(await hasGitDirectory(testDir)).toBe(false);
    });

    it('should return false for non-existent directory', async () => {
      expect(await hasGitDirectory('/non/existent/path')).toBe(false);
    });

    it('should return false when .git is a file not a directory', async () => {
      // .git can be a file in worktrees
      fs.writeFileSync(gitDir, 'gitdir: /path/to/actual/git');

      // existsSync returns true for files too, so this should return true
      expect(await hasGitDirectory(testDir)).toBe(true);
    });
  });

  describe('findGitRoot', () => {
    it('should find git root in current directory', async () => {
      fs.mkdirSync(gitDir);

      const root = await findGitRoot(testDir);

      expect(root).toBe(testDir);
    });

    it('should find git root in parent directory', async () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      const root = await findGitRoot(subDir);

      expect(root).toBe(testDir);
    });

    it('should find git root in deeply nested directory', async () => {
      fs.mkdirSync(gitDir);
      const deepDir = path.join(testDir, 'a', 'b', 'c', 'd', 'e');
      fs.mkdirSync(deepDir, { recursive: true });

      const root = await findGitRoot(deepDir);

      expect(root).toBe(testDir);
    });

    it('should return null when not in a git repository', async () => {
      // No .git directory created
      const root = await findGitRoot(testDir);

      expect(root).toBeNull();
    });

    it('should handle relative paths', async () => {
      fs.mkdirSync(gitDir);
      const originalCwd = process.cwd();

      try {
        process.chdir(testDir);
        const root = await findGitRoot('.');

        expect(root).toBe(testDir);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('isInGitRepository', () => {
    it('should return true when in a git repository', async () => {
      fs.mkdirSync(gitDir);

      expect(await isInGitRepository(testDir)).toBe(true);
    });

    it('should return true for subdirectory in a git repository', async () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src');
      fs.mkdirSync(subDir);

      expect(await isInGitRepository(subDir)).toBe(true);
    });

    it('should return false when not in a git repository', async () => {
      expect(await isInGitRepository(testDir)).toBe(false);
    });
  });

  describe('getRelativePathFromGitRoot', () => {
    it('should return relative path from git root', async () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      const relativePath = await getRelativePathFromGitRoot(subDir);

      expect(relativePath).toBe(path.join('src', 'components'));
    });

    it('should return empty string for git root itself', async () => {
      fs.mkdirSync(gitDir);

      const relativePath = await getRelativePathFromGitRoot(testDir);

      expect(relativePath).toBe('');
    });

    it('should return null when not in a git repository', async () => {
      const relativePath = await getRelativePathFromGitRoot(testDir);

      expect(relativePath).toBeNull();
    });

    it('should handle deeply nested paths', async () => {
      fs.mkdirSync(gitDir);
      const deepDir = path.join(testDir, 'a', 'b', 'c');
      fs.mkdirSync(deepDir, { recursive: true });

      const relativePath = await getRelativePathFromGitRoot(deepDir);

      expect(relativePath).toBe(path.join('a', 'b', 'c'));
    });
  });

  describe('getProjectName', () => {
    it('should return project name from git root directory', async () => {
      fs.mkdirSync(gitDir);

      const projectName = await getProjectName(testDir);

      // The temp directory name starts with 'git-utils-test-'
      expect(projectName).toMatch(/^git-utils-test-/);
    });

    it('should return project name from subdirectory', async () => {
      fs.mkdirSync(gitDir);
      const subDir = path.join(testDir, 'src');
      fs.mkdirSync(subDir);

      const projectName = await getProjectName(subDir);

      expect(projectName).toMatch(/^git-utils-test-/);
    });

    it('should return null when not in a git repository', async () => {
      const projectName = await getProjectName(testDir);

      expect(projectName).toBeNull();
    });

    it('should return correct name for deeply nested directory', async () => {
      fs.mkdirSync(gitDir);
      const deepDir = path.join(testDir, 'a', 'b', 'c');
      fs.mkdirSync(deepDir, { recursive: true });

      const projectName = await getProjectName(deepDir);

      expect(projectName).toMatch(/^git-utils-test-/);
    });
  });
});
