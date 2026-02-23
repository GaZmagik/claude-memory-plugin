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
import { findAnyUnclaimedSubagent } from '../src/agent/subagent-registry.ts';

runHook(async (input) => {
  // Defence-in-depth: Skip if running in memory capture HOME
  if (isForkedSession()) {
    return allow();
  }

  const sessionId = input?.session_id || '';
  const cwd = input?.cwd || process.cwd();
  const reason = input?.reason || 'unknown';

  // Agent session path: CLAUDE_AGENT_NAME is set → run agent-commit on any exit reason
  const agentName = (process.env.CLAUDE_AGENT_NAME ?? '').trim();
  if (agentName.length > 0) {
    if (!sessionId) {
      return allow('No session ID - skipping agent memory capture');
    }

    const agentContextPrompt = extractContextAsSystemPrompt(sessionId, cwd);
    if (!agentContextPrompt) {
      return allow('No session context found - skipping agent memory capture');
    }

    const agentPreamble = `=== AGENT IDENTITY ===\nAgent Name: ${agentName}\nCLAUDE_AGENT_NAME=${agentName}\n=== END AGENT IDENTITY ===\n\n`;

    const pluginDirs: string[] = [];
    const memoryPluginDir = findPluginDir('claude-memory-plugin');
    if (memoryPluginDir) pluginDirs.push(memoryPluginDir);

    const result = await spawnSessionWithContext({
      sessionId,
      cwd,
      prompt: `/claude-memory-plugin:agent-commit agent-name=${agentName} session-end-trigger=${reason}`,
      contextPrompt: agentPreamble + agentContextPrompt,
      logPrefix: 'agent-session-end-memory',
      timeoutSecs: 300,
      trigger: reason,
      tools: 'Read,Skill,Bash,Write',
      pluginDirs,
    });

    if (result.started) {
      return allow(`Agent memory capture started in background (log: ${result.logFile})`);
    }
    return allow(result.error || 'Agent memory capture failed to start');
  }

  // Sweep any unclaimed subagent entries left by SubagentStop + PostToolUse.
  // Runs on any exit reason so no capture is lost regardless of how the session ends.
  {
    const subagentPluginDirs: string[] = [];
    const subagentPluginDir = findPluginDir('claude-memory-plugin');
    if (subagentPluginDir) subagentPluginDirs.push(subagentPluginDir);

    let subagentEntry = findAnyUnclaimedSubagent();
    while (subagentEntry) {
      const subagentContextPrompt = extractContextAsSystemPrompt(subagentEntry.agentId, cwd);
      if (subagentContextPrompt) {
        const agentLabel =
          subagentEntry.agentType !== 'subagent' ? subagentEntry.agentType : 'unknown-agent';
        const preamble = `=== AGENT IDENTITY ===\nAgent Name: ${agentLabel}\nCLAUDE_AGENT_NAME=${agentLabel}\n=== END AGENT IDENTITY ===\n\n`;
        await spawnSessionWithContext({
          sessionId: subagentEntry.agentId,
          cwd,
          prompt: `/claude-memory-plugin:agent-commit agent-name=${agentLabel} session-end-trigger=${reason}`,
          contextPrompt: preamble + subagentContextPrompt,
          logPrefix: 'subagent-session-end-memory',
          timeoutSecs: 300,
          trigger: reason,
          tools: 'Read,Skill,Bash,Write',
          pluginDirs: subagentPluginDirs,
        });
      }
      subagentEntry = findAnyUnclaimedSubagent();
    }
  }

  // Non-agent sessions: only trigger on "clear"
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
