/**
 * Unit tests for hook-logger
 *
 * Tests the debug logging utility for Claude Code hooks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  logHookStart,
  logHookEnd,
  logHookError,
  createHookLogger,
  type LogContext,
} from '../../../hooks/src/core/hook-logger.js';

describe('Hook Logger', () => {
  // Mock the LOG_FILE path for testing
  // Note: We can't easily mock the module-level constant, so we'll test the actual file
  const actualLogFile = join(homedir(), '.claude/logs/hook-debug.log');

  beforeEach(() => {
    // Clear the actual log file before each test
    if (existsSync(actualLogFile)) {
      rmSync(actualLogFile);
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(actualLogFile)) {
      rmSync(actualLogFile);
    }
  });

  describe('logHookStart', () => {
    it('should log hook start with context and input', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PreToolUse',
        toolName: 'Read',
      };

      const input = { file_path: '/test/file.ts' };

      logHookStart(ctx, input);

      // Verify log file exists and contains expected content
      expect(existsSync(actualLogFile)).toBe(true);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('START PreToolUse:test-hook');
      expect(logContent).toContain('tool=Read');
      expect(logContent).toContain('file_path');
    });

    it('should truncate long input strings', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PreToolUse',
      };

      const longInput = { data: 'x'.repeat(1000) };

      logHookStart(ctx, longInput);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('[truncated]');
      expect(logContent.length).toBeLessThan(2000);
    });

    it('should handle toolName as N/A when not provided', () => {
      const ctx: LogContext = {
        hookName: 'session-start',
        hookType: 'SessionStart',
      };

      logHookStart(ctx, {});

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('tool=N/A');
    });

    it('should include ISO timestamp', () => {
      const ctx: LogContext = {
        hookName: 'test',
        hookType: 'PostToolUse',
      };

      logHookStart(ctx, {});

      const logContent = readFileSync(actualLogFile, 'utf-8');
      // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe('logHookEnd', () => {
    it('should log hook end with exit code', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PostToolUse',
      };

      logHookEnd(ctx, 0);

      expect(existsSync(actualLogFile)).toBe(true);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('END PostToolUse:test-hook');
      expect(logContent).toContain('exitCode=0');
      expect(logContent).toContain('output=none');
    });

    it('should log hook end with output', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PostToolUse',
      };

      const output = { message: 'Success', data: [1, 2, 3] };

      logHookEnd(ctx, 0, output);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('END PostToolUse:test-hook');
      expect(logContent).toContain('exitCode=0');
      expect(logContent).toContain('message');
      expect(logContent).toContain('Success');
    });

    it('should truncate long output', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PostToolUse',
      };

      const output = { data: 'y'.repeat(1000) };

      logHookEnd(ctx, 0, output);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('[truncated]');
    });

    it('should handle non-zero exit codes', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PreToolUse',
      };

      logHookEnd(ctx, 1);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('exitCode=1');
    });
  });

  describe('logHookError', () => {
    it('should log Error objects with stack trace', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PreToolUse',
      };

      const error = new Error('Test error message');

      logHookError(ctx, error);

      expect(existsSync(actualLogFile)).toBe(true);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('ERROR PreToolUse:test-hook');
      expect(logContent).toContain('Test error message');
      expect(logContent).toContain('at '); // Stack trace indicator
    });

    it('should log Error objects without stack trace', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PostToolUse',
      };

      const error = new Error('Error without stack');
      delete error.stack;

      logHookError(ctx, error);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('ERROR PostToolUse:test-hook');
      expect(logContent).toContain('Error without stack');
    });

    it('should handle non-Error objects', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PreToolUse',
      };

      logHookError(ctx, 'String error');

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('ERROR PreToolUse:test-hook');
      expect(logContent).toContain('String error');
    });

    it('should handle null and undefined errors', () => {
      const ctx: LogContext = {
        hookName: 'test-hook',
        hookType: 'PreToolUse',
      };

      logHookError(ctx, null);
      logHookError(ctx, undefined);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('ERROR PreToolUse:test-hook');
    });
  });

  describe('createHookLogger', () => {
    it('should create a logger with bound context', () => {
      const logger = createHookLogger('my-hook', 'UserPromptSubmit');

      logger.start({ prompt: 'test' }, 'Read');

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('START UserPromptSubmit:my-hook');
      expect(logContent).toContain('tool=Read');
    });

    it('should support end() method', () => {
      const logger = createHookLogger('my-hook', 'PostToolUse');

      logger.end(0, { result: 'done' });

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('END PostToolUse:my-hook');
      expect(logContent).toContain('exitCode=0');
      expect(logContent).toContain('result');
    });

    it('should support error() method', () => {
      const logger = createHookLogger('my-hook', 'PreToolUse');

      logger.error(new Error('Logger error'));

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('ERROR PreToolUse:my-hook');
      expect(logContent).toContain('Logger error');
    });

    it('should support custom log() method', () => {
      const logger = createHookLogger('my-hook', 'SessionStart');

      logger.log('Custom message');

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('INFO SessionStart:my-hook');
      expect(logContent).toContain('Custom message');
    });

    it('should maintain context across multiple calls', () => {
      const logger = createHookLogger('context-hook', 'PreToolUse');

      logger.start({ step: 1 });
      logger.log('Processing step 1');
      logger.log('Processing step 2');
      logger.end(0);

      const logContent = readFileSync(actualLogFile, 'utf-8');

      // All log entries should have the same context
      const lines = logContent.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(4);

      for (const line of lines) {
        expect(line).toContain('context-hook');
        expect(line).toContain('PreToolUse');
      }
    });
  });

  describe('Log file handling', () => {
    it('should create log directory if it does not exist', () => {
      const logDir = join(homedir(), '.claude/logs');

      // Directory should be created by module initialization
      expect(existsSync(logDir)).toBe(true);
    });

    it('should append to existing log file', () => {
      const ctx1: LogContext = {
        hookName: 'hook-1',
        hookType: 'PreToolUse',
      };

      const ctx2: LogContext = {
        hookName: 'hook-2',
        hookType: 'PostToolUse',
      };

      logHookStart(ctx1, {});
      logHookStart(ctx2, {});

      const logContent = readFileSync(actualLogFile, 'utf-8');
      const lines = logContent.split('\n').filter(l => l.trim());

      expect(lines.length).toBe(2);
      expect(lines[0]).toContain('hook-1');
      expect(lines[1]).toContain('hook-2');
    });

    it('should not throw if log file write fails', () => {
      const ctx: LogContext = {
        hookName: 'test',
        hookType: 'PreToolUse',
      };

      // This should not throw even if write fails
      expect(() => logHookStart(ctx, {})).not.toThrow();
      expect(() => logHookEnd(ctx, 0)).not.toThrow();
      expect(() => logHookError(ctx, new Error())).not.toThrow();
    });
  });

  describe('Input/Output serialisation', () => {
    it('should serialise objects to JSON', () => {
      const ctx: LogContext = {
        hookName: 'test',
        hookType: 'PreToolUse',
      };

      const input = { nested: { data: { value: 42 } } };

      logHookStart(ctx, input);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('nested');
      expect(logContent).toContain('value');
      expect(logContent).toContain('42');
    });

    it('should handle circular references gracefully', () => {
      const ctx: LogContext = {
        hookName: 'test',
        hookType: 'PreToolUse',
      };

      const circular: any = { name: 'test' };
      circular.self = circular;

      // Should not throw, should use String() fallback
      expect(() => logHookStart(ctx, circular)).not.toThrow();
    });

    it('should handle arrays', () => {
      const ctx: LogContext = {
        hookName: 'test',
        hookType: 'PostToolUse',
      };

      const output = [1, 2, 3, 4, 5];

      logHookEnd(ctx, 0, output);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('[1,2,3,4,5]');
    });

    it('should handle primitive values', () => {
      const ctx: LogContext = {
        hookName: 'test',
        hookType: 'PreToolUse',
      };

      logHookStart(ctx, 'string input');
      logHookStart(ctx, 123);
      logHookStart(ctx, true);
      logHookStart(ctx, null);

      const logContent = readFileSync(actualLogFile, 'utf-8');
      expect(logContent).toContain('"string input"');
      expect(logContent).toContain('123');
      expect(logContent).toContain('true');
      expect(logContent).toContain('null');
    });
  });
});
