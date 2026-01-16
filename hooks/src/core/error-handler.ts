/**
 * Error Handler Utilities for Claude Code Hooks
 *
 * Wrapper utilities for consistent error handling across all hooks.
 */

import type { HookInput, HookOutput, ExitCode } from './types.ts';
import { EXIT_ALLOW, EXIT_BLOCK } from './types.ts';
import { HookError, toHookError } from './errors.ts';
import { parseHookInput, outputHookResponse } from './stdin.ts';
import { createHookLogger } from './hook-logger.ts';
import { basename, dirname } from 'path';
import { unlinkSync, existsSync } from 'fs';

/**
 * Cleanup registry for signal handlers
 * Tracks temp files and cleanup functions to run on SIGTERM/SIGINT
 */
const cleanupRegistry: {
  tempFiles: Set<string>;
  cleanupFns: Set<() => void>;
} = {
  tempFiles: new Set(),
  cleanupFns: new Set(),
};

/**
 * Register a temp file for cleanup on signal
 */
export function registerTempFile(filePath: string): void {
  cleanupRegistry.tempFiles.add(filePath);
}

/**
 * Unregister a temp file (call after successful cleanup)
 */
export function unregisterTempFile(filePath: string): void {
  cleanupRegistry.tempFiles.delete(filePath);
}

/**
 * Register a cleanup function to run on signal
 */
export function registerCleanup(fn: () => void): void {
  cleanupRegistry.cleanupFns.add(fn);
}

/**
 * Unregister a cleanup function
 */
export function unregisterCleanup(fn: () => void): void {
  cleanupRegistry.cleanupFns.delete(fn);
}

/**
 * Run all registered cleanup operations
 */
function runCleanup(): void {
  // Clean up temp files
  for (const filePath of cleanupRegistry.tempFiles) {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // Ignore cleanup errors - we're shutting down anyway
    }
  }
  cleanupRegistry.tempFiles.clear();

  // Run cleanup functions
  for (const fn of cleanupRegistry.cleanupFns) {
    try {
      fn();
    } catch {
      // Ignore cleanup errors
    }
  }
  cleanupRegistry.cleanupFns.clear();
}

// Track if signal handlers are installed
let signalHandlersInstalled = false;

/**
 * Install process signal handlers for graceful shutdown
 */
function installSignalHandlers(): void {
  if (signalHandlersInstalled) return;
  signalHandlersInstalled = true;

  const handleSignal = (signal: string) => {
    runCleanup();
    // Re-raise signal for default handling (exit)
    process.exit(signal === 'SIGTERM' ? 143 : 130);
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));

  // Handle uncaught errors gracefully
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception in hook:', error.message);
    runCleanup();
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection in hook:', reason);
    runCleanup();
    process.exit(1);
  });
}

/**
 * Extract hook name and type from the script path
 */
function getHookInfo(): { name: string; type: string } {
  const scriptPath = process.argv[1] || 'unknown';
  const name = basename(scriptPath, '.ts');
  const parentDir = basename(dirname(scriptPath));

  // Map directory names to hook types
  const typeMap: Record<string, string> = {
    'pre-tool-use': 'PreToolUse',
    'post-tool-use': 'PostToolUse',
    'user-prompt-submit': 'UserPromptSubmit',
    'session': 'Session',
    'subagent-stop': 'SubagentStop',
  };

  const type = typeMap[parentDir] || parentDir;
  return { name, type };
}

/**
 * Result type for hook operations
 */
export interface HookResult {
  exitCode: ExitCode;
  output?: HookOutput;
  error?: HookError;
}

/**
 * Hook handler function type
 */
export type HookHandler = (input: HookInput) => Promise<HookResult>;

/**
 * Create a successful allow result
 */
export function allow(additionalContext?: string): HookResult {
  return {
    exitCode: EXIT_ALLOW,
    output: additionalContext
      ? { hookSpecificOutput: { hookEventName: 'success', additionalContext } }
      : undefined,
  };
}

/**
 * Create a successful allow result that always outputs JSON
 * Use this for UserPromptSubmit hooks which require valid JSON output
 */
export function allowWithOutput(additionalContext?: string): HookResult {
  return {
    exitCode: EXIT_ALLOW,
    output: {
      hookSpecificOutput: {
        hookEventName: 'success',
        additionalContext: additionalContext || '',
      },
    },
  };
}

/**
 * Create a block result with message
 */
export function block(message: string): HookResult {
  return {
    exitCode: EXIT_BLOCK,
    error: HookError.protection(message),
  };
}

/**
 * Create a warn result (exit 1)
 */
export function warn(message: string): HookResult {
  return {
    exitCode: 1,
    error: HookError.configuration(message),
  };
}

/**
 * Check if this is a session-type hook (SessionStart, SessionEnd, etc.)
 * Session hooks should output plain text, not JSON with hookSpecificOutput
 */
function isSessionHook(type: string): boolean {
  return type === 'Session' || type.startsWith('Session');
}

/**
 * Check if this hook is running in a forked session context.
 *
 * Forked sessions (created via `claude --fork-session`) have permission_mode: "default"
 * whereas normal sessions have permission_mode: "bypassPermissions".
 *
 * Hooks should typically skip processing for forked sessions to prevent:
 * - Infinite recursion (hooks spawning forks that trigger hooks)
 * - Blocking the forked session (hooks like memory-context make API calls)
 * - Unnecessary processing (forks are ephemeral, short-lived sessions)
 *
 * @param input - The hook input from stdin
 * @returns true if running in a forked session
 */
export function isForkedSession(input: HookInput): boolean {
  return input.permission_mode === 'default';
}

/**
 * Wrap a hook handler with error handling and I/O
 *
 * This is the main entry point for creating hooks. It handles:
 * - Reading and parsing stdin
 * - Calling the handler
 * - Writing output to stdout
 * - Error handling and exit codes
 *
 * @example
 * ```typescript
 * import { runHook, allow, block } from './lib/error-handler.js';
 *
 * runHook(async (input) => {
 *   if (input.tool_input.file_path?.includes('.claude/memory/')) {
 *     return block('Cannot write to memory directory');
 *   }
 *   return allow();
 * });
 * ```
 */
export async function runHook(handler: HookHandler): Promise<never> {
  // Install signal handlers for graceful shutdown
  installSignalHandlers();

  let exitCode: ExitCode = EXIT_ALLOW;
  const { name, type } = getHookInfo();
  const logger = createHookLogger(name, type);

  try {
    // Parse input from stdin
    const input = await parseHookInput();

    // Skip processing for forked sessions to prevent blocking/recursion
    // Forked sessions have permission_mode: "default" (vs "bypassPermissions" for normal)
    if (input && isForkedSession(input)) {
      logger.start(input, input?.tool_name);
      logger.end(EXIT_ALLOW, undefined);
      process.exit(EXIT_ALLOW);
    }

    logger.start(input, input?.tool_name);

    // Handle null input (empty stdin)
    if (!input) {
      logger.end(EXIT_ALLOW, undefined);
      process.exit(EXIT_ALLOW);
    }

    // Run the handler
    const result = await handler(input);
    exitCode = result.exitCode;

    // Output any hook-specific response
    // Claude Code requires hookEventName to match the hook type exactly
    if (result.output) {
      if (isSessionHook(type)) {
        // Session hooks: output plain text that gets added to context
        // (Claude Code's schema doesn't support hookEventName for SessionStart/SessionEnd)
        const context = result.output.hookSpecificOutput?.additionalContext;
        if (context) {
          console.log(context);
        }
      } else if (result.output.hookSpecificOutput) {
        // Fix hookEventName to match the actual hook type (not "success")
        // Claude Code only accepts: PreToolUse, UserPromptSubmit, PostToolUse
        const fixedOutput: HookOutput = {
          ...result.output,
          hookSpecificOutput: {
            ...result.output.hookSpecificOutput,
            hookEventName: type, // Use actual hook type, not "success"
          },
        };
        outputHookResponse(fixedOutput);
      } else {
        outputHookResponse(result.output);
      }
    }

    // Output error message to stderr if present
    if (result.error) {
      console.error(result.error.toStderr());
    }

    logger.end(exitCode, result.output);
  } catch (error) {
    const hookError = toHookError(error);
    exitCode = hookError.exitCode;
    logger.error(error);
    console.error(hookError.toStderr());
  }

  process.exit(exitCode);
}

/**
 * Wrap an async operation with timeout
 */
export async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(HookError.timeout(timeoutMessage)), timeoutMs);
  });

  return Promise.race([operation, timeoutPromise]);
}

/**
 * Safe wrapper that catches errors and returns a default value
 */
export async function safeOperation<T>(
  operation: () => Promise<T>,
  defaultValue: T,
  onError?: (error: HookError) => void
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const hookError = toHookError(error);
    onError?.(hookError);
    return defaultValue;
  }
}

/**
 * Execute multiple operations in parallel, collecting results
 */
export async function parallel<T>(
  operations: Array<() => Promise<T>>
): Promise<Array<T | HookError>> {
  const results = await Promise.allSettled(operations.map((op) => op()));

  return results.map((result) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return toHookError(result.reason);
  });
}
