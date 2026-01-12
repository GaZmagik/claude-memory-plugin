#!/usr/bin/env bun
/**
 * enforce-memory-cli.ts - Enforce memory CLI for bash memory operations
 *
 * This hook ensures Bash commands that modify .claude/memory/ go through
 * the TypeScript memory CLI (via `bun link`), not direct file operations.
 *
 * Blocks:
 *   - rm, mv, cp on .claude/memory/
 *   - echo/cat redirects to .claude/memory/
 *   - mkdir, touch in .claude/memory/
 *
 * Allows:
 *   - `memory` CLI command (via bun link)
 *   - Direct skills/memory/src/cli.ts invocation
 *   - Read-only operations (ls, cat, head, tail, grep, find)
 *
 * Setup: Run `cd skills/memory && bun link` to expose `memory` command.
 *
 * Exit codes:
 *   0 - Allow
 *   2 - Block
 */

import { runHook, allow, block } from '../src/core/error-handler.ts';

// Patterns that indicate memory directory modification via Bash
const MEMORY_BASH_PATTERNS = [
  /\b(rm|mv|cp)\s+.*\.claude\/memory\//,
  /\bcat\s+.*>\s*.*\.claude\/memory\//,
  /\becho\s+.*>\s*.*\.claude\/memory\//,
  />\s*.*\.claude\/memory\//,
  /\bmkdir\s+.*\.claude\/memory\//,
  /\btouch\s+.*\.claude\/memory\//,
];

// Whitelist patterns - these are allowed
const ALLOWED_BASH_PATTERNS = [
  /\bmemory\s+/,                      // memory CLI command (via bun link)
  /skills\/memory\/src\/cli\.ts/,    // direct CLI invocation
  /\bls\s+.*\.claude\/memory/,       // read-only
  /\bcat\s+[^>]*\.claude\/memory/,   // cat without redirect
  /\bhead\s+.*\.claude\/memory/,     // read-only
  /\btail\s+.*\.claude\/memory/,     // read-only
  /\bgrep\s+.*\.claude\/memory/,     // read-only
  /\bfind\s+.*\.claude\/memory/,     // read-only
];

function checkBashCommand(command: string): { blocked: boolean; pattern?: string } {
  // Check whitelist first
  for (const pattern of ALLOWED_BASH_PATTERNS) {
    if (pattern.test(command)) {
      return { blocked: false };
    }
  }
  // Check blocklist
  for (const pattern of MEMORY_BASH_PATTERNS) {
    if (pattern.test(command)) {
      return { blocked: true, pattern: pattern.source };
    }
  }
  return { blocked: false };
}

const BLOCK_MESSAGE = `🚨 BASH MEMORY MODIFICATION BLOCKED

Direct bash operations on .claude/memory/ are not allowed.
Use the memory CLI instead (requires bun link).

✅ CORRECT - Use the memory CLI:

  # Setup (one time):
  cd skills/memory && bun link

  # Operations:
  echo '{"title":"...", "content":"..."}' | memory write
  memory read <id>
  memory search <query>
  memory link <source> <target> [relation]
  memory delete <id>
  memory list [type]

Or invoke directly:
  skills/memory/src/cli.ts <command> [args]

❌ BLOCKED:
  rm, mv, cp on .claude/memory/
  echo/cat redirects to .claude/memory/
  mkdir, touch in .claude/memory/

✅ ALLOWED (read-only):
  ls, cat, head, tail, grep, find on .claude/memory/`;

runHook(async (input) => {
  // Only check Bash commands
  if (input.tool_name !== 'Bash') {
    return allow();
  }

  const command = input.tool_input?.command as string;
  if (!command) {
    return allow();
  }

  const { blocked, pattern } = checkBashCommand(command);
  if (blocked) {
    return block(`${BLOCK_MESSAGE}

Blocked pattern: ${pattern}
Command: ${command.slice(0, 100)}${command.length > 100 ? '...' : ''}`);
  }

  return allow();
});
