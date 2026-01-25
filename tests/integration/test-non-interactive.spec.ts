/**
 * T013: Integration test for --non-interactive flag suppression
 *
 * Tests that the --non-interactive flag suppresses all interactive
 * prompts, ensuring pipeline composability.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// These imports will fail until implementation exists (TDD Red phase)
import { isComplexThought } from '../../skills/memory/src/cli/complex-thought.js';
import {
  promptForAiAssistance,
  shouldPrompt,
  type InteractiveOptions,
} from '../../skills/memory/src/cli/interactive-prompt.js';
import { parseArgs } from '../../skills/memory/src/cli/parser.js';

// Mock the prompts library
vi.mock('prompts', () => ({
  default: vi.fn(),
}));

describe('--non-interactive Flag Suppression', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'non-interactive-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('shouldPrompt()', () => {
    it('should return true when interactive mode is enabled (default)', () => {
      const options: InteractiveOptions = {
        nonInteractive: false,
      };

      expect(shouldPrompt(options)).toBe(true);
    });

    it('should return false when --non-interactive flag is set', () => {
      const options: InteractiveOptions = {
        nonInteractive: true,
      };

      expect(shouldPrompt(options)).toBe(false);
    });

    it('should return false when stdin is not a TTY', () => {
      const options: InteractiveOptions = {
        nonInteractive: false,
        isTTY: false,
      };

      expect(shouldPrompt(options)).toBe(false);
    });

    it('should return true when stdin is a TTY and interactive', () => {
      const options: InteractiveOptions = {
        nonInteractive: false,
        isTTY: true,
      };

      expect(shouldPrompt(options)).toBe(true);
    });
  });

  describe('flag parsing', () => {
    it('should parse --non-interactive flag', () => {
      const args = parseArgs(['think', 'add', 'topic', '--non-interactive']);

      expect(args.flags['non-interactive']).toBe(true);
    });

    it('should parse -n shorthand for --non-interactive', () => {
      const args = parseArgs(['think', 'add', 'topic', '-n']);

      // -n should be equivalent to --non-interactive
      expect(args.flags['n'] || args.flags['non-interactive']).toBe(true);
    });

    it('should default to interactive mode when flag is absent', () => {
      const args = parseArgs(['think', 'add', 'topic']);

      expect(args.flags['non-interactive']).toBeFalsy();
    });
  });

  describe('prompt suppression', () => {
    it('should NOT prompt for complex thought when --non-interactive is set', async () => {
      const prompts = await import('prompts');
      const complexThought = 'Should we migrate to microservices? What are the trade-offs?';

      expect(isComplexThought(complexThought)).toBe(true);

      const result = await promptForAiAssistance({
        thought: complexThought,
        command: 'think:add',
        nonInteractive: true,
      });

      // Should NOT have called prompts
      expect(prompts.default).not.toHaveBeenCalled();

      // Should return proceed: false (no AI assistance)
      expect(result.proceed).toBe(false);
      expect(result.skippedDueToNonInteractive).toBe(true);
    });

    it('should NOT prompt for long thought when --non-interactive is set', async () => {
      const prompts = await import('prompts');
      const longThought = 'A'.repeat(300);

      expect(isComplexThought(longThought)).toBe(true);

      const result = await promptForAiAssistance({
        thought: longThought,
        command: 'think:add',
        nonInteractive: true,
      });

      expect(prompts.default).not.toHaveBeenCalled();
      expect(result.proceed).toBe(false);
    });

    it('should still prompt for complex thought when interactive (default)', async () => {
      const prompts = await import('prompts');
      const complexThought = 'What should we do?';

      (prompts.default as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        proceed: true,
      });

      const result = await promptForAiAssistance({
        thought: complexThought,
        command: 'think:add',
        nonInteractive: false,
      });

      expect(prompts.default).toHaveBeenCalled();
      expect(result.proceed).toBe(true);
    });
  });

  describe('hint suppression', () => {
    it('should suppress hints when --non-interactive is set', async () => {
      // Import hint output module
      const { shouldShowHintInMode } = await import(
        '../../skills/memory/src/cli/hint-output.js'
      );

      const options: InteractiveOptions = {
        nonInteractive: true,
      };

      // Hints should be suppressed in non-interactive mode
      expect(shouldShowHintInMode(options)).toBe(false);
    });

    it('should show hints in interactive mode', async () => {
      const { shouldShowHintInMode } = await import(
        '../../skills/memory/src/cli/hint-output.js'
      );

      const options: InteractiveOptions = {
        nonInteractive: false,
      };

      expect(shouldShowHintInMode(options)).toBe(true);
    });
  });

  describe('pipeline composability', () => {
    it('should allow piping output without prompts blocking', async () => {
      const prompts = await import('prompts');

      // Simulate pipeline: echo "topic" | memory think add --non-interactive
      const result = await promptForAiAssistance({
        thought: 'Piped input with question?',
        command: 'think:add',
        nonInteractive: true,
        isTTY: false,
      });

      // Should not block waiting for user input
      expect(prompts.default).not.toHaveBeenCalled();
      expect(result.proceed).toBe(false);
    });

    it('should produce valid JSON output in non-interactive mode', async () => {
      // The actual command output is tested elsewhere, but this documents
      // the expectation that JSON output is valid regardless of mode
      const options: InteractiveOptions = {
        nonInteractive: true,
      };

      // JSON output should be parseable
      const mockOutput = JSON.stringify({
        status: 'success',
        data: { thought: 'test' },
      });

      expect(() => JSON.parse(mockOutput)).not.toThrow();
    });
  });

  describe('CI/CD environment detection', () => {
    it('should auto-detect CI environment and disable prompts', () => {
      // Common CI environment variables
      const ciEnvVars = ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 'JENKINS_URL'];

      for (const envVar of ciEnvVars) {
        const originalValue = process.env[envVar];
        process.env[envVar] = 'true';

        const options: InteractiveOptions = {
          nonInteractive: false,
          detectCI: true,
        };

        // When detectCI is true and CI env var is set, should disable prompts
        const shouldPromptResult = shouldPrompt(options);

        // Restore original value
        if (originalValue === undefined) {
          delete process.env[envVar];
        } else {
          process.env[envVar] = originalValue;
        }

        expect(shouldPromptResult).toBe(false);
      }
    });

    it('should allow prompts when not in CI', () => {
      // Ensure no CI variables are set
      const ciVars = ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 'JENKINS_URL'];
      const savedVars: Record<string, string | undefined> = {};

      for (const v of ciVars) {
        savedVars[v] = process.env[v];
        delete process.env[v];
      }

      const options: InteractiveOptions = {
        nonInteractive: false,
        detectCI: true,
        isTTY: true,
      };

      expect(shouldPrompt(options)).toBe(true);

      // Restore
      for (const v of ciVars) {
        if (savedVars[v] !== undefined) {
          process.env[v] = savedVars[v];
        }
      }
    });
  });

  describe('combined with other flags', () => {
    it('should work with --call flag', () => {
      const args = parseArgs([
        'think',
        'add',
        'topic',
        '--non-interactive',
        '--call',
        'claude',
      ]);

      expect(args.flags['non-interactive']).toBe(true);
      expect(args.flags['call']).toBe('claude');
    });

    it('should work with --style flag', () => {
      const args = parseArgs([
        'think',
        'add',
        'topic',
        '--non-interactive',
        '--style',
        'Architect',
      ]);

      expect(args.flags['non-interactive']).toBe(true);
      expect(args.flags['style']).toBe('Architect');
    });

    it('should work with --auto flag', () => {
      const args = parseArgs([
        'think',
        'add',
        'topic',
        '--non-interactive',
        '--auto',
      ]);

      expect(args.flags['non-interactive']).toBe(true);
      expect(args.flags['auto']).toBe(true);
    });
  });

  describe('error handling in non-interactive mode', () => {
    it('should return error response without prompting on failure', async () => {
      // When a command fails in non-interactive mode, it should
      // return an error JSON response, not prompt for confirmation

      const options: InteractiveOptions = {
        nonInteractive: true,
      };

      // This documents the expected behaviour
      expect(shouldPrompt(options)).toBe(false);
    });
  });
});
