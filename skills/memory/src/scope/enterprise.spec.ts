/**
 * T047: Unit tests for enterprise path handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  getEnterprisePath,
  validateEnterprisePath,
  getEnterpriseStatus,
} from './enterprise.js';

describe('Enterprise', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'enterprise-test-'));
    // Clear environment variable
    delete process.env.CLAUDE_MEMORY_ENTERPRISE_PATH;
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    delete process.env.CLAUDE_MEMORY_ENTERPRISE_PATH;
  });

  describe('getEnterprisePath', () => {
    it('should return path from environment variable when set', () => {
      const expectedPath = '/custom/enterprise/path';
      process.env.CLAUDE_MEMORY_ENTERPRISE_PATH = expectedPath;

      const result = getEnterprisePath();

      expect(result).toBe(expectedPath);
    });

    it('should read from managed-settings.json when env var not set', () => {
      const managedSettings = {
        env: {
          CLAUDE_MEMORY_ENTERPRISE_PATH: '/managed/path',
        },
      };
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        JSON.stringify(managedSettings)
      );

      const result = getEnterprisePath(testDir);

      expect(result).toBe('/managed/path');
    });

    it('should accept direct .json file path', () => {
      const jsonPath = path.join(testDir, 'custom-settings.json');
      fs.writeFileSync(
        jsonPath,
        JSON.stringify({
          env: { CLAUDE_MEMORY_ENTERPRISE_PATH: '/from/json' },
        })
      );

      const result = getEnterprisePath(jsonPath);

      expect(result).toBe('/from/json');
    });

    it('should return undefined when managed-settings.json has invalid JSON', () => {
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        'not valid json {'
      );

      const result = getEnterprisePath(testDir);

      expect(result).toBeUndefined();
    });

    it('should return undefined when env key not present in settings', () => {
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        JSON.stringify({ env: { OTHER_VAR: 'value' } })
      );

      const result = getEnterprisePath(testDir);

      expect(result).toBeUndefined();
    });

    it('should return undefined when env object is empty', () => {
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        JSON.stringify({ env: {} })
      );

      const result = getEnterprisePath(testDir);

      expect(result).toBeUndefined();
    });

    it('should return undefined when settings has no env section', () => {
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        JSON.stringify({ other: 'data' })
      );

      const result = getEnterprisePath(testDir);

      expect(result).toBeUndefined();
    });

    it('should return undefined when no managed-settings.json exists', () => {
      const result = getEnterprisePath('/nonexistent/path');

      expect(result).toBeUndefined();
    });

    it('should prioritise environment variable over managed-settings.json', () => {
      process.env.CLAUDE_MEMORY_ENTERPRISE_PATH = '/env/path';
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        JSON.stringify({
          env: { CLAUDE_MEMORY_ENTERPRISE_PATH: '/settings/path' },
        })
      );

      const result = getEnterprisePath(testDir);

      expect(result).toBe('/env/path');
    });
  });

  describe('validateEnterprisePath', () => {
    it('should return valid: true for accessible directory', () => {
      const result = validateEnterprisePath(testDir);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid: false for non-existent path', () => {
      const result = validateEnterprisePath('/nonexistent/path');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should return valid: false when path is a file not a directory', () => {
      const filePath = path.join(testDir, 'not-a-directory.txt');
      fs.writeFileSync(filePath, 'content');

      const result = validateEnterprisePath(filePath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a directory');
    });

    it('should return valid: false for inaccessible directory', () => {
      // Create a directory with no permissions (may not work on all systems)
      const restrictedDir = path.join(testDir, 'restricted');
      fs.mkdirSync(restrictedDir);

      // This test may be skipped on Windows or if running as root
      try {
        fs.chmodSync(restrictedDir, 0o000);
        const result = validateEnterprisePath(restrictedDir);

        // Restore permissions for cleanup
        fs.chmodSync(restrictedDir, 0o755);

        // Only assert if we're not root (root can access anything)
        if (process.getuid && process.getuid() !== 0) {
          expect(result.valid).toBe(false);
          expect(result.error).toContain('inaccessible');
        }
      } catch {
        // Skip on systems where chmod doesn't work as expected
      }
    });
  });

  describe('getEnterpriseStatus', () => {
    it('should return configured: false when no enterprise path', () => {
      const result = getEnterpriseStatus('/nonexistent');

      expect(result.configured).toBe(false);
      expect(result.accessible).toBe(false);
      expect(result.path).toBeUndefined();
    });

    it('should return configured: true with valid accessible path', () => {
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        JSON.stringify({
          env: { CLAUDE_MEMORY_ENTERPRISE_PATH: testDir },
        })
      );

      const result = getEnterpriseStatus(testDir);

      expect(result.configured).toBe(true);
      expect(result.accessible).toBe(true);
      expect(result.path).toBe(testDir);
      expect(result.error).toBeUndefined();
    });

    it('should return configured: true but accessible: false for invalid path', () => {
      fs.writeFileSync(
        path.join(testDir, 'managed-settings.json'),
        JSON.stringify({
          env: { CLAUDE_MEMORY_ENTERPRISE_PATH: '/nonexistent/path' },
        })
      );

      const result = getEnterpriseStatus(testDir);

      expect(result.configured).toBe(true);
      expect(result.accessible).toBe(false);
      expect(result.path).toBe('/nonexistent/path');
      expect(result.error).toBeDefined();
    });

    it('should use environment variable for status', () => {
      process.env.CLAUDE_MEMORY_ENTERPRISE_PATH = testDir;

      const result = getEnterpriseStatus();

      expect(result.configured).toBe(true);
      expect(result.accessible).toBe(true);
      expect(result.path).toBe(testDir);
    });

    it('should include error message when path is inaccessible', () => {
      process.env.CLAUDE_MEMORY_ENTERPRISE_PATH = '/bad/path';

      const result = getEnterpriseStatus();

      expect(result.configured).toBe(true);
      expect(result.accessible).toBe(false);
      expect(result.error).toContain('does not exist');
    });
  });
});
