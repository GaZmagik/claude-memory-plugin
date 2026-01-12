/**
 * Tests for UserPromptSubmit Memory Skill Reminder Hook
 *
 * Provides constant reminders to use the memory skill.
 */

import { describe, it, expect } from 'bun:test';

describe('Memory Skill Reminder Hook', () => {
  describe('command references', () => {
    it('should use namespaced command /memory:check-gotchas', () => {
      // The reminder text should reference the namespaced command
      const expectedPattern = /\/memory:check-gotchas/;
      const correctText = 'run /memory:check-gotchas or invoke memory-recall agent';
      const incorrectText = 'run /check-gotchas or invoke memory-recall agent';

      expect(expectedPattern.test(correctText)).toBe(true);
      expect(expectedPattern.test(incorrectText)).toBe(false);
    });

    it('should reference memory CLI via bun link', () => {
      // Should reference `memory` command directly, not the full path
      const correctReference = 'memory write';
      const oldReference = '~/.claude/skills/memory/memory write';

      expect(correctReference).not.toContain('~/.claude/skills');
      expect(oldReference).toContain('~/.claude/skills');
    });
  });

  describe('reminder content', () => {
    it('should include gotcha check reminder', () => {
      const reminderContent = `MEMORY & GOTCHA REMINDERS:
• Before destructive operations (rm, mv on important paths): run /memory:check-gotchas or invoke memory-recall agent`;

      expect(reminderContent).toContain('destructive operations');
      expect(reminderContent).toContain('/memory:check-gotchas');
    });

    it('should include memory-recall agent reference', () => {
      const reminderContent = 'invoke memory-recall agent';
      expect(reminderContent).toContain('memory-recall');
    });
  });
});
