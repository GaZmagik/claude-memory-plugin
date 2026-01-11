#!/usr/bin/env bun
/**
 * SessionEnd: Memory Capture Hook
 *
 * Resumes the current session in a background process to capture memories
 * before /clear destroys the conversation context.
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import {
  isForkedSession,
  spawnForkedSession,
  getLogDir,
} from '../src/session/forked-session.ts';

runHook(async (input) => {
  // Defence-in-depth: Skip if running in memory capture HOME
  if (isForkedSession()) {
    return allow();
  }

  const sessionId = (input as any)?.session_id || '';
  const cwd = input?.cwd || process.cwd();
  const reason = (input as any)?.reason || 'unknown';

  // Only trigger on "clear" - other exit reasons don't need memory capture
  if (reason !== 'clear') {
    return allow();
  }

  if (!sessionId) {
    return allow();
  }

  // Create log directory
  getLogDir(cwd);

  // Create clear-flag to block tools until /session-restore is run
  const home = homedir();
  const flagDir = join(home, '.claude', 'flags');
  mkdirSync(flagDir, { recursive: true });
  const flagFile = join(flagDir, `clear-${sessionId}`);

  // Also create project-local flag
  const projectFlagDir = join(cwd, '.claude', 'flags');
  if (existsSync(join(cwd, '.claude'))) {
    mkdirSync(projectFlagDir, { recursive: true });
    const projectFlagFile = join(projectFlagDir, `clear-${sessionId}`);
    writeFileSync(projectFlagFile, `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\nreason=${reason}\n`);
  }
  writeFileSync(flagFile, `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\nreason=${reason}\n`);

  // Spawn forked session for memory capture
  const result = await spawnForkedSession({
    sessionId,
    cwd,
    prompt: `/memory-commit session-end-trigger=${reason}`,
    lockName: '.session-end-memory.lock',
    logPrefix: 'session-end-memory',
    timeoutSecs: 300,
    trigger: reason,
    tools: 'Bash,Read,Grep,Glob,TodoWrite',
  });

  if (result.started) {
    return allow(`Memory capture started in background (log: ${result.logFile})`);
  }

  return allow(result.error || 'Memory capture failed to start');
});
