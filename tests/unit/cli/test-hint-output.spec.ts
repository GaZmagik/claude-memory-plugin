/**
 * T010: Unit test for stderr hint output formatting
 *
 * Tests that hints are output to stderr (not stdout)
 * while JSON responses go to stdout. This ensures
 * hints are visible to users without polluting
 * machine-parseable JSON output.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';

// These imports will fail until implementation exists (TDD Red phase)
import {
  outputHintToStderr,
  formatHint,
  type HintMessage,
  HINT_PREFIX,
} from '../../../skills/memory/src/cli/hint-output.js';

describe('Hint Output Formatting', () => {
  let stderrSpy: MockInstance;
  let stdoutSpy: MockInstance;

  beforeEach(() => {
    // Spy on stderr and stdout
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HINT_PREFIX', () => {
    it('should be a visible prefix for hint messages', () => {
      // Should be something like "💡 Hint: " or "Hint: "
      expect(HINT_PREFIX).toBeDefined();
      expect(typeof HINT_PREFIX).toBe('string');
      expect(HINT_PREFIX.length).toBeGreaterThan(0);
    });
  });

  describe('formatHint()', () => {
    it('should format a simple hint message', () => {
      const hint: HintMessage = {
        text: 'Try using --call claude for AI assistance',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('--call claude');
      expect(formatted).toContain(HINT_PREFIX);
    });

    it('should include example if provided', () => {
      const hint: HintMessage = {
        text: 'Try using --call claude for AI assistance',
        example: 'memory think add "Topic" --call claude',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('--call claude');
      expect(formatted).toContain('memory think add');
    });

    it('should handle multi-line hints', () => {
      const hint: HintMessage = {
        text: 'You can use AI to help with complex thoughts.\nTry --call claude for assistance.',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('AI');
      expect(formatted).toContain('--call claude');
    });

    it('should end with newline for clean output', () => {
      const hint: HintMessage = {
        text: 'Simple hint',
      };

      const formatted = formatHint(hint);

      expect(formatted.endsWith('\n')).toBe(true);
    });
  });

  describe('outputHintToStderr()', () => {
    it('should write hint to stderr, not stdout', () => {
      const hint: HintMessage = {
        text: 'Test hint message',
      };

      outputHintToStderr(hint);

      // Should write to stderr
      expect(stderrSpy).toHaveBeenCalled();

      // Should NOT write to stdout
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should format hint before writing', () => {
      const hint: HintMessage = {
        text: 'Formatted hint test',
      };

      outputHintToStderr(hint);

      // The written content should include the prefix
      const writtenContent = stderrSpy.mock.calls[0]?.[0] as string;
      expect(writtenContent).toContain(HINT_PREFIX);
      expect(writtenContent).toContain('Formatted hint test');
    });

    it('should handle empty hint text gracefully', () => {
      const hint: HintMessage = {
        text: '',
      };

      // Should not throw
      expect(() => outputHintToStderr(hint)).not.toThrow();

      // Should still write something (even if just prefix + newline)
      expect(stderrSpy).toHaveBeenCalled();
    });
  });

  describe('stderr vs stdout separation', () => {
    it('should keep JSON output separate from hints', async () => {
      // Import the response module to test integration
      const { outputResponse, success } = await import(
        '../../../skills/memory/src/cli/response.js'
      );

      // Restore stdout spy for actual console.log
      stdoutSpy.mockRestore();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Output a hint to stderr
      const hint: HintMessage = { text: 'This is a hint' };
      outputHintToStderr(hint);

      // Output JSON response to stdout
      outputResponse(success({ result: 'data' }));

      // Hint should be in stderr
      expect(stderrSpy).toHaveBeenCalled();
      const stderrContent = stderrSpy.mock.calls[0]?.[0] as string;
      expect(stderrContent).toContain('hint');

      // JSON should be in stdout (via console.log)
      expect(consoleSpy).toHaveBeenCalled();
      const stdoutContent = consoleSpy.mock.calls[0]?.[0] as string;
      expect(stdoutContent).toContain('"status"');
      expect(stdoutContent).toContain('"success"');

      consoleSpy.mockRestore();
    });
  });

  describe('hint message types', () => {
    it('should support call hint type', () => {
      const hint: HintMessage = {
        type: 'call',
        text: 'Use --call claude to get AI assistance with this thought',
        example: 'memory think add "Should we refactor?" --call claude',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('--call');
    });

    it('should support style hint type', () => {
      const hint: HintMessage = {
        type: 'style',
        text: 'Try --style Devils-Advocate for alternative perspectives',
        example: 'memory think add "Approach A" --style Devils-Advocate',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('--style');
    });

    it('should support agent hint type', () => {
      const hint: HintMessage = {
        type: 'agent',
        text: 'Use --agent security-expert for security-focused analysis',
        example: 'memory think add "Auth flow" --agent security-expert',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('--agent');
    });

    it('should support auto hint type', () => {
      const hint: HintMessage = {
        type: 'auto',
        text: 'Try --auto to let AI select the best style for your thought',
        example: 'memory think add "Complex decision" --auto',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('--auto');
    });
  });

  describe('formatting styles', () => {
    it('should use consistent formatting across hint types', () => {
      const hints: HintMessage[] = [
        { type: 'call', text: 'Call hint' },
        { type: 'style', text: 'Style hint' },
        { type: 'agent', text: 'Agent hint' },
      ];

      const formatted = hints.map(formatHint);

      // All should start with the same prefix
      for (const f of formatted) {
        expect((f as string).startsWith(HINT_PREFIX)).toBe(true);
      }

      // All should end with newline
      for (const f of formatted) {
        expect((f as string).endsWith('\n')).toBe(true);
      }
    });

    it('should escape special characters in hint text', () => {
      const hint: HintMessage = {
        text: 'Use "quotes" and <brackets> safely',
      };

      const formatted = formatHint(hint);

      // Should not break the output
      expect(formatted).toContain('quotes');
      expect(formatted).toContain('brackets');
    });
  });

  describe('colour support (optional)', () => {
    it('should support disabling colours for non-TTY output', () => {
      const hint: HintMessage = {
        text: 'Colourful hint',
      };

      // When colours are disabled, output should be plain text
      const formatted = formatHint(hint, { useColours: false });

      // Should not contain ANSI escape codes
      expect(formatted).not.toMatch(/\x1b\[/);
    });

    it('should detect TTY and enable colours by default', () => {
      const hint: HintMessage = {
        text: 'Auto-colour hint',
      };

      // formatHint should check process.stderr.isTTY
      // This test documents the expected behaviour
      const formatted = formatHint(hint);

      // Result depends on TTY status - just verify it works
      expect(formatted).toContain('Auto-colour hint');
    });
  });

  describe('internationalisation', () => {
    it('should handle UTF-8 characters in hints', () => {
      const hint: HintMessage = {
        text: '💡 Try using émojis and spëcial çharacters',
      };

      const formatted = formatHint(hint);

      expect(formatted).toContain('émojis');
      expect(formatted).toContain('spëcial');
    });
  });
});
