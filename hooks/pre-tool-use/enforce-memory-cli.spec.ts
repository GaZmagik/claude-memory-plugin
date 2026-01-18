/**
 * Tests for enforce-memory-cli hook
 *
 * Ensures Bash commands use the `memory` CLI (via bun link) for memory operations.
 * Blocks direct bash manipulation of .claude/memory/ directory.
 */

import { describe, it, expect } from 'vitest';

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

function checkBashCommand(command: string): { blocked: boolean; reason: string } {
  // Check whitelist first
  for (const pattern of ALLOWED_BASH_PATTERNS) {
    if (pattern.test(command)) {
      return { blocked: false, reason: '' };
    }
  }
  // Check blocklist
  for (const pattern of MEMORY_BASH_PATTERNS) {
    if (pattern.test(command)) {
      return { blocked: true, reason: `Matches: ${pattern.source}` };
    }
  }
  return { blocked: false, reason: '' };
}

describe('enforce-memory-cli bash patterns', () => {
  describe('blocked commands - must use memory CLI instead', () => {
    it('blocks rm on memory directory', () => {
      expect(checkBashCommand('rm -rf .claude/memory/permanent/foo.md').blocked).toBe(true);
      expect(checkBashCommand('rm .claude/memory/index.json').blocked).toBe(true);
    });

    it('blocks mv on memory directory', () => {
      expect(checkBashCommand('mv .claude/memory/old.md .claude/memory/new.md').blocked).toBe(true);
    });

    it('blocks cp to memory directory', () => {
      expect(checkBashCommand('cp /tmp/file.md .claude/memory/permanent/').blocked).toBe(true);
    });

    it('blocks echo redirect to memory', () => {
      expect(checkBashCommand('echo "content" > .claude/memory/permanent/foo.md').blocked).toBe(true);
    });

    it('blocks cat redirect to memory', () => {
      expect(checkBashCommand('cat /tmp/data > .claude/memory/index.json').blocked).toBe(true);
    });

    it('blocks mkdir in memory', () => {
      expect(checkBashCommand('mkdir -p .claude/memory/custom/').blocked).toBe(true);
    });

    it('blocks touch in memory', () => {
      expect(checkBashCommand('touch .claude/memory/permanent/new.md').blocked).toBe(true);
    });
  });

  describe('allowed commands - memory CLI usage', () => {
    it('allows memory CLI command (via bun link)', () => {
      expect(checkBashCommand('memory write < /tmp/input.json').blocked).toBe(false);
      expect(checkBashCommand('memory search "query"').blocked).toBe(false);
      expect(checkBashCommand('memory link foo bar').blocked).toBe(false);
      expect(checkBashCommand('memory delete foo').blocked).toBe(false);
      expect(checkBashCommand('memory read some-id').blocked).toBe(false);
    });

    it('allows direct CLI invocation', () => {
      expect(checkBashCommand('skills/memory/src/cli.ts write').blocked).toBe(false);
      expect(checkBashCommand('./skills/memory/src/cli.ts search test').blocked).toBe(false);
    });
  });

  describe('allowed commands - read-only operations', () => {
    it('allows ls on memory directory', () => {
      expect(checkBashCommand('ls -la .claude/memory/permanent/').blocked).toBe(false);
    });

    it('allows cat without redirect (read-only)', () => {
      expect(checkBashCommand('cat .claude/memory/permanent/foo.md').blocked).toBe(false);
    });

    it('allows head/tail (read-only)', () => {
      expect(checkBashCommand('head -20 .claude/memory/index.json').blocked).toBe(false);
      expect(checkBashCommand('tail -f .claude/memory/index.json').blocked).toBe(false);
    });

    it('allows grep (read-only)', () => {
      expect(checkBashCommand('grep "pattern" .claude/memory/permanent/*.md').blocked).toBe(false);
    });

    it('allows find (read-only)', () => {
      expect(checkBashCommand('find .claude/memory -name "*.md"').blocked).toBe(false);
    });
  });

  describe('allowed commands - unrelated to memory', () => {
    it('allows general bash commands', () => {
      expect(checkBashCommand('git status').blocked).toBe(false);
      expect(checkBashCommand('npm install').blocked).toBe(false);
      expect(checkBashCommand('bun test').blocked).toBe(false);
      expect(checkBashCommand('rm -rf /tmp/test').blocked).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('blocks absolute paths to memory', () => {
      expect(checkBashCommand('rm /home/user/.claude/memory/foo.md').blocked).toBe(true);
    });

    it('blocks home directory paths', () => {
      expect(checkBashCommand('rm ~/.claude/memory/foo.md').blocked).toBe(true);
    });

    it('does not block similar non-memory paths', () => {
      expect(checkBashCommand('rm .claude/config/settings.json').blocked).toBe(false);
      expect(checkBashCommand('rm memory/other/file.md').blocked).toBe(false);
    });

    it('handles complex piped commands', () => {
      // memory CLI piped to is fine
      expect(checkBashCommand('cat /tmp/input.json | memory write').blocked).toBe(false);
    });
  });
});
