#!/usr/bin/env bun
/**
 * Consolidated Memory & Deliberation Reminders Hook
 *
 * Shows reminders about memory skill and deliberation features
 * based on user-configured threshold (reminder_count setting).
 *
 * Replaces separate memory-skill-reminder.ts and memory-think-reminder.ts
 *
 * @since v1.2.0
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { loadSettings } from '../src/settings/plugin-settings.ts';
import { SessionCache } from '../src/session/session-cache.ts';
import { join } from 'node:path';

const REMINDER_FULL = `📚 MEMORY & DELIBERATION REMINDERS:
• Before destructive operations: invoke memory:recall agent or run /memory:check-gotchas
• Before modifying .specify/: verify symlink structure with ls -la
• To record learnings: Use \`memory write\` command with JSON payload
• For complex decisions: Use \`memory think\` to document chain-of-thought
  - \`memory think create "Topic"\` → Start deliberation
  - \`memory think conclude "Text" --promote <type>\` → Finalise
• Resume pattern: Use "resume" parameter with agentId for efficient follow-ups`;

runHook(async (input) => {
  const projectDir = input?.cwd || process.cwd();
  const sessionId = input?.session_id || '';

  // Load settings to get reminder_count threshold
  const settings = await loadSettings(projectDir);
  const threshold = settings.reminder_count;

  // If reminders disabled, skip
  if (threshold === 0) {
    return allow();
  }

  // Check session cache for reminder count
  const cacheDir = join(projectDir, '.claude', 'cache', 'memory-context');
  const cache = await SessionCache.create(cacheDir, sessionId);
  const cacheKey = 'reminder-count';

  // Get current count (defaults to 0 if not exists or invalid)
  let count = 0;
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    const parsed = parseInt(cached, 10);
    count = isNaN(parsed) ? 0 : parsed;
  }

  // Increment and store
  count++;
  await cache.set(cacheKey, count.toString());

  // Show reminder if under threshold
  if (count <= threshold) {
    return allow(REMINDER_FULL);
  }

  // Silent after threshold reached
  return allow();
});
