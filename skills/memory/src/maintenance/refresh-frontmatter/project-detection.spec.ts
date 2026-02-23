/**
 * Tests for detectProjectName
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectProjectName } from './project-detection.js';

describe('detectProjectName', () => {
  let testDir: string;
  let memoryDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detect-project-test-'));
    memoryDir = path.join(testDir, '.claude', 'memory');
    fs.mkdirSync(memoryDir, { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should detect project name from git remote URL', () => {
    vi.spyOn(childProcess, 'execFileSync').mockReturnValue(
      'https://github.com/user/my-awesome-repo.git\n'
    );

    const result = detectProjectName(memoryDir);
    expect(result).toBe('my-awesome-repo');
  });

  it('should extract repo name from SSH git URL', () => {
    vi.spyOn(childProcess, 'execFileSync').mockReturnValue(
      'git@github.com:org/project-name.git\n'
    );

    const result = detectProjectName(memoryDir);
    expect(result).toBe('project-name');
  });

  it('should fall back to directory name when git fails', () => {
    vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
      throw new Error('Not a git repository');
    });

    const result = detectProjectName(memoryDir);

    // Should fall back to the project root directory name (testDir basename)
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(0);
  });

  it('should handle git remote returning empty URL', () => {
    vi.spyOn(childProcess, 'execFileSync').mockReturnValue('');

    const result = detectProjectName(memoryDir);

    // Should fall back to directory name
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
