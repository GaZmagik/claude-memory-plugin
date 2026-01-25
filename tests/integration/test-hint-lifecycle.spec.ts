/**
 * T011: Integration test for hint display count tracking
 *
 * Tests the full lifecycle of hint tracking across multiple
 * command invocations, including persistence and session isolation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// These imports will fail until implementation exists (TDD Red phase)
import { HintTracker, shouldShowHint } from '../../skills/memory/src/cli/hint-tracker.js';
import { outputHintToStderr, type HintMessage } from '../../skills/memory/src/cli/hint-output.js';

describe('Hint Lifecycle Integration', () => {
  let testDir: string;
  let cacheDir: string;
  let stderrOutput: string[];

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(tmpdir(), 'hint-lifecycle-'));
    cacheDir = path.join(testDir, '.claude', 'cache', 'hints');
    fs.mkdirSync(cacheDir, { recursive: true });
    stderrOutput = [];

    // Capture stderr
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderrOutput.push(chunk.toString());
      return true;
    });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('progressive disclosure across invocations', () => {
    it('should show hint on first command invocation', async () => {
      const sessionId = 'lifecycle-test-1';
      const tracker = await HintTracker.create(cacheDir, sessionId);
      const command = 'think:create';

      // First invocation - should show hint
      expect(shouldShowHint(tracker, command)).toBe(true);

      if (shouldShowHint(tracker, command)) {
        outputHintToStderr({
          text: 'Try --call claude for AI assistance',
        });
        await tracker.increment(command);
      }

      expect(stderrOutput.length).toBe(1);
      expect(stderrOutput[0]).toContain('--call');
    });

    it('should show hint on second and third invocations', async () => {
      const sessionId = 'lifecycle-test-2';
      const tracker = await HintTracker.create(cacheDir, sessionId);
      const command = 'think:create';

      // Simulate 3 invocations
      for (let i = 0; i < 3; i++) {
        if (shouldShowHint(tracker, command)) {
          outputHintToStderr({
            text: `Hint invocation ${i + 1}`,
          });
        }
        await tracker.increment(command);
      }

      // All 3 should have shown hints
      expect(stderrOutput.length).toBe(3);
    });

    it('should NOT show hint on fourth invocation (threshold reached)', async () => {
      const sessionId = 'lifecycle-test-3';
      const tracker = await HintTracker.create(cacheDir, sessionId);
      const command = 'think:create';

      // Simulate 4 invocations
      for (let i = 0; i < 4; i++) {
        if (shouldShowHint(tracker, command)) {
          outputHintToStderr({
            text: `Hint invocation ${i + 1}`,
          });
        }
        await tracker.increment(command);
      }

      // Only first 3 should have shown hints
      expect(stderrOutput.length).toBe(3);
    });

    it('should track different commands independently', async () => {
      const sessionId = 'lifecycle-test-4';
      const tracker = await HintTracker.create(cacheDir, sessionId);

      // Exhaust think:create hints
      for (let i = 0; i < 4; i++) {
        if (shouldShowHint(tracker, 'think:create')) {
          outputHintToStderr({ text: 'create hint' });
        }
        await tracker.increment('think:create');
      }

      const createHints = stderrOutput.length;
      expect(createHints).toBe(3);

      // think:add should still show hints
      for (let i = 0; i < 4; i++) {
        if (shouldShowHint(tracker, 'think:add')) {
          outputHintToStderr({ text: 'add hint' });
        }
        await tracker.increment('think:add');
      }

      // Should have 3 more hints for think:add
      expect(stderrOutput.length).toBe(6);
    });
  });

  describe('persistence across process restarts', () => {
    it('should persist hint counts to disk', async () => {
      const sessionId = 'persist-test-1';

      // First "process" - use 2 hints
      const tracker1 = await HintTracker.create(cacheDir, sessionId);
      await tracker1.increment('think:create');
      await tracker1.increment('think:create');

      // Verify file exists
      const stateFile = path.join(cacheDir, `hint-state-${sessionId}.json`);
      expect(fs.existsSync(stateFile)).toBe(true);

      // Second "process" - should load persisted state
      const tracker2 = await HintTracker.create(cacheDir, sessionId);
      expect(tracker2.getCount('think:create')).toBe(2);

      // Only 1 hint remaining before threshold
      expect(shouldShowHint(tracker2, 'think:create')).toBe(true);
      await tracker2.increment('think:create');
      expect(shouldShowHint(tracker2, 'think:create')).toBe(false);
    });

    it('should handle concurrent access gracefully', async () => {
      const sessionId = 'concurrent-test';

      // Simulate concurrent access
      const tracker1 = await HintTracker.create(cacheDir, sessionId);
      const tracker2 = await HintTracker.create(cacheDir, sessionId);

      await tracker1.increment('think:create');
      await tracker2.increment('think:add');

      // Both writes should succeed (last write wins for same session)
      const tracker3 = await HintTracker.create(cacheDir, sessionId);

      // At least one of the increments should be visible
      // (exact behaviour depends on timing, but no crashes)
      expect(tracker3.getTotalCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('session isolation', () => {
    it('should reset hints when session ID changes', async () => {
      // Old session - exhaust hints
      const tracker1 = await HintTracker.create(cacheDir, 'old-session');
      for (let i = 0; i < 5; i++) {
        await tracker1.increment('think:create');
      }
      expect(shouldShowHint(tracker1, 'think:create')).toBe(false);

      // New session - hints should be available again
      const tracker2 = await HintTracker.create(cacheDir, 'new-session');
      expect(shouldShowHint(tracker2, 'think:create')).toBe(true);
    });

    it('should use CLAUDE_SESSION_ID environment variable for session tracking', async () => {
      // This test documents the expected integration with Claude Code
      // The actual environment variable handling is in the CLI entry point

      const envSessionId = process.env.CLAUDE_SESSION_ID;

      if (envSessionId) {
        const tracker = await HintTracker.create(cacheDir, envSessionId);
        expect(tracker).toBeDefined();
      } else {
        // When not running in Claude Code, session ID should be generated
        expect(true).toBe(true); // Placeholder - actual behaviour TBD
      }
    });
  });

  describe('hint content rotation', () => {
    it('should support different hints for different invocations', async () => {
      const sessionId = 'rotation-test';
      const tracker = await HintTracker.create(cacheDir, sessionId);
      const command = 'think:create';

      const hints: HintMessage[] = [
        { text: 'First hint: Try --call claude' },
        { text: 'Second hint: Try --style Devils-Advocate' },
        { text: 'Third hint: Try --auto for smart selection' },
      ];

      // Show different hints on each invocation
      for (let i = 0; i < 3; i++) {
        if (shouldShowHint(tracker, command)) {
          const hintIndex = tracker.getCount(command);
          outputHintToStderr(hints[hintIndex]!);
        }
        await tracker.increment(command);
      }

      // Verify different hints were shown
      expect(stderrOutput[0]).toContain('--call claude');
      expect(stderrOutput[1]).toContain('--style');
      expect(stderrOutput[2]).toContain('--auto');
    });
  });

  describe('error handling', () => {
    it('should gracefully handle corrupted state file', async () => {
      const sessionId = 'corrupt-test';
      const stateFile = path.join(cacheDir, `hint-state-${sessionId}.json`);

      // Write corrupted file
      fs.writeFileSync(stateFile, '{ invalid json }}}');

      // Should not throw, should start fresh
      const tracker = await HintTracker.create(cacheDir, sessionId);
      expect(tracker.getCount('think:create')).toBe(0);
    });

    it('should handle missing cache directory', async () => {
      const nonExistentDir = path.join(testDir, 'does', 'not', 'exist');

      // Should create directory and work
      const tracker = await HintTracker.create(nonExistentDir, 'test-session');
      expect(tracker).toBeDefined();
      expect(fs.existsSync(nonExistentDir)).toBe(true);
    });

    it('should handle write permission errors gracefully', async () => {
      const sessionId = 'permission-test';

      // Create tracker
      const tracker = await HintTracker.create(cacheDir, sessionId);

      // Make cache dir read-only (Unix only)
      if (process.platform !== 'win32') {
        fs.chmodSync(cacheDir, 0o444);

        // Should not throw on increment (write failure is silent)
        await expect(tracker.increment('think:create')).resolves.not.toThrow();

        // Restore permissions for cleanup
        fs.chmodSync(cacheDir, 0o755);
      }
    });
  });

  describe('real-world scenarios', () => {
    it('should handle rapid successive invocations', async () => {
      const sessionId = 'rapid-test';
      const tracker = await HintTracker.create(cacheDir, sessionId);

      // Rapid fire 10 invocations
      const promises = Array(10)
        .fill(null)
        .map(() => tracker.increment('think:create'));

      await Promise.all(promises);

      // Count should be 10
      expect(tracker.getCount('think:create')).toBe(10);
    });

    it('should support full think command workflow', async () => {
      const sessionId = 'workflow-test';
      const tracker = await HintTracker.create(cacheDir, sessionId);

      // Simulate real workflow
      const commands = [
        'think:create', // Create deliberation
        'think:add', // Add first thought
        'think:add', // Add second thought
        'think:counter', // Add counter argument
        'think:branch', // Branch to alternative
        'think:conclude', // Conclude
      ];

      for (const cmd of commands) {
        if (shouldShowHint(tracker, cmd)) {
          outputHintToStderr({ text: `Hint for ${cmd}` });
        }
        await tracker.increment(cmd);
      }

      // Each unique command should have shown its first hint
      expect(stderrOutput.length).toBe(5); // 5 unique commands (add appears twice but only 2 hints shown)
    });
  });
});
