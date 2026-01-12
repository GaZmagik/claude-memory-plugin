/**
 * Unit tests for error-handler
 *
 * Tests the error handling utilities for Claude Code hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  allow,
  allowWithOutput,
  block,
  warn,
  isForkedSession,
  withTimeout,
  safeOperation,
  parallel,
  type HookResult,
} from '../../../hooks/src/core/error-handler.js';
import { EXIT_ALLOW, EXIT_BLOCK, type HookInput } from '../../../hooks/src/core/types.js';
import { HookError } from '../../../hooks/src/core/errors.js';

describe('Error Handler', () => {
  describe('allow', () => {
    it('should create successful allow result without output', () => {
      const result = allow();

      expect(result.exitCode).toBe(EXIT_ALLOW);
      expect(result.output).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should create successful allow result with additional context', () => {
      const result = allow('Memory check passed');

      expect(result.exitCode).toBe(EXIT_ALLOW);
      expect(result.output).toBeDefined();
      expect(result.output?.hookSpecificOutput).toBeDefined();
      expect(result.output?.hookSpecificOutput?.hookEventName).toBe('success');
      expect(result.output?.hookSpecificOutput?.additionalContext).toBe('Memory check passed');
    });

    it('should not include output when context is empty string', () => {
      const result = allow('');

      expect(result.exitCode).toBe(EXIT_ALLOW);
      // Empty string should still be undefined
      expect(result.output).toBeUndefined();
    });
  });

  describe('allowWithOutput', () => {
    it('should create allow result with empty context when not provided', () => {
      const result = allowWithOutput();

      expect(result.exitCode).toBe(EXIT_ALLOW);
      expect(result.output).toBeDefined();
      expect(result.output?.hookSpecificOutput?.additionalContext).toBe('');
    });

    it('should create allow result with provided context', () => {
      const result = allowWithOutput('Hook executed successfully');

      expect(result.exitCode).toBe(EXIT_ALLOW);
      expect(result.output?.hookSpecificOutput?.additionalContext).toBe('Hook executed successfully');
      expect(result.output?.hookSpecificOutput?.hookEventName).toBe('success');
    });

    it('should always output JSON structure', () => {
      const result = allowWithOutput('test');

      expect(result.output).toBeDefined();
      expect(result.output?.hookSpecificOutput).toBeDefined();
      expect(typeof result.output?.hookSpecificOutput).toBe('object');
    });
  });

  describe('block', () => {
    it('should create block result with error message', () => {
      const result = block('Cannot modify protected directory');

      expect(result.exitCode).toBe(EXIT_BLOCK);
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(HookError);
      expect(result.output).toBeUndefined();
    });

    it('should create protection-type error', () => {
      const result = block('Protected file');

      expect(result.error?.exitCode).toBe(EXIT_BLOCK);
      const stderr = result.error?.toStderr();
      expect(stderr).toContain('Protected file');
    });

    it('should handle empty message', () => {
      const result = block('');

      expect(result.exitCode).toBe(EXIT_BLOCK);
      expect(result.error).toBeDefined();
    });
  });

  describe('warn', () => {
    it('should create warn result with exit code 1', () => {
      const result = warn('Configuration issue detected');

      expect(result.exitCode).toBe(1);
      expect(result.error).toBeDefined();
      expect(result.error).toBeInstanceOf(HookError);
    });

    it('should create configuration-type error', () => {
      const result = warn('Missing config');

      expect(result.error?.exitCode).toBe(1);
      const stderr = result.error?.toStderr();
      expect(stderr).toContain('Missing config');
    });

    it('should not block execution', () => {
      const result = warn('Warning message');

      // Should not be EXIT_BLOCK
      expect(result.exitCode).not.toBe(EXIT_BLOCK);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('isForkedSession', () => {
    it('should return true for forked session with default permission mode', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        permission_mode: 'default',
        tool_name: 'Read',
        tool_input: {},
      };

      expect(isForkedSession(input)).toBe(true);
    });

    it('should return false for normal session with bypassPermissions', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        permission_mode: 'bypassPermissions',
        tool_name: 'Read',
        tool_input: {},
      };

      expect(isForkedSession(input)).toBe(false);
    });

    it('should return false for undefined permission mode', () => {
      const input: HookInput = {
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: {},
      };

      expect(isForkedSession(input)).toBe(false);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if operation completes before timeout', async () => {
      const operation = Promise.resolve('success');

      const result = await withTimeout(operation, 1000);

      expect(result).toBe('success');
    });

    it('should reject with timeout error if operation exceeds timeout', async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve('late'), 200));

      await expect(withTimeout(operation, 50, 'Too slow')).rejects.toThrow('Too slow');
    });

    it('should use default timeout message', async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve('late'), 200));

      await expect(withTimeout(operation, 50)).rejects.toThrow('Operation timed out');
    });

    it('should throw HookError on timeout', async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve('late'), 200));

      try {
        await withTimeout(operation, 50, 'Custom timeout');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(HookError);
        expect((error as HookError).message).toContain('Custom timeout');
      }
    });

    it('should propagate operation errors', async () => {
      const operation = Promise.reject(new Error('Operation failed'));

      await expect(withTimeout(operation, 1000)).rejects.toThrow('Operation failed');
    });

    it('should handle zero timeout', async () => {
      const operation = new Promise((resolve) => setTimeout(() => resolve('done'), 10));

      await expect(withTimeout(operation, 0)).rejects.toThrow('Operation timed out');
    });
  });

  describe('safeOperation', () => {
    it('should return result when operation succeeds', async () => {
      const operation = async () => 'success';
      const defaultValue = 'default';

      const result = await safeOperation(operation, defaultValue);

      expect(result).toBe('success');
    });

    it('should return default value when operation fails', async () => {
      const operation = async () => {
        throw new Error('Failed');
      };
      const defaultValue = 'fallback';

      const result = await safeOperation(operation, defaultValue);

      expect(result).toBe('fallback');
    });

    it('should call onError callback when error occurs', async () => {
      const operation = async () => {
        throw new Error('Test error');
      };
      const defaultValue = 'default';
      const onError = vi.fn();

      await safeOperation(operation, defaultValue, onError);

      expect(onError).toHaveBeenCalledOnce();
      expect(onError).toHaveBeenCalledWith(expect.any(HookError));
    });

    it('should not call onError when operation succeeds', async () => {
      const operation = async () => 'success';
      const defaultValue = 'default';
      const onError = vi.fn();

      await safeOperation(operation, defaultValue, onError);

      expect(onError).not.toHaveBeenCalled();
    });

    it('should convert errors to HookError in callback', async () => {
      const operation = async () => {
        throw new Error('Original error');
      };
      const onError = vi.fn();

      await safeOperation(operation, 'default', onError);

      const receivedError = onError.mock.calls[0][0];
      expect(receivedError).toBeInstanceOf(HookError);
      expect(receivedError.message).toContain('Original error');
    });
  });

  describe('parallel', () => {
    it('should execute operations in parallel and return all results', async () => {
      const operations = [
        async () => 'result1',
        async () => 'result2',
        async () => 'result3',
      ];

      const results = await parallel(operations);

      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should return HookError for failed operations', async () => {
      const operations = [
        async () => 'success',
        async () => {
          throw new Error('Failed');
        },
        async () => 'success2',
      ];

      const results = await parallel(operations);

      expect(results).toHaveLength(3);
      expect(results[0]).toBe('success');
      expect(results[1]).toBeInstanceOf(HookError);
      expect(results[2]).toBe('success2');
    });

    it('should continue execution even when some operations fail', async () => {
      const operations = [
        async () => {
          throw new Error('Fail 1');
        },
        async () => {
          throw new Error('Fail 2');
        },
        async () => 'success',
      ];

      const results = await parallel(operations);

      expect(results).toHaveLength(3);
      expect(results[0]).toBeInstanceOf(HookError);
      expect(results[1]).toBeInstanceOf(HookError);
      expect(results[2]).toBe('success');
    });

    it('should handle empty operations array', async () => {
      const results = await parallel([]);

      expect(results).toEqual([]);
    });

    it('should preserve error messages in HookError', async () => {
      const operations = [
        async () => {
          throw new Error('Specific error message');
        },
      ];

      const results = await parallel(operations);

      expect(results[0]).toBeInstanceOf(HookError);
      expect((results[0] as HookError).message).toContain('Specific error message');
    });

    it('should handle mixed synchronous and asynchronous operations', async () => {
      const operations = [
        async () => await Promise.resolve('async'),
        async () => 'sync',
        async () => await new Promise((resolve) => setTimeout(() => resolve('delayed'), 10)),
      ];

      const results = await parallel(operations);

      expect(results).toHaveLength(3);
      expect(results).toContain('async');
      expect(results).toContain('sync');
      expect(results).toContain('delayed');
    });
  });

  describe('Result type consistency', () => {
    it('should have consistent structure for all allow results', () => {
      const results = [allow(), allow('context'), allowWithOutput('output')];

      for (const result of results) {
        expect(result).toHaveProperty('exitCode');
        expect(result.exitCode).toBe(EXIT_ALLOW);
      }
    });

    it('should have consistent structure for error results', () => {
      const results = [block('blocked'), warn('warning')];

      for (const result of results) {
        expect(result).toHaveProperty('exitCode');
        expect(result).toHaveProperty('error');
        expect(result.error).toBeInstanceOf(HookError);
      }
    });

    it('should not have both error and output in same result', () => {
      const allowResult = allow('test');
      const blockResult = block('test');
      const warnResult = warn('test');

      // Allow results should not have errors
      expect(allowResult.error).toBeUndefined();

      // Error results should not have output
      expect(blockResult.output).toBeUndefined();
      expect(warnResult.output).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical pre-tool-use flow', async () => {
      const checkProtection = async (filePath: string): Promise<HookResult> => {
        if (filePath.includes('.claude/memory')) {
          return block('Cannot modify memory directory');
        }
        return allow();
      };

      const protectedResult = await checkProtection('/project/.claude/memory/test.md');
      const allowedResult = await checkProtection('/project/src/index.ts');

      expect(protectedResult.exitCode).toBe(EXIT_BLOCK);
      expect(protectedResult.error).toBeDefined();

      expect(allowedResult.exitCode).toBe(EXIT_ALLOW);
      expect(allowedResult.error).toBeUndefined();
    });

    it('should handle post-tool-use with context injection', async () => {
      const addContext = async (toolName: string): Promise<HookResult> => {
        if (toolName === 'Read') {
          return allowWithOutput('Remember to check for gotchas');
        }
        return allow();
      };

      const withContext = await addContext('Read');
      const withoutContext = await addContext('Write');

      expect(withContext.output).toBeDefined();
      expect(withContext.output?.hookSpecificOutput?.additionalContext).toContain('gotchas');

      expect(withoutContext.output).toBeUndefined();
    });

    it('should handle forked session detection flow', () => {
      const normalInput: HookInput = {
        hook_event_name: 'PreToolUse',
        permission_mode: 'bypassPermissions',
        tool_name: 'Read',
        tool_input: { file_path: 'test.ts' },
      };

      const forkedInput: HookInput = {
        hook_event_name: 'PreToolUse',
        permission_mode: 'default',
        tool_name: 'Read',
        tool_input: { file_path: 'test.ts' },
      };

      if (isForkedSession(normalInput)) {
        // Should not reach here
        expect.fail('Normal session detected as forked');
      }

      if (isForkedSession(forkedInput)) {
        const result = allow();
        expect(result.exitCode).toBe(EXIT_ALLOW);
      } else {
        expect.fail('Forked session not detected');
      }
    });
  });
});
