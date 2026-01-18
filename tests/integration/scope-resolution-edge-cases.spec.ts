/**
 * Integration Test: Scope Resolution Edge Cases
 *
 * Tests edge cases in scope resolution:
 * - Missing git repository
 * - Nested projects
 * - Symlinked directories
 * - Corrupted git configuration
 *
 * Note: Uses execSync for test setup only - not production code
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findGitRoot, isInGitRepository } from '../../skills/memory/src/scope/git-utils.js';
import { resolveScope, getScopePath } from '../../skills/memory/src/scope/resolver.js';
import { Scope } from '../../skills/memory/src/types/enums.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

// Helper to initialize git safely in tests
function initGitRepo(dir: string): void {
  try {
    execSync('git init', { cwd: dir, stdio: 'ignore' });
  } catch {
    // Ignore errors in test setup
  }
}

describe('Scope Resolution Edge Cases', () => {
  let testDir: string;
  const globalMemoryPath = path.join(process.env.HOME || '/tmp', '.claude', 'memory');

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'memory-scope-edge-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('Missing Git Repository', () => {
    it('should detect non-git directory', () => {
      const isGit = isInGitRepository(testDir);
      expect(isGit).toBe(false);
    });

    it('should return null for git root when not in repo', () => {
      const gitRoot = findGitRoot(testDir);
      expect(gitRoot).toBeNull();
    });

    it('should fall back to appropriate scope when no git', () => {
      const result = resolveScope({ cwd: testDir, globalMemoryPath });
      // Should return Global or Local, not Project
      expect([Scope.Global, Scope.Local]).toContain(result.scope);
    });
  });

  describe('Git Repository Presence', () => {
    it('should detect git repository', () => {
      initGitRepo(testDir);

      const isGit = isInGitRepository(testDir);
      expect(isGit).toBe(true);
    });

    it('should find git root', () => {
      initGitRepo(testDir);

      const gitRoot = findGitRoot(testDir);
      expect(gitRoot).toBe(testDir);
    });

    it('should find git root from subdirectory', () => {
      initGitRepo(testDir);

      const subDir = path.join(testDir, 'sub', 'nested');
      fs.mkdirSync(subDir, { recursive: true });

      const gitRoot = findGitRoot(subDir);
      expect(gitRoot).toBe(testDir);
    });
  });

  describe('Nested Projects', () => {
    it('should handle nested git repositories', () => {
      // Create outer repo
      initGitRepo(testDir);

      // Create inner repo
      const innerDir = path.join(testDir, 'inner-project');
      fs.mkdirSync(innerDir);
      initGitRepo(innerDir);

      // From inner directory, should find inner repo
      const innerRoot = findGitRoot(innerDir);
      expect(innerRoot).toBe(innerDir);

      // From outer directory, should find outer repo
      const outerRoot = findGitRoot(testDir);
      expect(outerRoot).toBe(testDir);
    });

    it('should handle deeply nested directories', () => {
      initGitRepo(testDir);

      const deepDir = path.join(testDir, 'a', 'b', 'c', 'd', 'e', 'f');
      fs.mkdirSync(deepDir, { recursive: true });

      const gitRoot = findGitRoot(deepDir);
      expect(gitRoot).toBe(testDir);
    });
  });

  describe('Symlinked Directories', () => {
    it('should handle symlinked project directory', () => {
      const realDir = path.join(testDir, 'real-project');
      const symlinkDir = path.join(testDir, 'symlink-project');

      fs.mkdirSync(realDir);
      initGitRepo(realDir);
      fs.symlinkSync(realDir, symlinkDir, 'dir');

      // Should detect git through symlink
      const isGit = isInGitRepository(symlinkDir);
      expect(isGit).toBe(true);
    });

    it('should resolve symlinked paths correctly', () => {
      const realDir = path.join(testDir, 'real');
      const symlinkDir = path.join(testDir, 'link');

      fs.mkdirSync(realDir);
      fs.symlinkSync(realDir, symlinkDir, 'dir');

      const scopePath = getScopePath(Scope.Local, symlinkDir, globalMemoryPath);
      expect(scopePath).toBeDefined();
    });
  });

  describe('Corrupted Git Configuration', () => {
    it('should handle missing .git directory after init', () => {
      initGitRepo(testDir);

      // Remove .git directory
      const gitDir = path.join(testDir, '.git');
      fs.rmSync(gitDir, { recursive: true, force: true });

      // Should detect no git repo
      const isGit = isInGitRepository(testDir);
      expect(isGit).toBe(false);
    });

    it('should handle corrupted .git directory', () => {
      initGitRepo(testDir);

      // Corrupt .git by making it a file instead of directory
      const gitDir = path.join(testDir, '.git');
      fs.rmSync(gitDir, { recursive: true, force: true });
      fs.writeFileSync(gitDir, 'corrupted');

      // Should handle gracefully
      const isGit = isInGitRepository(testDir);
      expect(typeof isGit).toBe('boolean');
    });
  });

  describe('Special Path Cases', () => {
    it('should handle paths with spaces', () => {
      const dirWithSpaces = path.join(testDir, 'dir with spaces');
      fs.mkdirSync(dirWithSpaces);
      initGitRepo(dirWithSpaces);

      const gitRoot = findGitRoot(dirWithSpaces);
      expect(gitRoot).toBe(dirWithSpaces);
    });

    it('should handle paths with special characters', () => {
      const specialDir = path.join(testDir, 'dir-with_special.chars');
      fs.mkdirSync(specialDir);

      const scopePath = getScopePath(Scope.Local, specialDir, globalMemoryPath);
      expect(scopePath).toBeDefined();
    });

    it('should handle very long paths', () => {
      const longPath = path.join(testDir, 'a'.repeat(100), 'b'.repeat(100));
      fs.mkdirSync(longPath, { recursive: true });

      const scopePath = getScopePath(Scope.Local, longPath, globalMemoryPath);
      expect(scopePath).toBeDefined();
    });
  });

  describe('Root and System Paths', () => {
    it('should handle operations near filesystem root', () => {
      // Test with tmpdir which is typically /tmp
      const tmpRoot = tmpdir();
      const isGit = isInGitRepository(tmpRoot);

      expect(typeof isGit).toBe('boolean');
    });

    it('should not traverse above filesystem root', () => {
      // Start from root (or near it)
      const nearRoot = path.parse(testDir).root;

      const gitRoot = findGitRoot(nearRoot);
      // Should either find a repo or return null, not crash
      expect(gitRoot === null || typeof gitRoot === 'string').toBe(true);
    });
  });

  describe('Scope Path Resolution', () => {
    it('should resolve Global scope to home directory', () => {
      const globalPath = getScopePath(Scope.Global, testDir, globalMemoryPath);
      expect(globalPath).toContain('.claude');
      expect(globalPath).toContain('memory');
    });

    it('should resolve Local scope to current directory', () => {
      const localPath = getScopePath(Scope.Local, testDir, globalMemoryPath);
      expect(localPath).toContain(testDir);
      expect(localPath).toContain('.claude');
    });

    it('should resolve Project scope when in git repo', () => {
      initGitRepo(testDir);

      const projectPath = getScopePath(Scope.Project, testDir, globalMemoryPath);
      expect(projectPath).toContain('.claude');
    });
  });

  describe('Concurrent Access', () => {
    it('should handle multiple processes checking git status', async () => {
      initGitRepo(testDir);

      // Check git status from multiple "processes" (async)
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(isInGitRepository(testDir))
      );

      const results = await Promise.all(promises);
      expect(results.every(r => r === true)).toBe(true);
    });

    it('should handle git initialization during checks', async () => {
      // Start checking
      const checkPromise = Promise.resolve(isInGitRepository(testDir));

      // Initialize git
      setTimeout(() => {
        initGitRepo(testDir);
      }, 5);

      const result = await checkPromise;
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Permissions and Access', () => {
    it('should handle unreadable .git directory', () => {
      initGitRepo(testDir);

      const gitDir = path.join(testDir, '.git');
      fs.chmodSync(gitDir, 0o000);

      try {
        const isGit = isInGitRepository(testDir);
        expect(typeof isGit).toBe('boolean');
      } finally {
        // Restore permissions
        fs.chmodSync(gitDir, 0o755);
      }
    });
  });
});
