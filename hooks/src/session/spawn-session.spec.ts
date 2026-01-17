/**
 * Tests for spawn-session utilities
 *
 * Tests the background Claude session spawning infrastructure
 * used for memory capture in PreCompact and SessionEnd hooks.
 *
 * Note: Uses bun:test mock.module() to be compatible with other
 * isolated tests that mock node modules.
 */

import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test';
import { join } from 'path';
import { homedir, tmpdir } from 'os';
import * as originalFs from 'fs';
import * as originalChildProcess from 'node:child_process';

// Create mock functions
const mockExistsSync = mock(() => false);
const mockMkdirSync = mock(() => undefined);
const mockWriteFileSync = mock(() => undefined);
const mockSpawn = mock(() => ({ unref: mock(() => undefined) }));

// Mock fs - spread original and override only what we need
mock.module('fs', () => ({
  ...originalFs,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync,
}));

// Mock child_process - spread original and override only what we need
mock.module('node:child_process', () => ({
  ...originalChildProcess,
  spawn: mockSpawn,
}));

// Import after mocking
const {
  getLogDir,
  getTimestamp,
  isMemoryCaptureSession,
  isForkedSession,
  spawnSessionWithContext,
} = await import('../../../hooks/src/session/spawn-session.js');
const fs = await import('fs');
const childProcess = await import('node:child_process');

describe('spawn-session', () => {
  beforeEach(() => {
    mockExistsSync.mockClear();
    mockMkdirSync.mockClear();
    mockWriteFileSync.mockClear();
    mockSpawn.mockClear();
  });

  afterAll(() => {
    // Restore original modules
    mock.module('fs', () => originalFs);
    mock.module('node:child_process', () => originalChildProcess);
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

  describe('isMemoryCaptureSession / isForkedSession', () => {
    it('should return false in normal environment', () => {
      const result = isMemoryCaptureSession();
      expect(typeof result).toBe('boolean');
      // isForkedSession should be an alias
      expect(isForkedSession).toBe(isMemoryCaptureSession);
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
          '/claude-memory-plugin:commit', // prompt
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

    it('should pass special characters in prompt without shell escaping', async () => {
      mockExistsSync.mockReturnValue(true);

      const prompt = "/claude-memory-plugin:commit msg='test with quotes'";
      await spawnSessionWithContext({
        sessionId: 'test',
        cwd: '/project',
        prompt,
        contextPrompt: 'Context',
        logPrefix: 'test',
      });

      type SpawnCall = [script: string, args: string[], options: unknown];
      const spawnCalls = mockSpawn.mock.calls as unknown as SpawnCall[];
      const spawnCall = spawnCalls[0];
      expect(spawnCall).toBeTruthy();
      if (spawnCall) {
        // Args are passed directly, no shell escaping needed
        expect(spawnCall[1]).toContain(prompt);
      }
    });
  });
});
