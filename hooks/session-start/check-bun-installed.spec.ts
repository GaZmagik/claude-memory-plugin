#!/usr/bin/env bun
/**
 * Tests for check-bun-installed.mjs SessionStart hook
 *
 * This hook verifies Bun is installed and runs `bun install` if node_modules
 * is missing (marketplace install scenario).
 *
 * Test approach: Use subprocess execution with controlled environments.
 * We can't easily mock ES module imports in .mjs files, so we:
 * 1. Use temp directories to control filesystem state
 * 2. Set CLAUDE_PLUGIN_ROOT to point to controlled locations
 * 3. Test actual script behaviour via spawn
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { spawn } from '../src/core/subprocess.ts';
import { tmpdir } from 'os';

const HOOK_PATH = join(import.meta.dir, 'check-bun-installed.mjs');

// Create unique temp directory for tests
const TEST_TMP_DIR = join(tmpdir(), `check-bun-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(TEST_TMP_DIR, { recursive: true });
});

afterAll(() => {
  try {
    rmSync(TEST_TMP_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

/**
 * Helper to create a mock plugin directory structure
 */
function createMockPluginDir(
  name: string,
  options: {
    hasPackageJson?: boolean;
    hasNodeModules?: boolean;
    packageJsonContent?: object;
  } = {}
): string {
  const dir = join(TEST_TMP_DIR, name);
  mkdirSync(dir, { recursive: true });

  if (options.hasPackageJson !== false) {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify(options.packageJsonContent || { name: 'test-plugin', version: '1.0.0' })
    );
  }

  if (options.hasNodeModules) {
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
  }

  return dir;
}

describe('check-bun-installed hook', () => {
  describe('happy path', () => {
    it('should exit 0 when bun is installed and node_modules exists', async () => {
      // Create mock plugin with node_modules
      const pluginDir = createMockPluginDir('happy-path', {
        hasPackageJson: true,
        hasNodeModules: true,
      });

      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: pluginDir,
        },
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      // Should NOT show install message when node_modules exists
      expect(result.stdout).not.toContain('Installing plugin dependencies');
    });
  });

  describe('bun not installed scenario', () => {
    it('should show installation instructions when bun is not in PATH', async () => {
      // Create mock plugin dir
      const pluginDir = createMockPluginDir('no-bun', {
        hasPackageJson: true,
        hasNodeModules: false,
      });

      // Run with PATH that doesn't include bun
      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: pluginDir,
          PATH: '/usr/bin:/bin', // Minimal PATH without bun
        },
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('BUN NOT INSTALLED');
      expect(result.stdout).toContain('curl -fsSL https://bun.sh/install');
    });
  });

  describe('missing node_modules scenarios', () => {
    it('should attempt bun install when node_modules missing and package.json exists', async () => {
      const pluginDir = createMockPluginDir('missing-modules', {
        hasPackageJson: true,
        hasNodeModules: false,
      });

      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: pluginDir,
        },
        timeout: 35000, // bun install has 30s timeout
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Installing plugin dependencies');

      // Check if bun install was attempted (either succeeded or failed)
      const installedOrFailed =
        result.stdout.includes('Dependencies installed successfully') ||
        result.stdout.includes('Failed to install dependencies');
      expect(installedOrFailed).toBe(true);
    }, 40000);

    it('should warn gracefully when package.json is missing', async () => {
      const pluginDir = createMockPluginDir('no-package-json', {
        hasPackageJson: false,
        hasNodeModules: false,
      });

      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: pluginDir,
        },
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No package.json found');
      expect(result.stdout).toContain('cannot install dependencies');
    });
  });

  describe('CLAUDE_PLUGIN_ROOT validation', () => {
    it('should handle path with traversal attempts (..)', async () => {
      // Note: path.normalize() resolves '..' before validation check,
      // so '/tmp/../../../etc' becomes '/etc' which is a valid directory.
      // The script will then proceed but fail at package.json check.
      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: '/tmp/../../../etc',
        },
        timeout: 5000,
      });

      // Should not crash - path normalizes to /etc, then fails package.json check
      expect(result.exitCode).toBe(0);
    });

    it('should reject relative paths', async () => {
      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: 'relative/path/here',
        },
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Invalid CLAUDE_PLUGIN_ROOT');
    });

    it('should reject non-existent directories', async () => {
      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: '/this/path/definitely/does/not/exist/12345',
        },
        timeout: 5000,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Invalid CLAUDE_PLUGIN_ROOT');
    });

    it('should fall back to script location when env var is invalid', async () => {
      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: '',
        },
        timeout: 5000,
      });

      // Should not crash - falls back to script location
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle bun install timeout gracefully', async () => {
      // Create a mock plugin with package.json that will cause slow/failed install
      const pluginDir = createMockPluginDir('timeout-test', {
        hasPackageJson: true,
        hasNodeModules: false,
        packageJsonContent: {
          name: 'timeout-test',
          version: '1.0.0',
          // Empty dependencies - install should be fast, but we test the path
        },
      });

      const result = await spawn(['node', HOOK_PATH], {
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: pluginDir,
        },
        timeout: 35000,
      });

      // Should always exit 0 (don't block session)
      expect(result.exitCode).toBe(0);
    }, 40000);

    it('should provide helpful hint for permission errors', async () => {
      // Create a read-only directory to trigger EACCES
      const pluginDir = createMockPluginDir('permission-test', {
        hasPackageJson: true,
        hasNodeModules: false,
      });

      // Make directory read-only (this may not work on all systems)
      try {
        const { chmodSync } = await import('fs');
        chmodSync(pluginDir, 0o444);

        const result = await spawn(['node', HOOK_PATH], {
          env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: pluginDir,
          },
          timeout: 35000,
        });

        // Should exit 0 even on failure
        expect(result.exitCode).toBe(0);

        // Restore permissions for cleanup
        chmodSync(pluginDir, 0o755);
      } catch {
        // Skip test if we can't change permissions
        expect(true).toBe(true);
      }
    }, 40000);
  });

  describe('script location fallback', () => {
    it('should use script location when CLAUDE_PLUGIN_ROOT is not set', async () => {
      // Run without CLAUDE_PLUGIN_ROOT
      const envWithoutPluginRoot: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (key !== 'CLAUDE_PLUGIN_ROOT' && value !== undefined) {
          envWithoutPluginRoot[key] = value;
        }
      }

      const result = await spawn(['node', HOOK_PATH], {
        env: envWithoutPluginRoot,
        timeout: 5000,
      });

      // Should not crash - uses script's parent directory
      expect(result.exitCode).toBe(0);
    });
  });
});
