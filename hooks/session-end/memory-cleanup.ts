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
  spawnSessionWithContext,
  getLogDir,
  findPluginDir,
} from '../src/session/spawn-session.ts';
import { extractContextAsSystemPrompt } from '../src/session/extract-context.ts';

runHook(async (input) => {
  // Defence-in-depth: Skip if running in memory capture HOME
  if (isForkedSession()) {
    return allow();
  }

  const sessionId = input?.session_id || '';
  const cwd = input?.cwd || process.cwd();
  const reason = input?.reason || 'unknown';

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

  // Extract session context
  const contextPrompt = extractContextAsSystemPrompt(sessionId, cwd);

  if (!contextPrompt) {
    return allow('No session context found - skipping memory capture');
  }

  // Find memory plugin directory for spawned session to access skills
  const pluginDirs: string[] = [];
  const memoryPluginDir = findPluginDir('claude-memory-plugin');
  if (memoryPluginDir) {
    pluginDirs.push(memoryPluginDir);
  }

  // Spawn Claude with extracted context
  // Security: Restrict tools to only what's needed for memory capture
  const result = await spawnSessionWithContext({
    sessionId,
    cwd,
    prompt: `/claude-memory-plugin:commit session-end-trigger=${reason}`,
    contextPrompt,
    logPrefix: 'session-end-memory',
    timeoutSecs: 300,
    trigger: reason,
    tools: 'Read,Skill,Bash',
    pluginDirs,
  });

  if (result.started) {
    return allow(`Memory capture started in background (log: ${result.logFile})`);
  }

  return allow(result.error || 'Memory capture failed to start');
});
