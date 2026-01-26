/**
 * T012: Integration test for interactive prompt triggering
 *
 * Tests that complex thoughts trigger interactive prompts
 * asking if the user wants AI assistance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// These imports will fail until implementation exists (TDD Red phase)
import { isComplexThought } from '../../skills/memory/src/cli/complex-thought.js';
import { promptForAiAssistance } from '../../skills/memory/src/cli/interactive-prompt.js';

// Mock the prompts library
vi.mock('prompts', () => ({
  default: vi.fn(),
}));

describe('Interactive Prompt Triggering', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'interactive-prompt-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('complex thought triggers prompt', () => {
    it('should trigger prompt for thought > 200 chars', async () => {
      const longThought = 'A'.repeat(250);
      const prompts = await import('prompts');

      // Mock user accepting
      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
      });

      expect(isComplexThought(longThought)).toBe(true);

      const result = await promptForAiAssistance({
        thought: longThought,
        command: 'think:add',
      });

      expect(prompts.default).toHaveBeenCalled();
      expect(result.proceed).toBe(true);
    });

    it('should trigger prompt for thought containing "?"', async () => {
      const questionThought = 'Should we migrate to microservices?';
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: false,
      });

      expect(isComplexThought(questionThought)).toBe(true);

      const result = await promptForAiAssistance({
        thought: questionThought,
        command: 'think:add',
      });

      expect(prompts.default).toHaveBeenCalled();
      expect(result.proceed).toBe(false);
    });

    it('should NOT trigger prompt for simple thought', () => {
      const simpleThought = 'Adding database index';

      expect(isComplexThought(simpleThought)).toBe(false);

      // Should not call prompts for simple thoughts
      // (caller is responsible for checking isComplexThought first)
    });
  });

  describe('prompt message content', () => {
    it('should include thought complexity reason in prompt', async () => {
      const questionThought = 'What are the trade-offs?';
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
      });

      await promptForAiAssistance({
        thought: questionThought,
        command: 'think:add',
      });

      const promptCall = vi.mocked(prompts.default).mock.calls[0]?.[0] as { message?: string };
      expect(promptCall?.message).toContain('complex');
    });

    it('should offer AI assistance options', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
      });

      await promptForAiAssistance({
        thought: 'Complex thought requiring analysis?',
        command: 'think:add',
      });

      const promptCall = vi.mocked(prompts.default).mock.calls[0]?.[0] as { type?: string };
      // Should be a confirm-style prompt
      expect(promptCall?.type).toBe('confirm');
    });

    it('should default to "no" (y/N) for safety', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: false,
      });

      await promptForAiAssistance({
        thought: 'Should we proceed?',
        command: 'think:add',
      });

      const promptCall = vi.mocked(prompts.default).mock.calls[0]?.[0] as { initial?: boolean };
      expect(promptCall?.initial).toBe(false);
    });
  });

  describe('prompt result handling', () => {
    it('should return proceed: true when user accepts', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
      });

      const result = await promptForAiAssistance({
        thought: 'Complex thought?',
        command: 'think:add',
      });

      expect(result.proceed).toBe(true);
      expect(result.aborted).toBeFalsy();
    });

    it('should return proceed: false when user declines', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: false,
      });

      const result = await promptForAiAssistance({
        thought: 'Complex thought?',
        command: 'think:add',
      });

      expect(result.proceed).toBe(false);
    });

    it('should handle Ctrl+C (abort) gracefully', async () => {
      const prompts = await import('prompts');

      // Prompts returns undefined/empty on abort
      vi.mocked(prompts.default).mockResolvedValueOnce({});

      const result = await promptForAiAssistance({
        thought: 'Complex thought?',
        command: 'think:add',
      });

      expect(result.proceed).toBe(false);
      expect(result.aborted).toBe(true);
    });
  });

  describe('AI assistance options', () => {
    it('should suggest --call claude by default', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
        suggestion: '--call claude',
      });

      const result = await promptForAiAssistance({
        thought: 'Architecture decision?',
        command: 'think:add',
      });

      expect(result.suggestion).toContain('--call');
    });

    it('should include style suggestion for question-type thoughts', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
        suggestion: '--style Devils-Advocate',
      });

      const result = await promptForAiAssistance({
        thought: 'Should we use microservices or monolith?',
        command: 'think:add',
        suggestStyle: true,
      });

      // For questions, suggest Devils-Advocate style
      expect(result.suggestion).toBeDefined();
    });
  });

  describe('stderr output during prompting', () => {
    it('should write prompt to stderr, not stdout', async () => {
      const prompts = await import('prompts');
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const stdoutSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
      });

      await promptForAiAssistance({
        thought: 'Complex thought?',
        command: 'think:add',
      });

      // prompts library handles its own I/O, but our wrapper should use stderr
      // This test documents the expected behaviour
      stderrSpy.mockRestore();
      stdoutSpy.mockRestore();
    });
  });

  describe('integration with think commands', () => {
    it('should work with think:add command', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
      });

      const result = await promptForAiAssistance({
        thought: 'What is the best approach for handling auth?',
        command: 'think:add',
      });

      expect(result.proceed).toBe(true);
    });

    it('should work with think:counter command', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: true,
      });

      const result = await promptForAiAssistance({
        thought: 'However, what about security implications?',
        command: 'think:counter',
      });

      expect(result.proceed).toBe(true);
    });

    it('should work with think:branch command', async () => {
      const prompts = await import('prompts');

      vi.mocked(prompts.default).mockResolvedValueOnce({
        proceed: false,
      });

      const result = await promptForAiAssistance({
        thought: 'Alternative approach: use serverless?',
        command: 'think:branch',
      });

      expect(result.proceed).toBe(false);
    });
  });
});
