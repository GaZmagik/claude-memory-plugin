/**
 * Hook Logger - Debug logging utility for Claude Code hooks
 *
 * Logs hook execution details to ~/.claude/logs/hook-debug.log
 */

import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const LOG_FILE = join(homedir(), '.claude/logs/hook-debug.log');
const MAX_INPUT_LENGTH = 500;

// Ensure log directory exists
try {
  mkdirSync(join(homedir(), '.claude/logs'), { recursive: true });
} catch {
  // Ignore
}

export interface LogContext {
  hookName: string;
  hookType: string; // PreToolUse, PostToolUse, UserPromptSubmit, etc.
  toolName?: string;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...[truncated]';
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function writeLog(message: string): void {
  try {
    appendFileSync(LOG_FILE, message + '\n');
  } catch {
    // Silently fail - don't break hooks due to logging
  }
}

export function logHookStart(ctx: LogContext, input: unknown): void {
  const inputStr = truncate(safeStringify(input), MAX_INPUT_LENGTH);
  writeLog(
    `[${formatTimestamp()}] START ${ctx.hookType}:${ctx.hookName} tool=${ctx.toolName || 'N/A'} input=${inputStr}`
  );
}

export function logHookEnd(ctx: LogContext, exitCode: number, output?: unknown): void {
  const outputStr = output ? truncate(safeStringify(output), MAX_INPUT_LENGTH) : 'none';
  writeLog(
    `[${formatTimestamp()}] END ${ctx.hookType}:${ctx.hookName} exitCode=${exitCode} output=${outputStr}`
  );
}

export function logHookError(ctx: LogContext, error: unknown): void {
  const errorStr = error instanceof Error ? error.stack || error.message : String(error);
  writeLog(`[${formatTimestamp()}] ERROR ${ctx.hookType}:${ctx.hookName} error=${errorStr}`);
}

/**
 * Create a logger for a specific hook
 */
export function createHookLogger(hookName: string, hookType: string) {
  return {
    start: (input: unknown, toolName?: string) =>
      logHookStart({ hookName, hookType, toolName }, input),
    end: (exitCode: number, output?: unknown) =>
      logHookEnd({ hookName, hookType }, exitCode, output),
    error: (error: unknown) => logHookError({ hookName, hookType }, error),
    log: (message: string) =>
      writeLog(`[${formatTimestamp()}] INFO ${hookType}:${hookName} ${message}`),
  };
}
