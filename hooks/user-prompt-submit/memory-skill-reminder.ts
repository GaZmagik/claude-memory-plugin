#!/usr/bin/env bun
/**
 * UserPromptSubmit/PostToolUse: Constant reminder to use memory skill
 */

import { runHook, allow } from '../src/core/error-handler.ts';

const REMINDER_SHORT = `MEMORY REMINDERS: Use memory-recall agent (supports resume) before destructive ops or major changes. Verify symlinks with ls -la before modifying .specify/`;

const REMINDER_FULL = `MEMORY & GOTCHA REMINDERS:
• Before destructive operations (rm, mv on important paths): run /memory:check-gotchas or invoke memory-recall agent
• Before modifying .specify/ or ~/.specify/: verify symlink structure with ls -la
• To check memory: Use Task tool with subagent_type=memory-recall (supports resume for follow-ups)
• To record learnings: Use memory write with JSON payload (via bun link)
• Resume pattern: After initial query, use "resume" parameter with returned agentId for efficient follow-ups`;

runHook(async (input) => {
  const hookEvent = input?.hook_event_name || '';

  if (hookEvent === 'PostToolUse') {
    return allow(REMINDER_SHORT);
  }

  // UserPromptSubmit gets full reminder
  return allow(REMINDER_FULL);
});
