/**
 * Tests for session context extraction
 *
 * Tests the JSONL parsing, compaction boundary detection, and content formatting
 * used for extracting conversation context from Claude Code sessions.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { homedir } from 'os';
import { join } from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync, readFileSync } from 'fs';

describe('extract-context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cwdToProjectPath', () => {
    it('should convert cwd to project path format', async () => {
      const { cwdToProjectPath } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      expect(cwdToProjectPath('/home/user/project')).toBe('-home-user-project');
      expect(cwdToProjectPath('/home/gareth/.vs/claude-memory-plugin')).toBe(
        '-home-gareth--vs-claude-memory-plugin'
      );
    });

    it('should handle root path', async () => {
      const { cwdToProjectPath } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      expect(cwdToProjectPath('/')).toBe('-');
    });

    it('should handle paths with multiple dots', async () => {
      const { cwdToProjectPath } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      expect(cwdToProjectPath('/home/user/.config/.local/project')).toBe(
        '-home-user--config--local-project'
      );
    });

    it('should handle paths with consecutive slashes', async () => {
      const { cwdToProjectPath } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      // Consecutive slashes become consecutive dashes
      expect(cwdToProjectPath('/home//user')).toBe('-home--user');
    });

    it('should handle empty string', async () => {
      const { cwdToProjectPath } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      expect(cwdToProjectPath('')).toBe('');
    });
  });

  describe('findSessionJsonl', () => {
    it('should return null if JSONL file not found', async () => {
      const { findSessionJsonl } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      (existsSync as Mock).mockReturnValue(false);

      const result = findSessionJsonl('nonexistent-session', '/fake/path');
      expect(result).toBeNull();
    });

    it('should return path when JSONL file exists', async () => {
      const { findSessionJsonl } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      (existsSync as Mock).mockReturnValue(true);

      const result = findSessionJsonl('test-session-123', '/home/user/project');
      const expectedPath = join(
        homedir(),
        '.claude',
        'projects',
        '-home-user-project',
        'test-session-123.jsonl'
      );

      expect(result).toBe(expectedPath);
      expect(existsSync).toHaveBeenCalledWith(expectedPath);
    });

    it('should construct correct path for dotted directories', async () => {
      const { findSessionJsonl } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      (existsSync as Mock).mockReturnValue(true);

      const result = findSessionJsonl('abc-123', '/home/gareth/.vs/project');
      const expectedPath = join(
        homedir(),
        '.claude',
        'projects',
        '-home-gareth--vs-project',
        'abc-123.jsonl'
      );

      expect(result).toBe(expectedPath);
    });
  });

  describe('extractSessionContext', () => {
    it('should return null if JSONL file not found', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      (existsSync as Mock).mockReturnValue(false);

      const result = extractSessionContext('nonexistent-session', '/fake/path');
      expect(result).toBeNull();
    });

    it('should extract user message content', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = '{"type":"user","message":"Hello, Claude!"}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('user');
      expect(result!.content[0]!.content).toBe('Hello, Claude!');
    });

    it('should extract thinking content', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [{ type: 'thinking', thinking: 'Let me consider this...' }],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('thinking');
      expect(result!.content[0]!.content).toBe('Let me consider this...');
    });

    it('should extract text content', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [{ type: 'text', text: 'Here is my response.' }],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('text');
      expect(result!.content[0]!.content).toBe('Here is my response.');
    });

    it('should extract tool_use content with name', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Read',
              input: { file_path: '/test/file.ts' },
            },
          ],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('tool_use');
      expect(result!.content[0]!.toolName).toBe('Read');
      expect(result!.content[0]!.content).toBe('{"file_path":"/test/file.ts"}');
    });

    it('should extract tool_use with empty input', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [{ type: 'tool_use', name: 'GitStatus' }],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('tool_use');
      expect(result!.content[0]!.content).toBe('{}');
    });

    it('should extract tool_result with string content', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        content: [{ type: 'tool_result', content: 'File contents here' }],
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('tool_result');
      expect(result!.content[0]!.content).toBe('File contents here');
    });

    it('should extract tool_result with object content', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        content: [{ type: 'tool_result', content: { status: 'success', lines: 42 } }],
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('tool_result');
      expect(result!.content[0]!.content).toBe('{"status":"success","lines":42}');
    });

    it('should truncate long tool_result content to 500 chars', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const longContent = 'A'.repeat(1000);
      const jsonlContent = JSON.stringify({
        content: [{ type: 'tool_result', content: longContent }],
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content[0]!.content).toHaveLength(500);
      expect(result!.content[0]!.content).toBe('A'.repeat(500));
    });

    it('should handle tool_result with null content', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        content: [{ type: 'tool_result', content: null }],
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.type).toBe('tool_result');
      expect(result!.content[0]!.content).toBe('""');
    });

    it('should find and respect compaction boundary', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = [
        '{"type":"user","message":"Old message before compaction"}',
        '{"subtype":"compact_boundary"}',
        '{"type":"user","message":"New message after compaction"}',
      ].join('\n') + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.compactionLine).toBe(2); // 1-indexed
      expect(result!.linesExtracted).toBe(1);
      expect(result!.totalLines).toBe(3);
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.content).toBe('New message after compaction');
    });

    it('should extract all lines when no compaction boundary', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = [
        '{"type":"user","message":"First message"}',
        '{"type":"user","message":"Second message"}',
        '{"type":"user","message":"Third message"}',
      ].join('\n') + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.compactionLine).toBe(0);
      expect(result!.linesExtracted).toBe(3);
      expect(result!.totalLines).toBe(3);
      expect(result!.content).toHaveLength(3);
    });

    it('should find last compaction boundary when multiple exist', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = [
        '{"type":"user","message":"Very old"}',
        '{"subtype":"compact_boundary"}',
        '{"type":"user","message":"Old"}',
        '{"subtype":"compact_boundary"}',
        '{"type":"user","message":"Current"}',
      ].join('\n') + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.compactionLine).toBe(4); // Last boundary at index 3 + 1
      expect(result!.linesExtracted).toBe(1);
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.content).toBe('Current');
    });

    it('should skip invalid JSON lines', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = [
        '{"type":"user","message":"Valid"}',
        'invalid json here',
        '{"type":"user","message":"Also valid"}',
      ].join('\n') + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.totalLines).toBe(3);
      expect(result!.content).toHaveLength(2);
    });

    it('should skip empty lines', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = [
        '{"type":"user","message":"First"}',
        '',
        '   ',
        '{"type":"user","message":"Second"}',
      ].join('\n') + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.totalLines).toBe(2); // Only non-empty lines counted
    });

    it('should handle content array at root level', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        content: [{ type: 'text', text: 'Root level content' }],
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.content).toBe('Root level content');
    });

    it('should handle mixed content types in single message', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [
            { type: 'thinking', thinking: 'Thinking first...' },
            { type: 'text', text: 'Then responding.' },
            { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
          ],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(3);
      expect(result!.content[0]!.type).toBe('thinking');
      expect(result!.content[1]!.type).toBe('text');
      expect(result!.content[2]!.type).toBe('tool_use');
    });

    it('should skip content items without required fields', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [
            { type: 'thinking' }, // Missing thinking field
            { type: 'text' }, // Missing text field
            { type: 'tool_use' }, // Missing name field
            { type: 'text', text: 'Valid text' },
          ],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(1);
      expect(result!.content[0]!.content).toBe('Valid text');
    });

    it('should calculate correct byteSize', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = '{"type":"user","message":"Hello"}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test-session', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.byteSize).toBe(Buffer.byteLength(result!.formattedText, 'utf-8'));
    });

    it('should return correct sessionId in result', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = '{"type":"user","message":"Test"}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('my-unique-session-id', '/home/user/project');

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe('my-unique-session-id');
    });
  });

  describe('formatContent (via extractSessionContext)', () => {
    it('should format thinking content with tags', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [{ type: 'thinking', thinking: 'Deep thoughts' }],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test', '/project');

      expect(result!.formattedText).toContain('[THINKING]');
      expect(result!.formattedText).toContain('Deep thoughts');
      expect(result!.formattedText).toContain('[/THINKING]');
    });

    it('should format text content with ASSISTANT tag', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [{ type: 'text', text: 'My response' }],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test', '/project');

      expect(result!.formattedText).toContain('[ASSISTANT]');
      expect(result!.formattedText).toContain('My response');
    });

    it('should format user content with USER tag', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = '{"type":"user","message":"User input"}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test', '/project');

      expect(result!.formattedText).toContain('[USER]');
      expect(result!.formattedText).toContain('User input');
    });

    it('should format tool_use with TOOL tag including name', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        message: {
          content: [{ type: 'tool_use', name: 'Write', input: { path: '/test' } }],
        },
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test', '/project');

      expect(result!.formattedText).toContain('[TOOL: Write]');
      expect(result!.formattedText).toContain('{"path":"/test"}');
    });

    it('should format tool_result with RESULT tag', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = JSON.stringify({
        content: [{ type: 'tool_result', content: 'Operation completed' }],
      }) + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test', '/project');

      expect(result!.formattedText).toContain('[RESULT]');
      expect(result!.formattedText).toContain('Operation completed');
    });
  });

  describe('extractContextAsSystemPrompt', () => {
    it('should return null if no session context', async () => {
      const { extractContextAsSystemPrompt } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      (existsSync as Mock).mockReturnValue(false);

      const result = extractContextAsSystemPrompt('nonexistent', '/fake/path');
      expect(result).toBeNull();
    });

    it('should return null if session context has empty content', async () => {
      const { extractContextAsSystemPrompt } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      // JSON with no extractable content
      const jsonlContent = '{"some":"random","data":true}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractContextAsSystemPrompt('test', '/project');
      expect(result).toBeNull();
    });

    it('should return formatted system prompt with header', async () => {
      const { extractContextAsSystemPrompt } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = '{"type":"user","message":"Test message"}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractContextAsSystemPrompt('test', '/project');

      expect(result).not.toBeNull();
      expect(result).toContain('SESSION CONTEXT');
      expect(result).toContain('1 lines since compaction');
      expect(result).toContain('Test message');
      expect(result).toContain('END SESSION CONTEXT');
    });

    it('should include extraction count in header', async () => {
      const { extractContextAsSystemPrompt } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = [
        '{"type":"user","message":"First"}',
        '{"type":"user","message":"Second"}',
        '{"type":"user","message":"Third"}',
      ].join('\n') + '\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractContextAsSystemPrompt('test', '/project');

      expect(result).toContain('3 lines since compaction');
    });

    it('should include instructions for memory capture', async () => {
      const { extractContextAsSystemPrompt } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = '{"type":"user","message":"Test"}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractContextAsSystemPrompt('test', '/project');

      expect(result).toContain('memories worth capturing');
      expect(result).toContain('decisions');
      expect(result).toContain('learnings');
      expect(result).toContain('gotchas');
      expect(result).toContain('artifacts');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue('');

      const result = extractSessionContext('test', '/project');

      expect(result).not.toBeNull();
      expect(result!.totalLines).toBe(0);
      expect(result!.content).toHaveLength(0);
    });

    it('should handle file with only whitespace', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue('   \n\n   \n');

      const result = extractSessionContext('test', '/project');

      expect(result).not.toBeNull();
      expect(result!.totalLines).toBe(0);
      expect(result!.content).toHaveLength(0);
    });

    it('should handle object without content or message fields', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const jsonlContent = '{"type":"system","data":"some system event"}\n';

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test', '/project');

      expect(result).not.toBeNull();
      expect(result!.content).toHaveLength(0);
    });

    it('should handle Unicode content correctly', async () => {
      const { extractSessionContext } = await import(
        '../../../hooks/src/session/extract-context.ts'
      );

      const unicodeMessage = 'Hello! \u{1F600} \u4F60\u597D \u3053\u3093\u306B\u3061\u306F';
      const jsonlContent = `{"type":"user","message":"${unicodeMessage}"}\n`;

      (existsSync as Mock).mockReturnValue(true);
      (readFileSync as Mock).mockReturnValue(jsonlContent);

      const result = extractSessionContext('test', '/project');

      expect(result).not.toBeNull();
      expect(result!.content[0]!.content).toBe(unicodeMessage);
      // byteSize should account for multi-byte characters
      expect(result!.byteSize).toBeGreaterThan(result!.formattedText.length);
    });
  });
});
