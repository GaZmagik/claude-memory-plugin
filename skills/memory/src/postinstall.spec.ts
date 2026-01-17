/**
 * Tests for postinstall script
 *
 * Verifies the CLI symlink creation logic for fresh installs and upgrades.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, symlinkSync, readlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('postinstall', () => {
  // We test the logic, not the actual script execution (which modifies ~/.bun/bin)
  // This mirrors what postinstall.ts does but in a temp directory

  const testDir = join(tmpdir(), `postinstall-test-${Date.now()}`);
  const bunBin = join(testDir, '.bun', 'bin');
  const linkPath = join(bunBin, 'memory');
  const cliPath = join(testDir, 'skills', 'memory', 'src', 'cli.ts');

  beforeEach(() => {
    // Create test directory structure
    mkdirSync(join(testDir, 'skills', 'memory', 'src'), { recursive: true });
    // Create fake CLI file
    Bun.write(cliPath, '#!/usr/bin/env bun\nconsole.log("cli");');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Core postinstall logic extracted for testing
   */
  function createSymlink(targetPath: string, linkLocation: string, binDir: string): void {
    // Ensure bin directory exists
    mkdirSync(binDir, { recursive: true });

    // Remove existing symlink if present
    if (existsSync(linkLocation)) {
      rmSync(linkLocation);
    }

    // Create symlink
    symlinkSync(targetPath, linkLocation);
  }

  describe('fresh install (no existing symlink)', () => {
    it('should create bin directory if it does not exist', () => {
      expect(existsSync(bunBin)).toBe(false);

      createSymlink(cliPath, linkPath, bunBin);

      expect(existsSync(bunBin)).toBe(true);
    });

    it('should create symlink to CLI', () => {
      createSymlink(cliPath, linkPath, bunBin);

      expect(existsSync(linkPath)).toBe(true);
      expect(readlinkSync(linkPath)).toBe(cliPath);
    });
  });

  describe('upgrade (existing symlink)', () => {
    const oldCliPath = join(testDir, 'old', 'cli.ts');

    beforeEach(() => {
      // Create old CLI and symlink (simulating v1.0.0 install)
      mkdirSync(join(testDir, 'old'), { recursive: true });
      Bun.write(oldCliPath, '#!/usr/bin/env bun\nconsole.log("old cli");');
      mkdirSync(bunBin, { recursive: true });
      symlinkSync(oldCliPath, linkPath);
    });

    it('should overwrite existing symlink', () => {
      expect(readlinkSync(linkPath)).toBe(oldCliPath);

      createSymlink(cliPath, linkPath, bunBin);

      expect(readlinkSync(linkPath)).toBe(cliPath);
    });

    it('should not fail if bin directory already exists', () => {
      expect(existsSync(bunBin)).toBe(true);

      expect(() => createSymlink(cliPath, linkPath, bunBin)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle symlink to non-existent target', () => {
      const nonExistentCli = join(testDir, 'does-not-exist.ts');

      // symlinkSync allows dangling symlinks
      createSymlink(nonExistentCli, linkPath, bunBin);

      // existsSync returns false for dangling symlinks (checks target)
      // but readlinkSync still works on the symlink itself
      expect(readlinkSync(linkPath)).toBe(nonExistentCli);
    });
  });
});
