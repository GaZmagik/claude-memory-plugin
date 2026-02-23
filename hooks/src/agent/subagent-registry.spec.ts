/**
 * Tests for SubagentRegistry
 *
 * Manages per-subagent temp files to avoid the shared-file race condition
 * when multiple agents run concurrently. Each subagent gets an isolated file,
 * atomically claimed by the first consumer (PostToolUse or SessionEnd).
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  SUBAGENT_TEMP_PREFIX,
  SUBAGENT_CLAIMED_PREFIX,
  buildSubagentTempPath,
  writeSubagentEntry,
  findAndClaimSubagent,
  findAnyUnclaimedSubagent,
  listUnclaimedSubagents,
} from './subagent-registry.ts';
import type { SubagentEntry } from './subagent-registry.ts';

function cleanupTestFiles() {
  try {
    readdirSync(tmpdir())
      .filter(
        (f) =>
          f.startsWith('.claude-memory-plugin-subagent-') ||
          f.startsWith('.claude-memory-plugin-claimed-')
      )
      .forEach((f) => {
        try {
          unlinkSync(join(tmpdir(), f));
        } catch {
          // Ignore
        }
      });
  } catch {
    // Ignore
  }
}

describe('subagent-registry', () => {
  beforeEach(() => cleanupTestFiles());
  afterEach(() => cleanupTestFiles());

  // ─── Constants ─────────────────────────────────────────────────────────────

  describe('constants', () => {
    it('SUBAGENT_TEMP_PREFIX uses plugin-namespaced path in tmpdir', () => {
      expect(SUBAGENT_TEMP_PREFIX).toBe(
        join(tmpdir(), '.claude-memory-plugin-subagent-')
      );
    });

    it('SUBAGENT_CLAIMED_PREFIX uses plugin-namespaced path in tmpdir', () => {
      expect(SUBAGENT_CLAIMED_PREFIX).toBe(
        join(tmpdir(), '.claude-memory-plugin-claimed-')
      );
    });
  });

  // ─── buildSubagentTempPath ──────────────────────────────────────────────────

  describe('buildSubagentTempPath', () => {
    it('builds path with agentType and agentId', () => {
      const result = buildSubagentTempPath('python-expert', 'abc-123');
      expect(result).toBe(
        join(tmpdir(), '.claude-memory-plugin-subagent-python-expert-abc-123')
      );
    });

    it('sanitises agentType to prevent path traversal', () => {
      const result = buildSubagentTempPath('../evil', 'abc123');
      expect(result).not.toContain('..');
    });

    it('sanitises agentId to prevent path traversal', () => {
      const result = buildSubagentTempPath('safe-agent', '../../etc/passwd');
      expect(result).not.toContain('..');
    });
  });

  // ─── writeSubagentEntry ─────────────────────────────────────────────────────

  describe('writeSubagentEntry', () => {
    it('creates a temp file at the expected path', () => {
      writeSubagentEntry('session-uuid-1', 'typescript-expert', 'parent-session-1');
      const path = buildSubagentTempPath('typescript-expert', 'session-uuid-1');
      expect(existsSync(path)).toBe(true);
    });

    it('stores agentId, agentType, sessionId and timestamp as JSON', () => {
      writeSubagentEntry('session-uuid-2', 'python-expert', 'parent-session-2');
      const path = buildSubagentTempPath('python-expert', 'session-uuid-2');
      const entry: SubagentEntry = JSON.parse(readFileSync(path, 'utf-8'));
      expect(entry.agentId).toBe('session-uuid-2');
      expect(entry.agentType).toBe('python-expert');
      expect(entry.sessionId).toBe('parent-session-2');
      expect(typeof entry.timestamp).toBe('string');
    });

    it('two concurrent agents write to separate files', () => {
      writeSubagentEntry('uuid-a', 'python-expert', 'parent-a');
      writeSubagentEntry('uuid-b', 'typescript-expert', 'parent-b');
      expect(existsSync(buildSubagentTempPath('python-expert', 'uuid-a'))).toBe(true);
      expect(existsSync(buildSubagentTempPath('typescript-expert', 'uuid-b'))).toBe(true);
    });
  });

  // ─── findAndClaimSubagent ───────────────────────────────────────────────────

  describe('findAndClaimSubagent', () => {
    it('returns null when no entries exist for the given agentType', () => {
      const result = findAndClaimSubagent('non-existent-agent');
      expect(result).toBeNull();
    });

    it('returns entry with correct fields when found', () => {
      writeSubagentEntry('session-uuid-3', 'typescript-expert', 'parent-session-3');
      const result = findAndClaimSubagent('typescript-expert');
      expect(result).not.toBeNull();
      expect(result?.agentId).toBe('session-uuid-3');
      expect(result?.agentType).toBe('typescript-expert');
      expect(result?.sessionId).toBe('parent-session-3');
    });

    it('removes the unclaimed temp file on successful claim', () => {
      writeSubagentEntry('session-uuid-4', 'rust-expert', 'parent-session-4');
      findAndClaimSubagent('rust-expert');
      const path = buildSubagentTempPath('rust-expert', 'session-uuid-4');
      expect(existsSync(path)).toBe(false);
    });

    it('creates a claimed marker file on successful claim', () => {
      writeSubagentEntry('session-uuid-5', 'rust-expert', 'parent-session-5');
      findAndClaimSubagent('rust-expert');
      const claimedPath = join(
        tmpdir(),
        '.claude-memory-plugin-claimed-rust-expert-session-uuid-5'
      );
      expect(existsSync(claimedPath)).toBe(true);
    });

    it('only claims entries matching the given agentType', () => {
      writeSubagentEntry('uuid-6a', 'python-expert', 'parent-6a');
      writeSubagentEntry('uuid-6b', 'typescript-expert', 'parent-6b');
      const result = findAndClaimSubagent('python-expert');
      expect(result?.agentType).toBe('python-expert');
      // typescript-expert entry must remain unclaimed
      expect(existsSync(buildSubagentTempPath('typescript-expert', 'uuid-6b'))).toBe(true);
    });

    it('returns null when all matching entries have already been claimed', () => {
      writeSubagentEntry('session-uuid-7', 'python-expert', 'parent-session-7');
      findAndClaimSubagent('python-expert');   // first claim
      const second = findAndClaimSubagent('python-expert'); // nothing left
      expect(second).toBeNull();
    });
  });

  // ─── findAnyUnclaimedSubagent ───────────────────────────────────────────────

  describe('findAnyUnclaimedSubagent', () => {
    it('returns null when no unclaimed entries exist', () => {
      const result = findAnyUnclaimedSubagent();
      expect(result).toBeNull();
    });

    it('returns an entry without filtering by agentType', () => {
      writeSubagentEntry('uuid-a1', 'subagent', '');
      const result = findAnyUnclaimedSubagent();
      expect(result).not.toBeNull();
      expect(result?.agentId).toBe('uuid-a1');
    });

    it('removes the unclaimed file after claiming', () => {
      writeSubagentEntry('uuid-a2', 'subagent', '');
      findAnyUnclaimedSubagent();
      expect(existsSync(buildSubagentTempPath('subagent', 'uuid-a2'))).toBe(false);
    });

    it('returns null when all entries have already been claimed', () => {
      writeSubagentEntry('uuid-a3', 'subagent', '');
      findAnyUnclaimedSubagent();
      expect(findAnyUnclaimedSubagent()).toBeNull();
    });
  });

  // ─── listUnclaimedSubagents ─────────────────────────────────────────────────

  describe('listUnclaimedSubagents', () => {
    it('returns empty array when no unclaimed entries exist', () => {
      const result = listUnclaimedSubagents();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('returns all unclaimed entries across agent types', () => {
      writeSubagentEntry('uuid-8a', 'python-expert', 'parent-8a');
      writeSubagentEntry('uuid-8b', 'typescript-expert', 'parent-8b');
      const result = listUnclaimedSubagents();
      expect(result.length).toBe(2);
    });

    it('excludes already-claimed entries', () => {
      writeSubagentEntry('uuid-9a', 'python-expert', 'parent-9a');
      writeSubagentEntry('uuid-9b', 'typescript-expert', 'parent-9b');
      findAndClaimSubagent('python-expert');
      const result = listUnclaimedSubagents();
      expect(result.length).toBe(1);
      expect(result[0]?.agentType).toBe('typescript-expert');
    });

    it('skips malformed JSON files without throwing', () => {
      // Manually write a broken file
      writeFileSync(
        join(tmpdir(), '.claude-memory-plugin-subagent-broken-agent-bad-uuid'),
        'not-valid-json'
      );
      expect(() => listUnclaimedSubagents()).not.toThrow();
    });
  });
});
