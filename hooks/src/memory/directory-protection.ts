/**
 * Directory protection for memory files
 *
 * Prevents accidental modification or deletion of memory files
 * through hooks.
 *
 * SECURITY: Uses absolute path resolution for real paths,
 * and pattern matching for relative/home-based paths
 */

import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Tool operation structure
 */
export interface ToolOperation {
  tool: string;
  command?: string;
  filePath?: string;
  pattern?: string;
  path?: string;
}

/**
 * Protected path patterns for regex matching
 */
const PROTECTED_PATTERNS = [
  /\.claude[\\/]memory\/?/,
  /~[\\/]\.claude[\\/]memory\/?/,
];

/**
 * Check if a path is within protected directories using absolute resolution
 */
function isAbsolutelyProtected(filePath: string): boolean {
  try {
    const resolved = path.resolve(filePath);
    const localMemory = path.resolve('.claude/memory');
    const globalMemory = path.resolve(os.homedir(), '.claude/memory');

    // Use startsWith with separator to prevent false matches
    if (resolved === localMemory || resolved.startsWith(localMemory + path.sep)) {
      return true;
    }
    if (resolved === globalMemory || resolved.startsWith(globalMemory + path.sep)) {
      return true;
    }
  } catch {
    // If resolution fails, fall through to pattern matching
  }

  return false;
}

/**
 * Check if a path is within protected directories
 * Uses both absolute resolution and pattern matching
 */
export function isProtectedPath(filePath: string): boolean {
  // Try absolute resolution first
  if (isAbsolutelyProtected(filePath)) {
    return true;
  }

  // Fall back to pattern matching for relative/home-based paths
  const normalised = filePath.replace(/\\/g, '/');
  for (const pattern of PROTECTED_PATTERNS) {
    if (pattern.test(normalised)) {
      return true;
    }
  }

  return false;
}

/**
 * Destructive commands that should be blocked
 */
const DESTRUCTIVE_COMMANDS = [
  /\brm\s+(-[rf]+\s+)*.*\.claude[\/\\]memory/,
  /\bmv\s+.*\.claude[\/\\]memory/,
  /\bcp\s+.*\.claude[\/\\]memory/,
  /\becho\s+.*>\s*.*\.claude[\/\\]memory/,
  /\bprintf\s+.*>\s*.*\.claude[\/\\]memory/,
  /\btee\s+.*\.claude[\/\\]memory/,
  /\|\s*tee\s+.*\.claude[\/\\]memory/,
  />\s*\.claude[\/\\]memory/,
  />>\s*\.claude[\/\\]memory/,
];

/**
 * Allowed commands (whitelist)
 * These patterns must NOT match commands that pipe/redirect to memory
 */
const ALLOWED_COMMAND_PATTERNS = [
  /\bgit\s+rm\s+--cached\b/,
  /~[\\/]\.claude[\\/]skills[\\/]memory[\\/]memory\.sh/,
  /\.claude[\\/]skills[\\/]memory[\\/]memory\.sh/,
  // Read-only commands - must not have pipe/redirect after memory path
  /\b(cat|head|tail|grep|ls|find|stat|file|wc|sort|uniq|diff)\b/,
];

/**
 * Check if a command is allowed (whitelisted)
 */
function isAllowedCommand(command: string): boolean {
  for (const pattern of ALLOWED_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a command contains a pipe or redirect to memory
 */
function hasPipeToMemory(command: string): boolean {
  // Check for pipes to memory operations
  return /\|\s*(tee|sh|bash)[^|]*\s+.*\.claude[\/\\]memory/.test(command) || /\|\s*tee\s+.*\.claude[\/\\]memory/.test(command);
}

/**
 * Determine if an operation should be blocked
 */
export function shouldBlockOperation(operation: ToolOperation): boolean {
  const { tool, command, filePath } = operation;

  // Check by tool type
  switch (tool) {
    case 'Bash':
      if (!command) return false;

      // Check for pipes to memory FIRST (highest priority)
      if (hasPipeToMemory(command)) {
        return true;
      }

      // Check for destructive commands
      for (const pattern of DESTRUCTIVE_COMMANDS) {
        if (pattern.test(command)) {
          return true;
        }
      }

      // Check if it's an allowed operation (after blocking dangerous patterns)
      if (isAllowedCommand(command)) {
        return false;
      }

      return false;

    case 'Write':
    case 'Edit':
      return filePath ? isProtectedPath(filePath) : false;

    case 'Read':
    case 'Glob':
    case 'Grep':
      // These are read-only operations, always allowed
      return false;

    default:
      return false;
  }
}

/**
 * Check if an operation is explicitly allowed despite being in memory directory
 */
export function isAllowedOperation(operation: ToolOperation): boolean {
  const { tool, command } = operation;

  if (tool !== 'Bash' || !command) {
    return true;
  }

  // Git rm --cached is allowed
  if (/\bgit\s+rm\s+--cached\b/.test(command)) {
    return true;
  }

  // Memory skill commands are allowed
  if (/\.claude[\/\\]skills[\/\\]memory[\/\\]memory\.sh/.test(command)) {
    return true;
  }

  // Read-only commands are allowed
  const readOnlyPattern = /^\s*(cat|head|tail|grep|ls|find|stat|file|wc|sort|uniq|diff)\b/;
  if (readOnlyPattern.test(command)) {
    // But not if they're piping/redirecting TO memory
    if (hasPipeToMemory(command)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Get a human-readable reason why a path is protected
 */
export function getProtectionReason(filePath: string): string {
  if (isProtectedPath(filePath)) {
    return 'This path is in the protected memory directory. Use the memory skill to manage memories.';
  }
  return '';
}
