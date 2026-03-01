/**
 * Tests for spawn-session utilities
 *
 * Tests the background Claude session spawning infrastructure
 * used for memory capture in PreCompact and SessionEnd hooks.
 *
 * fs is mocked via vi.spyOn (not vi.mock) to prevent module registry
 * pollution that breaks co-located test files like session-cache.spec.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { mock } from 'bun:test';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';

// Import real child_process for spreading into vi.mock factory
import * as originalChildProcess from 'node:child_process';

// Import fs namespace for vi.spyOn (no module-level mock — prevents test pollution)
import * as fs from 'node:fs';

// Mock function for child_process vi.mock factory
// Note: vi.hoisted() is unavailable in Bun — top-level declarations are hoisted naturally
const mockUnref = vi.fn(() => undefined);
const mockSpawn = vi.fn(() => ({ unref: mockUnref }));

// Mock child_process — uses vi.mock because SUT dynamically imports spawn
vi.mock('node:child_process', () => ({
  ...originalChildProcess,
  spawn: mockSpawn,
}));

// fs is mocked via vi.spyOn in beforeEach — no vi.mock('fs') needed

import {
  getLogDir,
  getTimestamp,
  isMemoryCaptureSession,
  spawnSessionWithContext,
  validateShellSafe,
  validatePathSafe,
} from '../../../hooks/src/session/spawn-session.js';
import * as childProcess from 'node:child_process';

// fs spy variables — created fresh in each beforeEach, restored in afterEach
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockExistsSync: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockWriteFileSync: any;

describe('spawn-session', () => {
  beforeEach(() => {
    mockSpawn.mockClear();
    // Set up fs spies (vi.spyOn modifies namespace properties, not module registry)
    mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined as any);
    mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore fs spies to real implementations
  });

  afterAll(() => {
    mock.restore(); // Unmock child_process vi.mock
  });

  describe('getTimestamp', () => {
    it('should return ISO-like timestamp without special chars', () => {
      const ts = getTimestamp();
      expect(ts).toMatch(/^\d{8}T\d{6}Z$/);
    });

    it('should return valid timestamps on subsequent calls', async () => {
      const ts1 = getTimestamp();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const ts2 = getTimestamp();
      expect(ts1).toMatch(/^\d{8}T\d{6}Z$/);
      expect(ts2).toMatch(/^\d{8}T\d{6}Z$/);
    });
  });

  describe('isMemoryCaptureSession', () => {
    it('should return false in normal environment', () => {
      const result = isMemoryCaptureSession();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });
  });

  describe('getLogDir', () => {
    it('should return project log dir when .claude exists', () => {
      mockExistsSync.mockReturnValue(true);

      const logDir = getLogDir('/home/user/project');

      expect(logDir).toBe('/home/user/project/.claude/logs');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/home/user/project/.claude/logs', {
        recursive: true,
      });
    });

    it('should return global log dir when .claude does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      const logDir = getLogDir('/tmp/no-claude-dir');
      const expectedGlobal = join(homedir(), '.claude', 'logs');

      expect(logDir).toBe(expectedGlobal);
      expect(fs.mkdirSync).toHaveBeenCalledWith(expectedGlobal, { recursive: true });
    });
  });

  describe('spawnSessionWithContext', () => {
    it('should create log file with header', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'test-session-123',
        cwd: '/home/user/project',
        prompt: '/claude-memory-plugin:commit',
        contextPrompt: 'Session context here',
        logPrefix: 'memory-capture',
      });

      // Should write log file header
      type WriteCall = [path: string, content: string, options?: unknown];
      const calls = mockWriteFileSync.mock.calls as unknown as WriteCall[];
      const headerCall = calls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('===')
      );
      expect(headerCall).toBeTruthy();
      if (headerCall) {
        expect(headerCall[0]).toContain('memory-capture');
        expect(headerCall[1]).toContain('=== memory-capture Started:');
      }
    });

    it('should write context to /tmp/ instead of logDir', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'test-session-123',
        cwd: '/home/user/project',
        prompt: '/claude-memory-plugin:commit',
        contextPrompt: 'My conversation context',
        logPrefix: 'test',
      });

      // Should write context file to /tmp/ with claude- prefix
      type WriteCall = [path: string, content: string, options?: unknown];
      const calls = mockWriteFileSync.mock.calls as unknown as WriteCall[];
      const contextCall = calls.find(
        (call) => call[0].includes('claude-context-test-session-123.txt')
      );
      expect(contextCall).toBeTruthy();
      if (contextCall) {
        expect(contextCall[0]).toContain(tmpdir());
        expect(contextCall[1]).toBe('My conversation context');
      }
    });

    it('should spawn detached wrapper script from /tmp/', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'test-session',
        cwd: '/project',
        prompt: '/claude-memory-plugin:commit',
        contextPrompt: 'Context',
        logPrefix: 'test',
      });

      expect(childProcess.spawn).toHaveBeenCalledWith(
        expect.stringContaining('claude-wrapper-test-session.sh'),
        expect.arrayContaining([
          expect.stringContaining('.log'), // logFile (still in .claude/logs)
          expect.stringContaining('claude-context-'), // contextFile (in /tmp/)
          '300', // timeout
          'claude-haiku-4-5-20251001', // model
          'Bash,Read,Grep,Glob,TodoWrite', // tools
          expect.stringContaining('claude-prompt-'), // promptFile (in /tmp/)
          '/project', // cwd
        ]),
        expect.objectContaining({
          cwd: '/project',
          detached: true,
          stdio: 'ignore',
        })
      );
    });

    it('should return started: true with log file path', async () => {
      mockExistsSync.mockReturnValue(true);

      const result = await spawnSessionWithContext({
        sessionId: 'test-session',
        cwd: '/project',
        prompt: '/test',
        contextPrompt: 'Context',
        logPrefix: 'test',
      });

      expect(result.started).toBe(true);
      expect(result.logFile).toContain('test-');
      expect(result.logFile).toContain('test-session.log');
    });

    it('should include session ID in log header', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'unique-session-id',
        cwd: '/project',
        prompt: '/test',
        contextPrompt: 'Context',
        logPrefix: 'test',
      });

      type WriteCall = [path: string, content: string, options?: unknown];
      const calls = mockWriteFileSync.mock.calls as unknown as WriteCall[];
      const headerCall = calls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('===')
      );
      expect(headerCall).toBeTruthy();
      if (headerCall) {
        expect(headerCall[1]).toContain('Session ID: unique-session-id');
      }
    });

    it('should include context size in log header', async () => {
      mockExistsSync.mockReturnValue(true);

      const contextPrompt = 'A'.repeat(1000);
      await spawnSessionWithContext({
        sessionId: 'test',
        cwd: '/project',
        prompt: '/test',
        contextPrompt,
        logPrefix: 'test',
      });

      type WriteCall = [path: string, content: string, options?: unknown];
      const calls = mockWriteFileSync.mock.calls as unknown as WriteCall[];
      const headerCall = calls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('===')
      );
      expect(headerCall).toBeTruthy();
      if (headerCall) {
        expect(headerCall[1]).toContain('Context size: 1000 bytes');
      }
    });

    it('should use custom timeout when provided', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'test',
        cwd: '/project',
        prompt: '/test',
        contextPrompt: 'Context',
        logPrefix: 'test',
        timeoutSecs: 600,
      });

      type SpawnCall = [script: string, args: string[], options: unknown];
      const spawnCalls = mockSpawn.mock.calls as unknown as SpawnCall[];
      const spawnCall = spawnCalls[0];
      expect(spawnCall).toBeTruthy();
      if (spawnCall) {
        expect(spawnCall[1]).toContain('600'); // timeout as string argument
      }
    });

    it('should use custom model when provided', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'test',
        cwd: '/project',
        prompt: '/test',
        contextPrompt: 'Context',
        logPrefix: 'test',
        model: 'claude-sonnet-4-20250514',
      });

      type SpawnCall = [script: string, args: string[], options: unknown];
      const spawnCalls = mockSpawn.mock.calls as unknown as SpawnCall[];
      const spawnCall = spawnCalls[0];
      expect(spawnCall).toBeTruthy();
      if (spawnCall) {
        expect(spawnCall[1]).toContain('claude-sonnet-4-20250514');
      }
    });

    it('should use custom tools when provided', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'test',
        cwd: '/project',
        prompt: '/test',
        contextPrompt: 'Context',
        logPrefix: 'test',
        tools: 'Read,Write,Edit',
      });

      type SpawnCall = [script: string, args: string[], options: unknown];
      const spawnCalls = mockSpawn.mock.calls as unknown as SpawnCall[];
      const spawnCall = spawnCalls[0];
      expect(spawnCall).toBeTruthy();
      if (spawnCall) {
        expect(spawnCall[1]).toContain('Read,Write,Edit');
      }
    });

    it('should include trigger in log header when provided', async () => {
      mockExistsSync.mockReturnValue(true);

      await spawnSessionWithContext({
        sessionId: 'test',
        cwd: '/project',
        prompt: '/test',
        contextPrompt: 'Context',
        logPrefix: 'test',
        trigger: 'compaction',
      });

      type WriteCall = [path: string, content: string, options?: unknown];
      const calls = mockWriteFileSync.mock.calls as unknown as WriteCall[];
      const headerCall = calls.find(
        (call) => typeof call[1] === 'string' && call[1].includes('===')
      );
      expect(headerCall).toBeTruthy();
      if (headerCall) {
        expect(headerCall[1]).toContain('Trigger: compaction');
      }
    });

    it('should write prompt to temp file to prevent shell injection', async () => {
      mockExistsSync.mockReturnValue(true);

      const prompt = "/claude-memory-plugin:commit msg='test with quotes'; rm -rf /";
      await spawnSessionWithContext({
        sessionId: 'test',
        cwd: '/project',
        prompt,
        contextPrompt: 'Context',
        logPrefix: 'test',
      });

      // Verify prompt is written to temp file, not passed as arg directly
      type WriteFileCall = [path: string, content: string, options?: { mode: number }];
      const writeFileCalls = mockWriteFileSync.mock.calls as unknown as WriteFileCall[];
      const promptFileCall = writeFileCalls.find(
        (call) => call[0].includes('claude-prompt-')
      );
      expect(promptFileCall).toBeTruthy();
      if (promptFileCall) {
        // Prompt content written to file (including shell metacharacters - safe when read from file)
        expect(promptFileCall[1]).toBe(prompt);
        // File has secure permissions
        expect(promptFileCall[2]).toEqual({ mode: 0o600 });
      }

      // Verify spawn args contain file path, not raw prompt
      type SpawnCall = [script: string, args: string[], options: unknown];
      const spawnCalls = mockSpawn.mock.calls as unknown as SpawnCall[];
      const spawnCall = spawnCalls[0];
      expect(spawnCall).toBeTruthy();
      if (spawnCall) {
        // Args should contain prompt FILE path, not prompt string
        expect(spawnCall[1]).toContainEqual(expect.stringContaining('claude-prompt-'));
        expect(spawnCall[1]).not.toContain(prompt);
      }
    });

    it('should reject cwd with shell metacharacters', async () => {
      mockExistsSync.mockReturnValue(true);

      await expect(
        spawnSessionWithContext({
          sessionId: 'test',
          cwd: '/project; rm -rf /',
          prompt: '/test',
          contextPrompt: 'Context',
          logPrefix: 'test',
        })
      ).rejects.toThrow('Invalid path: contains shell metacharacters');
    });

    it('should reject model with shell metacharacters', async () => {
      mockExistsSync.mockReturnValue(true);

      await expect(
        spawnSessionWithContext({
          sessionId: 'test',
          cwd: '/project',
          prompt: '/test',
          contextPrompt: 'Context',
          logPrefix: 'test',
          model: 'claude-sonnet; whoami',
        })
      ).rejects.toThrow('Invalid model: contains shell metacharacters');
    });

    it('should reject tools with shell metacharacters', async () => {
      mockExistsSync.mockReturnValue(true);

      await expect(
        spawnSessionWithContext({
          sessionId: 'test',
          cwd: '/project',
          prompt: '/test',
          contextPrompt: 'Context',
          logPrefix: 'test',
          tools: 'Bash$(cat /etc/passwd)',
        })
      ).rejects.toThrow('Invalid tools: contains shell metacharacters');
    });

    it('should reject plugin dirs with shell metacharacters', async () => {
      mockExistsSync.mockReturnValue(true);

      await expect(
        spawnSessionWithContext({
          sessionId: 'test',
          cwd: '/project',
          prompt: '/test',
          contextPrompt: 'Context',
          logPrefix: 'test',
          pluginDirs: ['/safe/path', '/unsafe`whoami`/path'],
        })
      ).rejects.toThrow('Invalid path: contains shell metacharacters');
    });
  });

  describe('validateShellSafe', () => {
    it('should accept safe strings', () => {
      expect(validateShellSafe('claude-haiku-4-5-20251001', 'model')).toBe(
        'claude-haiku-4-5-20251001'
      );
      expect(validateShellSafe('Bash,Read,Write,Edit', 'tools')).toBe('Bash,Read,Write,Edit');
    });

    it('should reject backticks', () => {
      expect(() => validateShellSafe('test`whoami`', 'field')).toThrow(
        'Invalid field: contains shell metacharacters'
      );
    });

    it('should reject $() command substitution', () => {
      expect(() => validateShellSafe('test$(id)', 'field')).toThrow(
        'Invalid field: contains shell metacharacters'
      );
    });

    it('should reject semicolons', () => {
      expect(() => validateShellSafe('test; rm -rf /', 'field')).toThrow(
        'Invalid field: contains shell metacharacters'
      );
    });

    it('should reject pipes', () => {
      expect(() => validateShellSafe('test | cat', 'field')).toThrow(
        'Invalid field: contains shell metacharacters'
      );
    });

    it('should reject redirects', () => {
      expect(() => validateShellSafe('test > /tmp/out', 'field')).toThrow(
        'Invalid field: contains shell metacharacters'
      );
      expect(() => validateShellSafe('test < /etc/passwd', 'field')).toThrow(
        'Invalid field: contains shell metacharacters'
      );
    });

    it('should reject newlines', () => {
      expect(() => validateShellSafe('test\nrm -rf /', 'field')).toThrow(
        'Invalid field: contains shell metacharacters'
      );
    });
  });

  describe('validatePathSafe', () => {
    it('should accept safe paths', () => {
      expect(validatePathSafe('/home/user/project')).toBe('/home/user/project');
      expect(validatePathSafe('/tmp/claude-test-123')).toBe('/tmp/claude-test-123');
      expect(validatePathSafe('~/.claude/plugins')).toBe('~/.claude/plugins');
      expect(validatePathSafe('/path with spaces/file.txt')).toBe('/path with spaces/file.txt');
    });

    it('should reject backticks in paths', () => {
      expect(() => validatePathSafe('/path/`whoami`/file')).toThrow(
        'Invalid path: contains shell metacharacters'
      );
    });

    it('should reject $() in paths', () => {
      expect(() => validatePathSafe('/path/$(id)/file')).toThrow(
        'Invalid path: contains shell metacharacters'
      );
    });

    it('should reject semicolons in paths', () => {
      expect(() => validatePathSafe('/path; rm -rf /')).toThrow(
        'Invalid path: contains shell metacharacters'
      );
    });

    it('should reject quotes in paths', () => {
      expect(() => validatePathSafe("/path'injection")).toThrow(
        'Invalid path: contains shell metacharacters'
      );
      expect(() => validatePathSafe('/path"injection')).toThrow(
        'Invalid path: contains shell metacharacters'
      );
    });

    it('should reject exclamation marks in paths', () => {
      expect(() => validatePathSafe('/path/!important')).toThrow(
        'Invalid path: contains shell metacharacters'
      );
    });
  });
});
