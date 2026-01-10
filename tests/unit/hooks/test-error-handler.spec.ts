/**
 * T103: Unit test for hook error handling
 *
 * Tests the error handling utilities used across all hooks
 * to ensure consistent, safe error reporting.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HookError,
  handleHookError,
  formatErrorMessage,
  isRecoverableError,
  logError,
  createErrorResponse,
  withErrorBoundary,
  ErrorSeverity,
} from '../../../hooks/lib/error-handler.js';

describe('Error Handler', () => {
  describe('HookError', () => {
    it('should create error with hook name and cause', () => {
      const cause = new Error('Original error');
      const error = new HookError('pre-tool-use/check', 'Failed to check', cause);

      expect(error.hookName).toBe('pre-tool-use/check');
      expect(error.message).toBe('Failed to check');
      expect(error.cause).toBe(cause);
    });

    it('should include severity level', () => {
      const error = new HookError(
        'post-tool-use/inject',
        'Injection failed',
        undefined,
        ErrorSeverity.Warning
      );

      expect(error.severity).toBe(ErrorSeverity.Warning);
    });

    it('should default to Error severity', () => {
      const error = new HookError('hook', 'message');
      expect(error.severity).toBe(ErrorSeverity.Error);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format basic error', () => {
      const error = new Error('Something went wrong');
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('Something went wrong');
    });

    it('should include stack trace when available', () => {
      const error = new Error('With stack');
      const formatted = formatErrorMessage(error, { includeStack: true });

      expect(formatted).toContain('With stack');
      expect(formatted).toContain('at ');
    });

    it('should truncate long messages', () => {
      const longMessage = 'x'.repeat(500);
      const error = new Error(longMessage);
      const formatted = formatErrorMessage(error, { maxLength: 100 });

      expect(formatted.length).toBeLessThanOrEqual(103); // 100 + '...'
    });

    it('should handle HookError with context', () => {
      const hookError = new HookError('my-hook', 'Hook failed');
      const formatted = formatErrorMessage(hookError);

      expect(formatted).toContain('my-hook');
      expect(formatted).toContain('Hook failed');
    });
  });

  describe('isRecoverableError', () => {
    it('should return true for file not found', () => {
      const error = new Error('ENOENT: no such file or directory');
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return true for network timeout', () => {
      const error = new Error('ETIMEDOUT');
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return true for permission denied', () => {
      const error = new Error('EACCES: permission denied');
      expect(isRecoverableError(error)).toBe(true);
    });

    it('should return false for syntax errors', () => {
      const error = new SyntaxError('Unexpected token');
      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return false for type errors', () => {
      const error = new TypeError('Cannot read property');
      expect(isRecoverableError(error)).toBe(false);
    });

    it('should return true for HookError with Warning severity', () => {
      const error = new HookError('hook', 'warning', undefined, ErrorSeverity.Warning);
      expect(isRecoverableError(error)).toBe(true);
    });
  });

  describe('createErrorResponse', () => {
    it('should create structured error response', () => {
      const error = new Error('Test error');
      const response = createErrorResponse('pre-tool-use', error);

      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('hookName', 'pre-tool-use');
    });

    it('should include timestamp', () => {
      const error = new Error('Test error');
      const before = Date.now();
      const response = createErrorResponse('hook', error);
      const after = Date.now();

      expect(response.timestamp).toBeGreaterThanOrEqual(before);
      expect(response.timestamp).toBeLessThanOrEqual(after);
    });

    it('should mark recoverable errors', () => {
      const recoverableError = new Error('ENOENT: file not found');
      const fatalError = new SyntaxError('parse error');

      expect(createErrorResponse('hook', recoverableError).recoverable).toBe(true);
      expect(createErrorResponse('hook', fatalError).recoverable).toBe(false);
    });
  });

  describe('withErrorBoundary', () => {
    it('should return result for successful function', async () => {
      const fn = async () => 'success';
      const result = await withErrorBoundary('hook', fn);

      expect(result).toBe('success');
    });

    it('should handle sync errors', async () => {
      const fn = () => {
        throw new Error('sync error');
      };

      const result = await withErrorBoundary('hook', fn, { fallback: 'fallback' });
      expect(result).toBe('fallback');
    });

    it('should handle async errors', async () => {
      const fn = async () => {
        throw new Error('async error');
      };

      const result = await withErrorBoundary('hook', fn, { fallback: 'fallback' });
      expect(result).toBe('fallback');
    });

    it('should call onError callback', async () => {
      const onError = vi.fn();
      const error = new Error('test');
      const fn = async () => {
        throw error;
      };

      await withErrorBoundary('hook', fn, { onError, fallback: null });

      expect(onError).toHaveBeenCalledWith(expect.any(HookError));
    });

    it('should rethrow when no fallback provided', async () => {
      const fn = async () => {
        throw new Error('no fallback');
      };

      await expect(withErrorBoundary('hook', fn)).rejects.toThrow('no fallback');
    });
  });

  describe('logError', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it('should log to console.error', () => {
      const error = new Error('test error');
      logError('my-hook', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include hook name in log', () => {
      const error = new Error('test');
      logError('special-hook', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('special-hook'));
    });

    it('should respect silent option', () => {
      const error = new Error('test');
      logError('hook', error, { silent: true });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
