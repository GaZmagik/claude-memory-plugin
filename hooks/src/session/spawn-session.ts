#!/usr/bin/env bun
/**
 * Spawn Session - Background Claude Process Spawning
 *
 * Provides infrastructure for spawning background Claude processes that:
 * - Run completely fresh sessions (no forking)
 * - Receive conversation context via --append-system-prompt
 * - Fully detach from parent process
 * - Log to timestamped files
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir, tmpdir } from 'os';

/**
 * Find the installed plugin directory for a given plugin name
 * Reads from ~/.claude/plugins/installed_plugins.json
 */
export function findPluginDir(pluginName: string): string | null {
  const home = homedir();
  const installedPluginsPath = join(home, '.claude', 'plugins', 'installed_plugins.json');

  if (!existsSync(installedPluginsPath)) {
    return null;
  }

  try {
    const content = readFileSync(installedPluginsPath, 'utf-8');
    const data = JSON.parse(content);
    const plugins = data.plugins || {};

    // Look for the plugin by name (handles partial matches)
    for (const [key, entries] of Object.entries(plugins)) {
      if (key.includes(pluginName)) {
        const entryList = entries as Array<{ installPath?: string }>;
        if (entryList.length > 0 && entryList[0].installPath) {
          return entryList[0].installPath;
        }
      }
    }
  } catch {
    // JSON parse error or file read error
  }

  return null;
}

export interface SpawnSessionOptions {
  /** Session ID (for logging and file naming) */
  sessionId: string;
  /** Working directory */
  cwd: string;
  /** Prompt to send (slash command) */
  prompt: string;
  /** Extracted context to pass as append system prompt */
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
  /** Plugin directories to load (for skill/command access) */
  pluginDirs?: string[];
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
 * Validate and sanitise a string for safe shell usage
 *
 * Rejects strings containing shell metacharacters that could enable injection.
 * Returns the original string if safe, throws if dangerous characters found.
 *
 * @param value - String to validate
 * @param fieldName - Name of field for error messages
 * @throws Error if string contains dangerous characters
 */
export function validateShellSafe(value: string, fieldName: string): string {
  // Dangerous shell metacharacters that could enable injection
  // Includes: backticks, $(), command separators, redirects, pipes, etc.
  const dangerousPattern = /[`$();&|<>\\'\n\r]/;

  if (dangerousPattern.test(value)) {
    throw new Error(
      `Invalid ${fieldName}: contains shell metacharacters. ` +
        `Value must not contain: \` $ ( ) ; & | < > \\ ' or newlines`
    );
  }

  return value;
}

/**
 * Validate a file path for safe shell usage
 *
 * Allows typical path characters (alphanumeric, /, -, _, ., spaces)
 * but rejects shell metacharacters.
 *
 * @param path - Path to validate
 * @throws Error if path contains dangerous characters
 */
export function validatePathSafe(path: string): string {
  // Allow typical path characters but reject shell metacharacters
  // Permitted: alphanumeric, /, -, _, ., space, ~
  // Rejected: backticks, $, (), ;, &, |, <>, \, ', ", newlines
  const dangerousPattern = /[`$();&|<>\\'"!\n\r]/;

  if (dangerousPattern.test(path)) {
    throw new Error(
      `Invalid path: contains shell metacharacters. ` +
        `Path must not contain: \` $ ( ) ; & | < > \\ ' " ! or newlines`
    );
  }

  return path;
}

/**
 * Spawn a fresh Claude session with extracted context
 *
 * This creates a fully detached background process that:
 * 1. Runs a completely fresh Claude session (no forking)
 * 2. Receives conversation context via --append-system-prompt
 * 3. Runs the specified prompt
 * 4. Logs output to timestamped file
 *
 * Security: Uses a minimal wrapper script with all values passed via
 * files or validated arguments to prevent shell injection.
 */
export async function spawnSessionWithContext(
  options: SpawnSessionOptions
): Promise<SpawnSessionResult> {
  // Validate cwd path before using in shell
  const cwd = validatePathSafe(options.cwd);

  const logDir = getLogDir(cwd);
  const timestamp = getTimestamp();
  const logFile = join(logDir, `${options.logPrefix}-${timestamp}-${options.sessionId}.log`);

  // Initialize log file
  const trigger = options.trigger || 'auto';
  const header = `=== ${options.logPrefix} Started: ${new Date().toISOString()} ===
Session ID: ${options.sessionId}
Trigger: ${trigger}
Working Directory: ${cwd}
Context size: ${options.contextPrompt.length} bytes
---
`;
  writeFileSync(logFile, header);

  // Validate numeric timeout to prevent injection
  const timeoutSecs = Math.max(1, Math.min(3600, Math.floor(options.timeoutSecs ?? 300)));

  // Validate string arguments that will be passed to shell
  const model = validateShellSafe(options.model ?? 'claude-haiku-4-5-20251001', 'model');
  const tools = validateShellSafe(options.tools ?? 'Bash,Read,Grep,Glob,TodoWrite', 'tools');

  // Validate all plugin directory paths
  const pluginDirs = (options.pluginDirs ?? []).map((dir) => validatePathSafe(dir));

  // Write ephemeral files to /tmp/ instead of .claude/logs/
  // These are only needed during execution and self-clean on completion
  // Using /tmp/ avoids cluttering project directories if cleanup fails
  const tempDir = tmpdir();

  // Write context to temp file to avoid shell escaping issues
  // Use mode 0600 for security (owner read/write only)
  const contextFile = join(tempDir, `claude-context-${options.sessionId}.txt`);
  writeFileSync(contextFile, options.contextPrompt, { mode: 0o600 });

  // Write prompt to temp file to avoid shell injection via eval
  const promptFile = join(tempDir, `claude-prompt-${options.sessionId}.txt`);
  writeFileSync(promptFile, options.prompt, { mode: 0o600 });

  // Build plugin-dir flags if provided
  const pluginDirFlags = pluginDirs.map((dir) => `--plugin-dir "${dir}"`).join(' ');

  // Write a wrapper script that reads all values from files/args
  // This avoids shell interpolation vulnerabilities
  const wrapperScript = join(tempDir, `claude-wrapper-${options.sessionId}.sh`);
  const scriptContent = `#!/bin/bash
set -euo pipefail

LOG_FILE="$1"
CONTEXT_FILE="$2"
TIMEOUT="$3"
MODEL="$4"
TOOLS="$5"
PROMPT_FILE="$6"
CWD="$7"
WRAPPER_SCRIPT="$8"
PLUGIN_DIR_FLAGS="$9"

# Cleanup function - ensures temp files are removed even on signals
cleanup() {
  rm -f "$CONTEXT_FILE" "$PROMPT_FILE" "$WRAPPER_SCRIPT"
}
trap cleanup EXIT INT TERM

echo "[$(date -u +%Y%m%dT%H%M%SZ)] Starting memory capture with context..." >> "$LOG_FILE"
echo "[$(date -u +%Y%m%dT%H%M%SZ)] Plugin dirs: $PLUGIN_DIR_FLAGS" >> "$LOG_FILE"

cd "$CWD"

# Read context and prompt files safely into variables (avoids command substitution vulnerabilities)
# shellcheck disable=SC2155
export CLAUDE_CONTEXT_PROMPT
CLAUDE_CONTEXT_PROMPT=$(<"$CONTEXT_FILE")
CLAUDE_PROMPT=$(<"$PROMPT_FILE")

# Build command as array to avoid eval and shell injection
# Using array prevents any shell metacharacter interpretation
CLAUDE_ARGS=(
  --model "$MODEL"
  --permission-mode bypassPermissions
  --dangerously-skip-permissions
  --output-format stream-json
  --verbose
  --append-system-prompt "$CLAUDE_CONTEXT_PROMPT"
  --tools "$TOOLS"
)

# Add plugin-dir flags if provided (split on space for multiple dirs)
if [ -n "$PLUGIN_DIR_FLAGS" ]; then
  # shellcheck disable=SC2206
  CLAUDE_ARGS+=($PLUGIN_DIR_FLAGS)
fi

CLAUDE_ARGS+=(--print "$CLAUDE_PROMPT")

timeout "\${TIMEOUT}s" claude "\${CLAUDE_ARGS[@]}" 2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=\${PIPESTATUS[0]}
echo "---" >> "$LOG_FILE"
echo "Completed with exit code: $EXIT_CODE" >> "$LOG_FILE"
echo "=== Finished: $(date -u +%Y%m%dT%H%M%SZ) ===" >> "$LOG_FILE"
# Cleanup handled by EXIT trap
`;
  writeFileSync(wrapperScript, scriptContent, { mode: 0o755 });

  // Launch detached background process with arguments passed safely
  const { spawn: nodeSpawn } = await import('node:child_process');
  const proc = nodeSpawn(
    wrapperScript,
    [
      logFile,
      contextFile,
      String(timeoutSecs),
      model,
      tools,
      promptFile,
      cwd,
      wrapperScript,
      pluginDirFlags,
    ],
    {
      cwd: cwd,
      detached: true,
      stdio: 'ignore',
    }
  );

  // Unref to allow process to continue independently
  proc.unref();

  return {
    started: true,
    logFile,
  };
}
