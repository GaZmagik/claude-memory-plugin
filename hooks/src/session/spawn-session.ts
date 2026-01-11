#!/usr/bin/env bun
/**
 * Spawn Session - Background Claude Process Spawning
 *
 * Provides infrastructure for spawning background Claude processes that:
 * - Run completely fresh sessions (no forking)
 * - Receive conversation context via --additional-system-prompt
 * - Fully detach from parent process
 * - Log to timestamped files
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface SpawnSessionOptions {
  /** Session ID (for logging and file naming) */
  sessionId: string;
  /** Working directory */
  cwd: string;
  /** Prompt to send (slash command) */
  prompt: string;
  /** Extracted context to pass as additional system prompt */
  contextPrompt: string;
  /** Log file prefix (e.g., 'memory-capture') */
  logPrefix: string;
  /** Timeout in seconds (default: 300) */
  timeoutSecs?: number;
  /** Model to use (default: claude-haiku-4-5-20251001) */
  model?: string;
  /** Trigger type for logging */
  trigger?: string;
  /** Tools to allow (comma-separated) */
  tools?: string;
}

export interface SpawnSessionResult {
  /** Whether the spawn was started successfully */
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

/**
 * Check if running in memory capture HOME (defence-in-depth)
 * Note: This is a legacy check from the old forking pattern.
 * Kept for backwards compatibility but should always return false
 * with the new spawn pattern.
 */
export function isMemoryCaptureSession(): boolean {
  return homedir().includes('claude-memory-home');
}

// Backwards compatibility alias
export const isForkedSession = isMemoryCaptureSession;

/**
 * Spawn a fresh Claude session with extracted context
 *
 * This creates a fully detached background process that:
 * 1. Runs a completely fresh Claude session (no forking)
 * 2. Receives conversation context via --additional-system-prompt
 * 3. Runs the specified prompt
 * 4. Logs output to timestamped file
 */
export async function spawnSessionWithContext(
  options: SpawnSessionOptions
): Promise<SpawnSessionResult> {
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
  const model = options.model ?? 'claude-haiku-4-5-20251001';
  const tools = options.tools ?? 'Bash,Read,Grep,Glob,TodoWrite';

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
  const { spawn: nodeSpawn } = await import('node:child_process');
  const proc = nodeSpawn('bash', ['-c', backgroundScript], {
    cwd: options.cwd,
    detached: true,
    stdio: 'ignore',
  });

  // Unref to allow process to continue independently
  proc.unref();

  return {
    started: true,
    logFile,
  };
}
