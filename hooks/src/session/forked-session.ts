#!/usr/bin/env bun
/**
 * Forked Session Pattern for PreCompact/SessionEnd hooks
 *
 * Provides infrastructure for spawning background Claude processes that:
 * - Use lock files for atomic execution
 * - Run in separate HOME to avoid autoCompact
 * - Fully detach from parent process
 * - Log to timestamped files
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface ForkedSessionOptions {
  /** Session ID to resume from */
  sessionId: string;
  /** Working directory */
  cwd: string;
  /** Prompt to send (slash command) */
  prompt: string;
  /** @deprecated Lock system removed - duplicates are harmless */
  lockName?: string;
  /** Log file prefix (e.g., 'memory-capture') */
  logPrefix: string;
  /** Timeout in seconds (default: 300) */
  timeoutSecs?: number;
  /** Model to use (default: claude-haiku-4-5-20251001) */
  model?: string;
  /** Trigger type for logging */
  trigger?: string;
  /** Additional system prompt for forked agent */
  systemPrompt?: string;
  /** Tools to allow (comma-separated) */
  tools?: string;
}

export interface ForkedSessionResult {
  /** Whether the fork was started successfully */
  started: boolean;
  /** Log file path */
  logFile?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Get log directory path (prefers project-specific, falls back to global)
 */
export function getLogDir(cwd: string): string {
  const projectLogDir = join(cwd, '.claude', 'logs');
  if (existsSync(join(cwd, '.claude'))) {
    mkdirSync(projectLogDir, { recursive: true });
    return projectLogDir;
  }
  const globalLogDir = join(homedir(), '.claude', 'logs');
  mkdirSync(globalLogDir, { recursive: true });
  return globalLogDir;
}

/**
 * Generate ISO timestamp for filenames
 */
export function getTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

// Lock system removed - see decision-should-we-gut-the-pre-compact-lock-syste-20260108
// Rationale: 5-minute hang on stale locks was worse than theoretical duplicate runs

/**
 * Default system prompt for forked sessions
 */
export const FORKED_SESSION_SYSTEM_PROMPT = `CRITICAL SYSTEM OVERRIDE - FORKED SESSION IDENTITY

You are NOT the main session. You are a FORKED CLONE created by an automated hook.
The main session has ALREADY moved on and is compacting.

YOUR ONLY PURPOSE: Execute the slash command in the next user message.
YOUR IDENTITY: Background capture agent, not the original assistant.

ABSOLUTE PROHIBITIONS:
- DO NOT continue any previous task from the conversation history
- DO NOT make Edit, Write, or code modification calls
- DO NOT run tests, builds, or project commands
- DO NOT reason about what 'the user wants' from prior context

If you find yourself about to call Edit, Write, Bash(pytest), or similar: STOP.
You are a memory/retrospective agent. Act accordingly.

The conversation history is READ-ONLY CONTEXT for analysis, not a task queue.`;

/**
 * Spawn a forked Claude session in background
 *
 * This creates a fully detached background process that:
 * 1. Uses a separate HOME directory to avoid autoCompact
 * 2. Resumes the session with --fork-session
 * 3. Runs the specified prompt
 * 4. Logs output to timestamped file
 */
export async function spawnForkedSession(
  options: ForkedSessionOptions
): Promise<ForkedSessionResult> {
  const home = homedir();
  const memoryHome = join(home, '.claude-memory-home');
  const logDir = getLogDir(options.cwd);
  const timestamp = getTimestamp();
  const logFile = join(logDir, `${options.logPrefix}-${timestamp}-${options.sessionId}.log`);

  // Initialize log file
  const trigger = options.trigger || 'auto';
  const header = `=== ${options.logPrefix} Started: ${new Date().toISOString()} ===
Session ID: ${options.sessionId}
Trigger: ${trigger}
Working Directory: ${options.cwd}
---
`;
  writeFileSync(logFile, header);

  // Build the background script
  const timeoutSecs = options.timeoutSecs ?? 300;
  const model = options.model ?? 'claude-haiku-4-5-20251001';
  const systemPrompt = options.systemPrompt ?? FORKED_SESSION_SYSTEM_PROMPT;
  const tools = options.tools ?? 'Bash,Read,Grep,Glob,TodoWrite';

  // Escape strings for shell
  const escapeShell = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

  const backgroundScript = `
    LOG_FILE=${escapeShell(logFile)}
    SESSION_ID=${escapeShell(options.sessionId)}
    MEMORY_HOME=${escapeShell(memoryHome)}
    TIMEOUT=${timeoutSecs}
    MODEL=${escapeShell(model)}
    SYSTEM_PROMPT=${escapeShell(systemPrompt)}
    TOOLS=${escapeShell(tools)}
    PROMPT=${escapeShell(options.prompt)}

    echo "[$(date -u +%Y%m%dT%H%M%SZ)] Forking session..." >> "$LOG_FILE"

    env HOME="$MEMORY_HOME" timeout ${timeoutSecs}s claude \\
      --resume "$SESSION_ID" \\
      --fork-session \\
      --no-session-persistence \\
      --model "$MODEL" \\
      --permission-mode bypassPermissions \\
      --dangerously-skip-permissions \\
      --output-format "stream-json" \\
      --verbose \\
      --append-system-prompt "$SYSTEM_PROMPT" \\
      --tools "$TOOLS" \\
      --print "$PROMPT" 2>&1 | tee -a "$LOG_FILE"

    EXIT_CODE=\${PIPESTATUS[0]}
    echo "---" >> "$LOG_FILE"
    echo "Completed with exit code: $EXIT_CODE" >> "$LOG_FILE"
    echo "=== Finished: $(date -u +%Y%m%dT%H%M%SZ) ===" >> "$LOG_FILE"
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

/**
 * Check if running in memory capture HOME (defence-in-depth)
 */
export function isForkedSession(): boolean {
  return homedir().includes('claude-memory-home');
}
