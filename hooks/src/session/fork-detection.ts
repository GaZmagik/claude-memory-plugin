/**
 * T122: Fork session detection utility
 *
 * Detects if we can spawn forked Claude sessions for background work
 * like memory capture and retrospective analysis.
 *
 * SECURITY: Uses execFileSync with argument array to prevent command injection
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Check if the claude CLI binary is available
 */
export function hasClaudeBinary(): boolean {
  try {
    execFileSync('which', ['claude'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the path to the claude binary
 */
export function getClaudeBinaryPath(): string | null {
  try {
    const result = execFileSync('which', ['claude'], { stdio: 'pipe', encoding: 'utf-8' });
    return result.trim();
  } catch {
    return null;
  }
}

/**
 * Check if we can spawn a forked Claude session
 * This requires the claude CLI and appropriate permissions
 */
export function canSpawnForkSession(): boolean {
  if (!hasClaudeBinary()) {
    return false;
  }

  // Check if we have an API key available
  const hasApiKey = Boolean(
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY
  );

  return hasApiKey;
}

/**
 * Fork session options
 */
export interface ForkSessionOptions {
  /** Model to use for the forked session */
  model?: string;
  /** Maximum tokens for the response */
  maxTokens?: number;
  /** System prompt for the forked session */
  systemPrompt?: string;
  /** Working directory for the session */
  cwd?: string;
  /** Whether to print output (--print mode) */
  printMode?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of a forked session
 */
export interface ForkSessionResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

/**
 * Spawn a forked Claude session for background work
 */
export async function spawnForkSession(
  prompt: string,
  options: ForkSessionOptions = {}
): Promise<ForkSessionResult> {
  const {
    model = 'claude-haiku-4-5-20251001',
    maxTokens,
    systemPrompt,
    cwd = process.cwd(),
    printMode = true,
    timeout = 60000,
  } = options;

  if (!canSpawnForkSession()) {
    return {
      success: false,
      error: 'Cannot spawn fork session: claude CLI not available or no API key',
    };
  }

  const args: string[] = [];

  if (printMode) {
    args.push('--print');
  }

  if (model) {
    args.push('--model', model);
  }

  if (maxTokens) {
    args.push('--max-tokens', String(maxTokens));
  }

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  // Add the prompt as final argument
  args.push(prompt);

  try {
    const result = execFileSync('claude', args, {
      cwd,
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
      },
    });

    return {
      success: true,
      output: result,
      exitCode: 0,
    };
  } catch (error: unknown) {
    const execError = error as { status?: number; stderr?: string; message?: string };
    return {
      success: false,
      error: execError.stderr || execError.message || 'Unknown error',
      exitCode: execError.status,
    };
  }
}

/**
 * Create a log file for fork session output
 */
export function createForkLogFile(prefix: string, sessionId?: string): string {
  const logsDir = path.join(process.cwd(), '.claude', 'logs');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const id = sessionId || `${Date.now()}`;
  const filename = `${prefix}-${timestamp}-${id}.log`;

  return path.join(logsDir, filename);
}

/**
 * Write output to a fork log file
 */
export function writeForkLog(
  logPath: string,
  content: string,
  append: boolean = true
): void {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${content}\n`;

  if (append && fs.existsSync(logPath)) {
    fs.appendFileSync(logPath, entry);
  } else {
    fs.writeFileSync(logPath, entry);
  }
}

/**
 * Check if running inside a forked session
 * Forked sessions typically have specific environment markers
 */
export function isForkedSession(): boolean {
  return Boolean(
    process.env.CLAUDE_FORK_SESSION ||
    process.env.CLAUDE_BACKGROUND_TASK
  );
}

/**
 * Get session ID from environment or generate one
 */
export function getSessionId(): string {
  return (
    process.env.CLAUDE_SESSION_ID ||
    `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );
}
