#!/usr/bin/env bun
/**
 * PreCompact: Memory Capture Hook
 *
 * Resumes the current session in a background process to capture memories
 * before compaction destroys the conversation context.
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  isForkedSession,
  spawnForkedSession,
  getLogDir,
  FORKED_SESSION_SYSTEM_PROMPT,
} from '../src/session/forked-session.ts';

runHook(async (input) => {
  // Defence-in-depth: Skip if running in memory capture HOME
  if (isForkedSession()) {
    return allow();
  }

  const sessionId = (input as any)?.session_id || '';
  const cwd = input?.cwd || process.cwd();
  const trigger = (input as any)?.trigger || 'auto';

  if (!sessionId) {
    return allow();
  }

  // Create log directory
  const logDir = getLogDir(cwd);

  // Wipe the gotcha session cache on compaction
  // Agent is about to forget everything, so the cache should reset too
  const gotchaCacheFile = join(logDir, 'gotcha-session-cache.json');
  if (existsSync(gotchaCacheFile)) {
    try {
      unlinkSync(gotchaCacheFile);
    } catch {
      // Ignore
    }
  }

  // Create compact flag for session blocking
  const home = homedir();
  const flagDir = join(home, '.claude', 'flags');
  mkdirSync(flagDir, { recursive: true });
  const flagFile = join(flagDir, `compact-${sessionId}`);

  // Also create project-local flag
  const projectFlagDir = join(cwd, '.claude', 'flags');
  if (existsSync(join(cwd, '.claude'))) {
    mkdirSync(projectFlagDir, { recursive: true });
    const projectFlagFile = join(projectFlagDir, `compact-${sessionId}`);
    writeFileSync(projectFlagFile, `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\ntrigger=${trigger}\n`);
  }
  writeFileSync(flagFile, `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\ntrigger=${trigger}\n`);

  // Spawn forked session for memory capture
  const result = await spawnForkedSession({
    sessionId,
    cwd,
    prompt: `/memory-commit precompact-trigger=${trigger}`,
    lockName: '.memory-capture.lock',
    logPrefix: 'memory-capture',
    timeoutSecs: 600,
    trigger,
    systemPrompt: FORKED_SESSION_SYSTEM_PROMPT,
    tools: 'Bash,Read,Grep,Glob,TodoWrite',
  });

  if (result.started) {
    return allow(`Memory capture started in background (log: ${result.logFile})`);
  }

  return allow(result.error || 'Memory capture failed to start');
});
