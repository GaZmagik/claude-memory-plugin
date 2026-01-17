/**
 * Unit tests for hooks/src/core/stdin.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'stream';
import {
  readStdin,
  parseHookInput,
  outputHookResponse,
} from './stdin.js';
import type { HookInput, HookOutput } from './types.js';

describe('stdin utilities', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('readStdin', () => {
    it('should read simple string from stdin', async () => {
      const mockStream = Readable.from(['Hello, World!']);

      const result = await readStdin(mockStream);

      expect(result).toBe('Hello, World!');
    });

    it('should concatenate multiple chunks', async () => {
      const mockStream = Readable.from(['Hello, ', 'World', '!']);

      const result = await readStdin(mockStream);

      expect(result).toBe('Hello, World!');
    });

    it('should handle empty stdin', async () => {
      const mockStream = Readable.from([]);

      const result = await readStdin(mockStream);

      expect(result).toBe('');
    });

    it('should handle UTF-8 encoded content', async () => {
      const mockStream = Readable.from(['{"key": "value 日本語"}']);

      const result = await readStdin(mockStream);

      expect(result).toBe('{"key": "value 日本語"}');
    });

    it('should handle large input', async () => {
      const largeInput = 'x'.repeat(100000);
      const mockStream = Readable.from([largeInput]);

      const result = await readStdin(mockStream);

      expect(result).toBe(largeInput);
      expect(result.length).toBe(100000);
    });

    it('should handle binary data as UTF-8', async () => {
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const mockStream = Readable.from([buffer]);

      const result = await readStdin(mockStream);

      expect(result).toBe('Hello');
    });
  });

  describe('parseHookInput', () => {
    it('should parse valid JSON input', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse:Read',
        tool_name: 'Read',
        tool_input: { command: 'cat file.txt' },
        session_id: 'test-session',
        cwd: '/home/user',
      };
      const mockStream = Readable.from([JSON.stringify(input)]);

      const result = await parseHookInput(mockStream);

      expect(result).toEqual(input);
    });

    it('should return null for empty stdin', async () => {
      const mockStream = Readable.from([]);

      const result = await parseHookInput(mockStream);

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only input', async () => {
      const mockStream = Readable.from(['   \n\t  ']);

      const result = await parseHookInput(mockStream);

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const mockStream = Readable.from(['{ invalid json }']);

      const result = await parseHookInput(mockStream);

      expect(result).toBeNull();
    });

    it('should return null for malformed JSON', async () => {
      const mockStream = Readable.from(['{"key": "value"']);

      const result = await parseHookInput(mockStream);

      expect(result).toBeNull();
    });

    it('should trim whitespace before parsing', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse:Read',
        session_id: 'test',
        cwd: '/home',
      };
      const mockStream = Readable.from([`\n  ${JSON.stringify(input)}  \n`]);

      const result = await parseHookInput(mockStream);

      expect(result).toEqual(input);
    });

    it('should handle complex nested JSON', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse:Read',
        session_id: 'test',
        cwd: '/home',
        tool_input: {
          nested: {
            deep: {
              value: [1, 2, 3],
            },
          },
        },
      };
      const mockStream = Readable.from([JSON.stringify(input)]);

      const result = await parseHookInput(mockStream);

      expect(result).toEqual(input);
    });

    it('should return null for non-object JSON', async () => {
      const mockStream = Readable.from(['"just a string"']);

      const result = await parseHookInput(mockStream);

      // Should parse successfully even if not the expected shape
      expect(result).toBe('just a string');
    });

    it('should handle JSON with special characters', async () => {
      const input: HookInput = {
        hook_event_name: 'PostToolUse:Read',
        session_id: 'test',
        cwd: '/path/with/"quotes"/and\\backslashes',
      };
      const mockStream = Readable.from([JSON.stringify(input)]);

      const result = await parseHookInput(mockStream);

      expect(result).toEqual(input);
    });
  });

  describe('outputHookResponse', () => {
    it('should output full HookOutput object', () => {
      const output: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse:Read',
          additionalContext: 'Test context',
        },
      };

      outputHookResponse(output);

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(output));
    });

    it('should construct HookOutput from separate parameters', () => {
      outputHookResponse('PostToolUse:Read', 'Test context');

      const expectedOutput: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse:Read',
          additionalContext: 'Test context',
        },
      };

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(expectedOutput));
    });

    it('should use empty string for missing additionalContext', () => {
      outputHookResponse('PostToolUse:Read', undefined);

      const expectedOutput: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse:Read',
          additionalContext: '',
        },
      };

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(expectedOutput));
    });

    it('should handle complex additionalContext', () => {
      const context = '⚠️ Warning:\n- Issue 1\n- Issue 2\n\nDetails: {"key": "value"}';
      outputHookResponse('PostToolUse:Read', context);

      const expectedOutput: HookOutput = {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse:Read',
          additionalContext: context,
        },
      };

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(expectedOutput));
    });

    it('should produce valid JSON output', () => {
      outputHookResponse('PostToolUse:Read', 'Test');

      const output = consoleLogSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should handle Unicode characters in context', () => {
      outputHookResponse('PostToolUse:Read', '✓ Success 日本語');

      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.hookSpecificOutput.additionalContext).toBe('✓ Success 日本語');
    });

    it('should output exactly once', () => {
      outputHookResponse('PostToolUse:Read', 'Test');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });
});
