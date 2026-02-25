/**
 * Tests for detectProjectName
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { detectProjectName } from './project-detection.js';

const { mockExecFileSync } = vi.hoisted(() => ({
  mockExecFileSync: vi.fn(),
}));

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
  execFileSync: mockExecFileSync,
}));

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
    mockExecFileSync.mockReturnValue(
      'https://github.com/user/my-awesome-repo.git\n'
    );

    const result = detectProjectName(memoryDir);
    expect(result).toBe('my-awesome-repo');
  });

  it('should extract repo name from SSH git URL', () => {
    mockExecFileSync.mockReturnValue(
      'git@github.com:org/project-name.git\n'
    );

    const result = detectProjectName(memoryDir);
    expect(result).toBe('project-name');
  });

  it('should fall back to directory name when git fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('Not a git repository');
    });

    const result = detectProjectName(memoryDir);

    // Should fall back to the project root directory name (testDir basename)
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(0);
  });

  it('should handle git remote returning empty URL', () => {
    mockExecFileSync.mockReturnValue('');

    const result = detectProjectName(memoryDir);

    // Should fall back to directory name
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
