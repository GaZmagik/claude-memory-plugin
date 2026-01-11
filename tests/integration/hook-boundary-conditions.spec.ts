/**
 * Hook Boundary Condition Tests
 *
 * Tests edge cases and error handling for hook inputs:
 * - Malformed JSON
 * - Empty stdin
 * - Missing required fields
 * - Invalid data types
 * - Timeout scenarios
 * - Resource limits
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import {
  readStdin,
  parseHookInput,
  outputHookResponse,
} from '../../hooks/src/core/stdin.js';
import {
  HookError,
  toHookError,
  isHookError,
} from '../../hooks/src/core/errors.js';
import {
  isTrivialCommand,
  isValidTopic,
  extractTopicFromResponse,
} from '../../hooks/src/memory/topic-classifier.js';

describe('Hook Boundary Conditions', () => {
  let originalStdin: NodeJS.ReadStream;

  beforeEach(() => {
    originalStdin = process.stdin;
  });

  afterEach(() => {
    process.stdin = originalStdin;
    vi.restoreAllMocks();
  });

  describe('Malformed JSON Input', () => {
    it('should handle completely invalid JSON', async () => {
      const mockStream = Readable.from(['{ this is not json }']);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeNull();
    });

    it('should handle truncated JSON', async () => {
      const mockStream = Readable.from(['{"hookEventName": "test", "sessionId":']);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeNull();
    });

    it('should handle JSON with syntax errors', async () => {
      const malformedInputs = [
        '{"key": "value",}',
        '{"key": "value" "other": "val"}',
        '{key: "value"}',
        '{"key": undefined}',
        "{'key': 'value'}",
      ];

      for (const input of malformedInputs) {
        const mockStream = Readable.from([input]);
        process.stdin = mockStream as unknown as NodeJS.ReadStream;

        const result = await parseHookInput();
        expect(result).toBeNull();
      }
    });

    it('should handle JSON with invalid UTF-8', async () => {
      const buffer = Buffer.from([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x7d]); // Invalid UTF-8
      const mockStream = Readable.from([buffer]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeNull();
    });

    it('should handle extremely nested JSON', async () => {
      let nested = '{"a":';
      for (let i = 0; i < 1000; i++) {
        nested += '{"b":';
      }
      nested += '1';
      for (let i = 0; i < 1001; i++) {
        nested += '}';
      }

      const mockStream = Readable.from([nested]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      // Should either parse or return null, but not crash
      const result = await parseHookInput();
      expect(result !== undefined).toBe(true);
    });
  });

  describe('Empty and Whitespace Input', () => {
    it('should handle completely empty stdin', async () => {
      const mockStream = Readable.from([]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeNull();
    });

    it('should handle whitespace-only input', async () => {
      const whitespaceInputs = ['', '   ', '\n\n\n', '\t\t', '  \n\t  \n  '];

      for (const input of whitespaceInputs) {
        const mockStream = Readable.from([input]);
        process.stdin = mockStream as unknown as NodeJS.ReadStream;

        const result = await parseHookInput();
        expect(result).toBeNull();
      }
    });

    it('should handle null bytes', async () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00]);
      const mockStream = Readable.from([buffer]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await readStdin();
      expect(result).toBe('\x00\x00\x00');
    });
  });

  describe('Missing Required Fields', () => {
    it('should handle missing hook_event_name', async () => {
      const input = { sessionId: 'test', cwd: '/home' };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
      // Should parse but validation happens downstream
    });

    it('should handle missing all fields', async () => {
      const mockStream = Readable.from(['{}']);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toEqual({});
    });

    it('should handle null values in required fields', async () => {
      const input = {
        hook_event_name: null,
        sessionId: null,
        cwd: null,
      };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });
  });

  describe('Invalid Data Types', () => {
    it('should handle numeric hook_event_name', async () => {
      const input = { hook_event_name: 123, sessionId: 'test' };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });

    it('should handle arrays where objects expected', async () => {
      const mockStream = Readable.from(['[1, 2, 3]']);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });

    it('should handle boolean values', async () => {
      const mockStream = Readable.from(['true']);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBe(true);
    });

    it('should handle extremely large numbers', async () => {
      const input = {
        hook_event_name: 'test',
        largeNumber: Number.MAX_SAFE_INTEGER * 2,
      };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });
  });

  describe('Resource Limits', () => {
    it('should handle very large JSON input', async () => {
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB string
      const input = { hook_event_name: 'test', data: largeContent };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });

    it('should handle very long arrays', async () => {
      const longArray = Array.from({ length: 10000 }, (_, i) => i);
      const input = { hook_event_name: 'test', items: longArray };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });

    it('should handle deeply nested objects', async () => {
      let obj: any = { value: 1 };
      for (let i = 0; i < 100; i++) {
        obj = { nested: obj };
      }
      const mockStream = Readable.from([JSON.stringify(obj)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });

    it('should handle many small chunks', async () => {
      const chunks = Array.from({ length: 1000 }, () => 'a');
      const mockStream = Readable.from(chunks);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await readStdin();
      expect(result.length).toBe(1000);
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle Unicode characters', async () => {
      const input = {
        hook_event_name: 'test',
        content: '日本語 🎉 emoji ñ ü € ∑',
      };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'content' in result) {
        expect(result.content).toContain('日本語');
        expect(result.content).toContain('🎉');
      }
    });

    it('should handle escaped characters', async () => {
      const input = {
        hook_event_name: 'test',
        path: 'C:\\Users\\test\\file.txt',
        quote: 'He said "hello"',
        newline: 'Line1\nLine2',
      };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });

    it('should handle control characters', async () => {
      const input = {
        hook_event_name: 'test',
        content: 'Text\x00with\x01control\x02chars',
      };
      const mockStream = Readable.from([JSON.stringify(input)]);
      process.stdin = mockStream as unknown as NodeJS.ReadStream;

      const result = await parseHookInput();
      expect(result).toBeDefined();
    });
  });

  describe('Error Object Handling', () => {
    it('should handle all error types', () => {
      const syntaxError = new SyntaxError('Invalid JSON');
      const hookError = toHookError(syntaxError);

      expect(hookError.category).toBe('parse');
      expect(isHookError(hookError)).toBe(true);
    });

    it('should convert unknown errors gracefully', () => {
      const unknownErrors = [
        'string error',
        42,
        null,
        undefined,
        { code: 'ERR' },
        [1, 2, 3],
      ];

      for (const error of unknownErrors) {
        const hookError = toHookError(error);
        expect(isHookError(hookError)).toBe(true);
        expect(hookError.category).toBe('internal');
      }
    });

    it('should format errors for stderr correctly', () => {
      const error = HookError.validation('Test error', { field: 'name' });
      const output = error.toStderr();

      expect(output).toContain('🚨');
      expect(output).toContain('Test error');
      expect(output).toContain('field');
    });
  });

  describe('Topic Classification Edge Cases', () => {
    it('should handle empty commands', () => {
      expect(isTrivialCommand('')).toBe(false);
      expect(isTrivialCommand('   ')).toBe(false);
    });

    it('should handle malformed commands', () => {
      const malformed = [
        'git\x00status',
        'ls\n\nrm',
        'cd\t\t/tmp',
      ];

      for (const cmd of malformed) {
        expect(() => isTrivialCommand(cmd)).not.toThrow();
      }
    });

    it('should validate topic edge cases', () => {
      expect(isValidTopic('')).toBe(false);
      expect(isValidTopic('ab')).toBe(false); // Too short
      expect(isValidTopic('a'.repeat(16))).toBe(false); // Too long
      expect(isValidTopic('test123')).toBe(false); // Contains numbers
      expect(isValidTopic('test-case')).toBe(false); // Contains dash
      expect(isValidTopic('learning')).toBe(false); // Meta-topic
    });

    it('should extract topics from malformed responses', () => {
      const malformed = [
        'CHECK:',
        'CHECK: ',
        'SKIP',
        'INVALID: topic',
        '',
        'CHECK: 123',
      ];

      for (const response of malformed) {
        const topic = extractTopicFromResponse(response);
        expect(topic).toBeNull();
      }
    });
  });

  describe('Output Edge Cases', () => {
    it('should handle empty output', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      outputHookResponse('', '');

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should handle very long output', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const longContext = 'x'.repeat(100000);
      outputHookResponse('test', longContext);

      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should handle special characters in output', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const specialContext = '🚨 Warning\n- Issue\t1\r\n- Issue 2\x00';
      outputHookResponse('test', specialContext);

      const output = spy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();

      spy.mockRestore();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple stdin reads safely', async () => {
      const results = await Promise.all([
        (async () => {
          const mockStream = Readable.from(['{"test": 1}']);
          process.stdin = mockStream as unknown as NodeJS.ReadStream;
          return parseHookInput();
        })(),
        (async () => {
          const mockStream = Readable.from(['{"test": 2}']);
          process.stdin = mockStream as unknown as NodeJS.ReadStream;
          return parseHookInput();
        })(),
      ]);

      expect(results).toHaveLength(2);
    });
  });

  describe('Memory Pressure', () => {
    it('should not leak memory on repeated operations', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        const error = HookError.internal(`Error ${i}`);
        error.toStderr();
        error.toJSON();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const growth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 10MB)
      expect(growth).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
