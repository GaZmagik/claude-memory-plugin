#!/usr/bin/env bun
/**
 * PreCompact: Memory Capture Hook
 *
 * Extracts session context and spawns a background Claude process to capture
 * memories before compaction destroys the conversation context.
 *
 * Instead of forking the session (which requires a separate HOME), this approach:
 * 1. Extracts conversation context from the JSONL file since last compaction
 * 2. Passes the context as --append-system-prompt to a new Claude process
 * 3. Runs the /memory:commit command with full conversation awareness
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { existsSync, unlinkSync, mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execFileSync } from 'child_process';
import {
  isForkedSession,
  getLogDir,
  spawnSessionWithContext,
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
  const trigger = input?.trigger || 'auto';

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
  // Prefer project-local flag (cleaned up by session-continue), fall back to global
  const flagContent = `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\ntrigger=${trigger}\n`;

  if (existsSync(join(cwd, '.claude'))) {
    // Project has .claude directory - use project-local flag only
    const projectFlagDir = join(cwd, '.claude', 'flags');
    mkdirSync(projectFlagDir, { recursive: true });
    writeFileSync(join(projectFlagDir, `compact-${sessionId}`), flagContent);
  } else {
    // No project .claude - fall back to global flag
    const globalFlagDir = join(homedir(), '.claude', 'flags');
    mkdirSync(globalFlagDir, { recursive: true });
    writeFileSync(join(globalFlagDir, `compact-${sessionId}`), flagContent);
  }

  // Sync memory graph/index before capture (ensures consistency)
  // Log result but NEVER block compaction on failure
  try {
    const syncResult = execFileSync('memory', ['sync', 'local'], {
      cwd,
      timeout: 10000, // 10 second timeout
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const syncLogFile = join(logDir, `precompact-sync-${sessionId}.log`);
    appendFileSync(syncLogFile, `[${new Date().toISOString()}] Sync completed:\n${syncResult}\n`);
  } catch (syncError) {
    // Log failure but continue - never block compaction
    const syncLogFile = join(logDir, `precompact-sync-${sessionId}.log`);
    appendFileSync(
      syncLogFile,
      `[${new Date().toISOString()}] Sync failed (non-blocking): ${syncError}\n`
    );
  }

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
    prompt: `/claude-memory-plugin:commit precompact-trigger=${trigger}`,
    contextPrompt,
    logPrefix: 'memory-capture',
    timeoutSecs: 600,
    trigger,
    tools: 'Read,Skill,Bash',
    pluginDirs,
  });

  if (result.started) {
    return allow(`Memory capture started in background (log: ${result.logFile})`);
  }

  return allow(result.error || 'Memory capture failed to start');
});
