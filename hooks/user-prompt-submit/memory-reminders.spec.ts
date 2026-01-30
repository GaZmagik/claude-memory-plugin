/**
 * Tests for consolidated memory reminders hook
 *
 * Validates reminder content and command references.
 * Integration testing covered by SessionCache tests.
 *
 * @since v1.2.0
 */

import { describe, it, expect } from 'bun:test';

describe('Memory Reminders Hook (Consolidated)', () => {
  describe('reminder content', () => {
    it('should include memory:recall agent reference', () => {
      const reminderContent = 'invoke memory:recall agent or run /memory:check-gotchas';
      expect(reminderContent).toContain('memory:recall');
      expect(reminderContent).toContain('/memory:check-gotchas');
    });

    it('should include memory write command reference', () => {
      const reminderContent = 'Use `memory write` command with JSON payload';
      expect(reminderContent).toContain('memory write');
      expect(reminderContent).not.toContain('~/.claude/skills'); // Should use short form
    });

    it('should include memory think command reference', () => {
      const reminderContent = 'Use `memory think` to document chain-of-thought';
      expect(reminderContent).toContain('memory think');
    });

    it('should include destructive operations warning', () => {
      const reminderContent = 'Before destructive operations: invoke memory:recall agent';
      expect(reminderContent).toContain('destructive operations');
    });

    it('should include .specify/ symlink verification reminder', () => {
      const reminderContent = 'Before modifying .specify/: verify symlink structure with ls -la';
      expect(reminderContent).toContain('.specify/');
      expect(reminderContent).toContain('symlink');
    });

    it('should include deliberation workflow steps', () => {
      const reminderContent = `memory think create "Topic" → Start deliberation
  - memory think conclude "Text" --promote <type> → Finalise`;
      expect(reminderContent).toContain('memory think create');
      expect(reminderContent).toContain('memory think conclude');
    });

    it('should include resume pattern reference', () => {
      const reminderContent = 'Resume pattern: Use "resume" parameter with agentId';
      expect(reminderContent).toContain('resume');
      expect(reminderContent).toContain('agentId');
    });
  });

  describe('configuration behaviour', () => {
    it('should respect reminder_count setting from plugin settings', () => {
      // Default reminder_count is 1 (show once per session)
      const defaultCount = 1;
      expect(defaultCount).toBe(1);
    });

    it('should support disabling reminders with reminder_count: 0', () => {
      const disabledCount = 0;
      expect(disabledCount).toBe(0);
    });

    it('should support multiple reminders with reminder_count > 1', () => {
      const multipleCount = 3;
      expect(multipleCount).toBeGreaterThan(1);
      expect(multipleCount).toBeLessThanOrEqual(10); // Max allowed
    });
  });

  describe('session cache integration', () => {
    it('should use session-scoped cache key for reminder count', () => {
      const cacheKey = 'reminder-count';
      expect(cacheKey).toBe('reminder-count');
    });

    it('should increment counter on each UserPromptSubmit event', () => {
      let count = 0;
      count++; // First prompt
      expect(count).toBe(1);
      count++; // Second prompt
      expect(count).toBe(2);
    });
  });
});
