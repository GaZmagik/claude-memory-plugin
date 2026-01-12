/**
 * Unit tests for hooks/src/core/errors.ts
 */

import { describe, it, expect } from 'vitest';
import {
  HookError,
  isHookError,
  toHookError,
  type HookErrorCategory,
} from './errors.js';
import { EXIT_CODES } from './constants.js';

describe('HookError', () => {
  describe('constructor', () => {
    it('should create error with all properties', () => {
      const error = new HookError('Test error', 'validation', EXIT_CODES.BLOCK, {
        field: 'value',
      });

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('HookError');
      expect(error.category).toBe('validation');
      expect(error.exitCode).toBe(EXIT_CODES.BLOCK);
      expect(error.details).toEqual({ field: 'value' });
      expect(error.stack).toBeDefined();
    });

    it('should default to BLOCK exit code when not provided', () => {
      const error = new HookError('Test', 'validation');

      expect(error.exitCode).toBe(EXIT_CODES.BLOCK);
    });

    it('should handle missing details', () => {
      const error = new HookError('Test', 'internal', EXIT_CODES.ALLOW);

      expect(error.details).toBeUndefined();
    });
  });

  describe('static factory methods', () => {
    it('should create validation error', () => {
      const error = HookError.validation('Invalid input', { field: 'test' });

      expect(error.category).toBe('validation');
      expect(error.exitCode).toBe(EXIT_CODES.BLOCK);
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'test' });
    });

    it('should create protection error', () => {
      const error = HookError.protection('Protected resource', { path: '/etc' });

      expect(error.category).toBe('protection');
      expect(error.exitCode).toBe(EXIT_CODES.BLOCK);
      expect(error.message).toBe('Protected resource');
    });

    it('should create timeout error', () => {
      const error = HookError.timeout('Operation timed out', { timeout: 5000 });

      expect(error.category).toBe('timeout');
      expect(error.exitCode).toBe(EXIT_CODES.WARN);
      expect(error.message).toBe('Operation timed out');
    });

    it('should create ollama error', () => {
      const error = HookError.ollama('Model not found', { model: 'gemma' });

      expect(error.category).toBe('ollama');
      expect(error.exitCode).toBe(EXIT_CODES.ALLOW);
      expect(error.message).toBe('Model not found');
    });

    it('should create parse error', () => {
      const error = HookError.parse('JSON parse failed', { line: 42 });

      expect(error.category).toBe('parse');
      expect(error.exitCode).toBe(EXIT_CODES.BLOCK);
      expect(error.message).toBe('JSON parse failed');
    });

    it('should create filesystem error with default WARN exit code', () => {
      const error = HookError.filesystem('File not found');

      expect(error.category).toBe('filesystem');
      expect(error.exitCode).toBe(EXIT_CODES.WARN);
      expect(error.message).toBe('File not found');
    });

    it('should create filesystem error with custom exit code', () => {
      const error = HookError.filesystem('Critical file missing', EXIT_CODES.BLOCK);

      expect(error.category).toBe('filesystem');
      expect(error.exitCode).toBe(EXIT_CODES.BLOCK);
    });

    it('should create configuration error', () => {
      const error = HookError.configuration('Invalid config', { key: 'timeout' });

      expect(error.category).toBe('configuration');
      expect(error.exitCode).toBe(EXIT_CODES.WARN);
      expect(error.message).toBe('Invalid config');
    });

    it('should create internal error', () => {
      const error = HookError.internal('Unexpected error', { context: 'test' });

      expect(error.category).toBe('internal');
      expect(error.exitCode).toBe(EXIT_CODES.ALLOW);
      expect(error.message).toBe('Unexpected error');
    });
  });

  describe('toStderr', () => {
    it('should format BLOCK error with emoji', () => {
      const error = HookError.validation('Invalid input');
      const output = error.toStderr();

      expect(output).toContain('🚨');
      expect(output).toContain('Invalid input');
    });

    it('should format WARN error with emoji', () => {
      const error = HookError.timeout('Slow operation');
      const output = error.toStderr();

      expect(output).toContain('⚠️');
      expect(output).toContain('Slow operation');
    });

    it('should include details when present', () => {
      const error = HookError.validation('Bad field', { field: 'name', value: 123 });
      const output = error.toStderr();

      expect(output).toContain('Bad field');
      expect(output).toContain('Details:');
      expect(output).toContain('"field": "name"');
      expect(output).toContain('"value": 123');
    });

    it('should not include details when absent', () => {
      const error = HookError.internal('Error');
      const output = error.toStderr();

      expect(output).not.toContain('Details:');
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const error = HookError.validation('Test', { key: 'value' });
      const json = error.toJSON();

      expect(json.name).toBe('HookError');
      expect(json.message).toBe('Test');
      expect(json.category).toBe('validation');
      expect(json.exitCode).toBe(EXIT_CODES.BLOCK);
      expect(json.details).toEqual({ key: 'value' });
      expect(json.stack).toBeDefined();
    });
  });
});

describe('isHookError', () => {
  it('should return true for HookError instances', () => {
    const error = HookError.validation('Test');

    expect(isHookError(error)).toBe(true);
  });

  it('should return false for standard Error', () => {
    const error = new Error('Standard error');

    expect(isHookError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isHookError('string')).toBe(false);
    expect(isHookError(null)).toBe(false);
    expect(isHookError(undefined)).toBe(false);
    expect(isHookError({})).toBe(false);
    expect(isHookError(42)).toBe(false);
  });
});

describe('toHookError', () => {
  it('should return HookError unchanged', () => {
    const original = HookError.validation('Test');
    const converted = toHookError(original);

    expect(converted).toBe(original);
  });

  it('should convert SyntaxError to parse error', () => {
    const syntaxError = new SyntaxError('Unexpected token');
    const hookError = toHookError(syntaxError);

    expect(hookError.category).toBe('parse');
    expect(hookError.exitCode).toBe(EXIT_CODES.BLOCK);
    expect(hookError.message).toContain('JSON parse error');
    expect(hookError.message).toContain('Unexpected token');
  });

  it('should convert standard Error to internal error', () => {
    const error = new Error('Something went wrong');
    const hookError = toHookError(error);

    expect(hookError.category).toBe('internal');
    expect(hookError.exitCode).toBe(EXIT_CODES.ALLOW);
    expect(hookError.message).toBe('Something went wrong');
    expect(hookError.details).toEqual({ originalError: 'Error' });
  });

  it('should convert TypeError with correct details', () => {
    const error = new TypeError('Cannot read property');
    const hookError = toHookError(error);

    expect(hookError.category).toBe('internal');
    expect(hookError.details).toEqual({ originalError: 'TypeError' });
  });

  it('should convert string to internal error', () => {
    const hookError = toHookError('Plain string error');

    expect(hookError.category).toBe('internal');
    expect(hookError.exitCode).toBe(EXIT_CODES.ALLOW);
    expect(hookError.message).toBe('Plain string error');
  });

  it('should convert number to internal error', () => {
    const hookError = toHookError(404);

    expect(hookError.category).toBe('internal');
    expect(hookError.message).toBe('404');
  });

  it('should convert null to internal error', () => {
    const hookError = toHookError(null);

    expect(hookError.category).toBe('internal');
    expect(hookError.message).toBe('null');
  });

  it('should convert object to internal error', () => {
    const hookError = toHookError({ code: 'ERR_UNKNOWN' });

    expect(hookError.category).toBe('internal');
    expect(hookError.message).toBe('[object Object]');
  });
});
