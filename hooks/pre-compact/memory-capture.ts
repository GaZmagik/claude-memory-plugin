#!/usr/bin/env bun
/**
 * PreCompact: Memory Capture Hook
 *
 * Extracts session context and spawns a background Claude process to capture
 * memories before compaction destroys the conversation context.
 *
 * Instead of forking the session (which requires a separate HOME), this approach:
 * 1. Extracts conversation context from the JSONL file since last compaction
 * 2. Passes the context as --additional-system-prompt to a new Claude process
 * 3. Runs the /memory-commit command with full conversation awareness
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { isForkedSession, getLogDir, getTimestamp } from '../src/session/forked-session.ts';
import { extractContextAsSystemPrompt } from '../src/session/extract-context.ts';

/**
 * Spawn a Claude process with extracted session context
 */
async function spawnWithContext(options: {
  sessionId: string;
  cwd: string;
  prompt: string;
  contextPrompt: string;
  logPrefix: string;
  timeoutSecs?: number;
  trigger?: string;
}): Promise<{ started: boolean; logFile?: string; error?: string }> {
  const logDir = getLogDir(options.cwd);
  const timestamp = getTimestamp();
  const logFile = join(logDir, `${options.logPrefix}-${timestamp}-${options.sessionId}.log`);

  // Initialize log file
  const trigger = options.trigger || 'auto';
  const header = `=== ${options.logPrefix} Started: ${new Date().toISOString()} ===
Session ID: ${options.sessionId}
Trigger: ${trigger}
Working Directory: ${options.cwd}
Context size: ${options.contextPrompt.length} bytes
---
`;
  writeFileSync(logFile, header);

  const timeoutSecs = options.timeoutSecs ?? 300;
  const model = 'claude-haiku-4-5-20251001';
  const tools = 'Bash,Read,Grep,Glob,TodoWrite';

  // Escape strings for shell
  const escapeShell = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

  // Write context to temp file to avoid shell escaping issues with large text
  const contextFile = join(logDir, `context-${options.sessionId}.txt`);
  writeFileSync(contextFile, options.contextPrompt);

  const backgroundScript = `
    LOG_FILE=${escapeShell(logFile)}
    CONTEXT_FILE=${escapeShell(contextFile)}
    TIMEOUT=${timeoutSecs}
    MODEL=${escapeShell(model)}
    TOOLS=${escapeShell(tools)}
    PROMPT=${escapeShell(options.prompt)}
    CWD=${escapeShell(options.cwd)}

    echo "[$(date -u +%Y%m%dT%H%M%SZ)] Starting memory capture with context..." >> "$LOG_FILE"

    cd "$CWD"

    timeout ${timeoutSecs}s claude \\
      --model "$MODEL" \\
      --permission-mode bypassPermissions \\
      --dangerously-skip-permissions \\
      --output-format "stream-json" \\
      --verbose \\
      --additional-system-prompt "$(cat "$CONTEXT_FILE")" \\
      --tools "$TOOLS" \\
      --print "$PROMPT" 2>&1 | tee -a "$LOG_FILE"

    EXIT_CODE=\${PIPESTATUS[0]}
    echo "---" >> "$LOG_FILE"
    echo "Completed with exit code: $EXIT_CODE" >> "$LOG_FILE"
    echo "=== Finished: $(date -u +%Y%m%dT%H%M%SZ) ===" >> "$LOG_FILE"

    # Clean up context file
    rm -f "$CONTEXT_FILE"
  `;

  // Launch detached background process
  const proc = Bun.spawn(['nohup', 'bash', '-c', backgroundScript], {
    stdin: null,
    stdout: null,
    stderr: null,
    cwd: options.cwd,
  });

  // Unref to allow process to continue independently
  proc.unref();

  return {
    started: true,
    logFile,
  };
}

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
    writeFileSync(
      projectFlagFile,
      `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\ntrigger=${trigger}\n`
    );
  }
  writeFileSync(
    flagFile,
    `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\ntrigger=${trigger}\n`
  );

  // Extract session context
  const contextPrompt = extractContextAsSystemPrompt(sessionId, cwd);

  if (!contextPrompt) {
    return allow('No session context found - skipping memory capture');
  }

  // Spawn Claude with extracted context
  const result = await spawnWithContext({
    sessionId,
    cwd,
    prompt: `/memory-commit precompact-trigger=${trigger}`,
    contextPrompt,
    logPrefix: 'memory-capture',
    timeoutSecs: 600,
    trigger,
  });

  if (result.started) {
    return allow(`Memory capture started in background (log: ${result.logFile})`);
  }

  return allow(result.error || 'Memory capture failed to start');
});
