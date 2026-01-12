/**
 * T122-Tests: Unit tests for fork session detection utility
 *
 * Tests the fork detection, spawning, and logging utilities
 * used for background memory capture and retrospective analysis.
 *
 * Note: This test file mocks child_process to test our secure
 * execFileSync-based implementation. No actual commands are executed.
 */

import { describe, it, expect, mock, beforeEach, afterEach, afterAll } from 'bun:test';
import * as originalFs from 'node:fs';
import * as originalChildProcess from 'node:child_process';

// Create mock functions
const mockExecFileSync = mock(() => '');
const mockExistsSync = mock(() => false);
const mockMkdirSync = mock(() => undefined);
const mockWriteFileSync = mock(() => undefined);
const mockAppendFileSync = mock(() => undefined);

// Mock child_process - spread original and override only what we need
mock.module('node:child_process', () => ({
  ...originalChildProcess,
  execFileSync: mockExecFileSync,
}));

// Mock fs - spread original and override only what we need
mock.module('node:fs', () => ({
  ...originalFs,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  appendFileSync: mockAppendFileSync,
}));

// Import after mocking
const {
  hasClaudeBinary,
  getClaudeBinaryPath,
  canSpawnForkSession,
  spawnForkSession,
  createForkLogFile,
  writeForkLog,
  isForkedSession,
  getSessionId,
} = await import('../../../hooks/src/session/fork-detection.js');
const childProcess = await import('node:child_process');
const fs = await import('node:fs');

describe('Fork Detection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear mock call history
    mockExecFileSync.mockClear();
    mockExistsSync.mockClear();
    mockMkdirSync.mockClear();
    mockWriteFileSync.mockClear();
    mockAppendFileSync.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  afterAll(() => {
    // Restore original modules to prevent leaking to other test files
    // Note: mock.module() replacements persist in bun - this is best effort cleanup
    mock.restore();
  });

  describe('hasClaudeBinary', () => {
    it('should return true when claude binary is found', () => {
      mockExecFileSync.mockReturnValue('/usr/bin/claude\n');

      expect(hasClaudeBinary()).toBe(true);
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'which',
        ['claude'],
        { stdio: 'pipe' }
      );
    });

    it('should return false when claude binary is not found', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(hasClaudeBinary()).toBe(false);
    });

    it('should use execFileSync for security (not shell interpolation)', () => {
      mockExecFileSync.mockReturnValue('/usr/bin/claude\n');

      hasClaudeBinary();

      // Verify it's using execFileSync with separate args (not shell interpolation)
      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'which',
        ['claude'],
        expect.any(Object)
      );
    });
  });

  describe('getClaudeBinaryPath', () => {
    it('should return trimmed path when binary is found', () => {
      mockExecFileSync.mockReturnValue('/usr/bin/claude\n');

      expect(getClaudeBinaryPath()).toBe('/usr/bin/claude');
    });

    it('should return null when binary is not found', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(getClaudeBinaryPath()).toBe(null);
    });

    it('should handle paths with spaces', () => {
      mockExecFileSync.mockReturnValue(
        '/Users/test user/bin/claude\n'
      );

      expect(getClaudeBinaryPath()).toBe('/Users/test user/bin/claude');
    });
  });

  describe('canSpawnForkSession', () => {
    it('should return false when claude binary is not available', () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(canSpawnForkSession()).toBe(false);
    });

    it('should return false when no API key is set', () => {
      mockExecFileSync.mockReturnValue('/usr/bin/claude\n');
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;

      expect(canSpawnForkSession()).toBe(false);
    });

    it('should return true when binary exists and ANTHROPIC_API_KEY is set', () => {
      mockExecFileSync.mockReturnValue('/usr/bin/claude\n');
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

      expect(canSpawnForkSession()).toBe(true);
    });

    it('should return true when binary exists and CLAUDE_API_KEY is set', () => {
      mockExecFileSync.mockReturnValue('/usr/bin/claude\n');
      process.env.CLAUDE_API_KEY = 'sk-claude-test';

      expect(canSpawnForkSession()).toBe(true);
    });
  });

  describe('spawnForkSession', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
      process.env.PATH = '/usr/bin';
      process.env.HOME = '/home/test';
    });

    it('should return error when cannot spawn', async () => {
      mockExecFileSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = await spawnForkSession('test prompt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot spawn fork session');
    });

    it('should pass prompt as final argument', async () => {
      // First call is for hasClaudeBinary check
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      await spawnForkSession('test prompt');

      expect(childProcess.execFileSync).toHaveBeenLastCalledWith(
        'claude',
        expect.arrayContaining(['test prompt']),
        expect.any(Object)
      );
    });

    it('should include --print flag by default', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      await spawnForkSession('test');

      expect(childProcess.execFileSync).toHaveBeenLastCalledWith(
        'claude',
        expect.arrayContaining(['--print']),
        expect.any(Object)
      );
    });

    it('should include model parameter', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      await spawnForkSession('test', { model: 'claude-sonnet-4-20250514' });

      expect(childProcess.execFileSync).toHaveBeenLastCalledWith(
        'claude',
        expect.arrayContaining(['--model', 'claude-sonnet-4-20250514']),
        expect.any(Object)
      );
    });

    it('should include system prompt when provided', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      await spawnForkSession('test', { systemPrompt: 'You are helpful' });

      expect(childProcess.execFileSync).toHaveBeenLastCalledWith(
        'claude',
        expect.arrayContaining(['--system-prompt', 'You are helpful']),
        expect.any(Object)
      );
    });

    it('should include max tokens when provided', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      await spawnForkSession('test', { maxTokens: 1000 });

      expect(childProcess.execFileSync).toHaveBeenLastCalledWith(
        'claude',
        expect.arrayContaining(['--max-tokens', '1000']),
        expect.any(Object)
      );
    });

    it('should return success with output on successful execution', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('Claude response here');

      const result = await spawnForkSession('test');

      expect(result.success).toBe(true);
      expect(result.output).toBe('Claude response here');
      expect(result.exitCode).toBe(0);
    });

    it('should return error on execution failure', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockImplementationOnce(() => {
          const error = new Error('command failed') as Error & {
            status: number;
            stderr: string;
          };
          error.status = 1;
          error.stderr = 'API error';
          throw error;
        });

      const result = await spawnForkSession('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(result.exitCode).toBe(1);
    });

    it('should whitelist only necessary environment variables', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      process.env.DANGEROUS_VAR = 'should not be passed';

      await spawnForkSession('test');

      const lastCall = mockExecFileSync.mock.calls[1];
      const options = lastCall[2] as { env: Record<string, string | undefined> };

      expect(options.env).toHaveProperty('PATH');
      expect(options.env).toHaveProperty('HOME');
      expect(options.env).toHaveProperty('ANTHROPIC_API_KEY');
      expect(options.env).not.toHaveProperty('DANGEROUS_VAR');
    });

    it('should respect timeout option', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      await spawnForkSession('test', { timeout: 30000 });

      const lastCall = mockExecFileSync.mock.calls[1];
      const options = lastCall[2] as { timeout: number };

      expect(options.timeout).toBe(30000);
    });

    it('should use default timeout of 60000ms', async () => {
      mockExecFileSync
        .mockReturnValueOnce('/usr/bin/claude\n')
        .mockReturnValueOnce('response');

      await spawnForkSession('test');

      const lastCall = mockExecFileSync.mock.calls[1];
      const options = lastCall[2] as { timeout: number };

      expect(options.timeout).toBe(60000);
    });
  });

  describe('createForkLogFile', () => {
    it('should create logs directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      createForkLogFile('test-prefix');

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/logs'),
        { recursive: true }
      );
    });

    it('should not create directory if it exists', () => {
      mockExistsSync.mockReturnValue(true);

      createForkLogFile('test-prefix');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should return path with prefix and timestamp', () => {
      mockExistsSync.mockReturnValue(true);

      const logPath = createForkLogFile('memory-capture');

      expect(logPath).toContain('memory-capture-');
      expect(logPath).toMatch(/\.log$/);
    });

    it('should include session ID when provided', () => {
      mockExistsSync.mockReturnValue(true);

      const logPath = createForkLogFile('test', 'abc123');

      expect(logPath).toContain('abc123');
    });

    it('should generate unique log paths', async () => {
      mockExistsSync.mockReturnValue(true);

      const path1 = createForkLogFile('test');
      // Wait a tiny bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));
      const path2 = createForkLogFile('test');

      // Paths should be different due to timestamp
      expect(path1).not.toBe(path2);
    });
  });

  describe('writeForkLog', () => {
    it('should write content with timestamp', () => {
      mockExistsSync.mockReturnValue(false);

      writeForkLog('/path/to/log.log', 'Test content');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/log.log',
        expect.stringContaining('Test content')
      );
    });

    it('should include ISO timestamp in entry', () => {
      mockExistsSync.mockReturnValue(false);

      writeForkLog('/path/to/log.log', 'Test content');

      const call = mockWriteFileSync.mock.calls[0];
      const content = call[1] as string;

      // Should have ISO timestamp format [2026-01-10T...]
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should append when file exists and append is true', () => {
      mockExistsSync.mockReturnValue(true);

      writeForkLog('/path/to/log.log', 'New content', true);

      expect(fs.appendFileSync).toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should overwrite when append is false', () => {
      mockExistsSync.mockReturnValue(true);

      writeForkLog('/path/to/log.log', 'New content', false);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    it('should write new file when file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      writeForkLog('/path/to/log.log', 'First content', true);

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('isForkedSession', () => {
    it('should return true when CLAUDE_FORK_SESSION is set', () => {
      process.env.CLAUDE_FORK_SESSION = '1';

      expect(isForkedSession()).toBe(true);
    });

    it('should return true when CLAUDE_BACKGROUND_TASK is set', () => {
      process.env.CLAUDE_BACKGROUND_TASK = '1';

      expect(isForkedSession()).toBe(true);
    });

    it('should return false when neither env var is set', () => {
      delete process.env.CLAUDE_FORK_SESSION;
      delete process.env.CLAUDE_BACKGROUND_TASK;

      expect(isForkedSession()).toBe(false);
    });

    it('should return false for empty string values', () => {
      process.env.CLAUDE_FORK_SESSION = '';

      expect(isForkedSession()).toBe(false);
    });
  });

  describe('getSessionId', () => {
    it('should return CLAUDE_SESSION_ID when set', () => {
      process.env.CLAUDE_SESSION_ID = 'test-session-123';

      expect(getSessionId()).toBe('test-session-123');
    });

    it('should generate ID when CLAUDE_SESSION_ID is not set', () => {
      delete process.env.CLAUDE_SESSION_ID;

      const id = getSessionId();

      expect(id).toBeTruthy();
      expect(id).toContain('-');
    });

    it('should generate unique IDs', () => {
      delete process.env.CLAUDE_SESSION_ID;

      const id1 = getSessionId();
      const id2 = getSessionId();

      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with timestamp component', () => {
      delete process.env.CLAUDE_SESSION_ID;

      const before = Date.now();
      const id = getSessionId();
      const after = Date.now();

      const timestampPart = parseInt(id.split('-')[0], 10);
      expect(timestampPart).toBeGreaterThanOrEqual(before);
      expect(timestampPart).toBeLessThanOrEqual(after);
    });
  });
});

describe('Security Requirements', () => {
  it('documents that execFileSync is used instead of shell interpolation', () => {
    // This test documents the security requirement:
    // The implementation uses execFileSync with argument arrays
    // which prevents command injection attacks
    //
    // If someone changes to shell interpolation patterns like:
    //   execSync(`claude ${prompt}`)
    // The security review should catch this.
    //
    // The fork-detection.ts file header comment confirms:
    // "SECURITY: Uses execFileSync with argument array to prevent command injection"
    expect(true).toBe(true);
  });
});
