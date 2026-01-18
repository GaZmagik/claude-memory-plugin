/**
 * Error Types for Claude Code Hooks
 *
 * Structured error handling with categorisation and exit code mapping.
 */

import type { ExitCode } from './types.ts';
import { EXIT_CODES } from './constants.ts';

/**
 * Error categories for hooks
 */
export type HookErrorCategory =
  | 'validation'      // Input validation failures
  | 'protection'      // Protected resource access attempts
  | 'timeout'         // Operation timeouts
  | 'ollama'          // Ollama API errors
  | 'parse'           // JSON parsing errors
  | 'filesystem'      // File system errors
  | 'configuration'   // Configuration errors
  | 'internal';       // Internal/unexpected errors

/**
 * Custom error class for hook operations
 */
export class HookError extends Error {
  readonly category: HookErrorCategory;
  readonly exitCode: ExitCode;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    category: HookErrorCategory,
    exitCode: ExitCode = EXIT_CODES.BLOCK as ExitCode,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HookError';
    this.category = category;
    this.exitCode = exitCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HookError);
    }
  }

  /**
   * Create a validation error (typically blocks operation)
   */
  static validation(message: string, details?: Record<string, unknown>): HookError {
    return new HookError(message, 'validation', EXIT_CODES.BLOCK as ExitCode, details);
  }

  /**
   * Create a protection error (always blocks operation)
   */
  static protection(message: string, details?: Record<string, unknown>): HookError {
    return new HookError(message, 'protection', EXIT_CODES.BLOCK as ExitCode, details);
  }

  /**
   * Create a timeout error (typically warns but allows)
   */
  static timeout(message: string, details?: Record<string, unknown>): HookError {
    return new HookError(message, 'timeout', EXIT_CODES.WARN as ExitCode, details);
  }

  /**
   * Create an Ollama error (graceful degradation - allows operation)
   */
  static ollama(message: string, details?: Record<string, unknown>): HookError {
    return new HookError(message, 'ollama', EXIT_CODES.ALLOW as ExitCode, details);
  }

  /**
   * Create a parse error (typically blocks operation)
   */
  static parse(message: string, details?: Record<string, unknown>): HookError {
    return new HookError(message, 'parse', EXIT_CODES.BLOCK as ExitCode, details);
  }

  /**
   * Create a filesystem error (severity depends on context)
   */
  static filesystem(
    message: string,
    exitCode: ExitCode = EXIT_CODES.WARN as ExitCode,
    details?: Record<string, unknown>
  ): HookError {
    return new HookError(message, 'filesystem', exitCode, details);
  }

  /**
   * Create a configuration error (typically warns)
   */
  static configuration(message: string, details?: Record<string, unknown>): HookError {
    return new HookError(message, 'configuration', EXIT_CODES.WARN as ExitCode, details);
  }

  /**
   * Create an internal error (allows operation to prevent blocking on bugs)
   */
  static internal(message: string, details?: Record<string, unknown>): HookError {
    return new HookError(message, 'internal', EXIT_CODES.ALLOW as ExitCode, details);
  }

  /**
   * Format error for stderr output
   */
  toStderr(): string {
    const prefix = this.exitCode === EXIT_CODES.BLOCK ? '🚨' : '⚠️';
    let output = `${prefix} ${this.message}`;

    if (this.details) {
      output += `\n\nDetails: ${JSON.stringify(this.details, null, 2)}`;
    }

    return output;
  }

  /**
   * Convert to JSON for structured logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      exitCode: this.exitCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Check if an error is a HookError
 */
export function isHookError(error: unknown): error is HookError {
  return error instanceof HookError;
}

/**
 * Convert any error to a HookError
 */
export function toHookError(error: unknown): HookError {
  if (isHookError(error)) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return HookError.parse(`JSON parse error: ${error.message}`);
  }

  if (error instanceof Error) {
    return HookError.internal(error.message, { originalError: error.name });
  }

  return HookError.internal(String(error));
}
