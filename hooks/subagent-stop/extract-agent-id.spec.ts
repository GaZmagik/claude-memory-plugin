/**
 * Tests for SubagentStop: Extract Agent ID Hook
 *
 * Writes a unique per-subagent file via SubagentRegistry so that concurrent
 * subagents don't overwrite each other. agentType is always 'subagent' since
 * SubagentStop only exposes agent_id.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  buildSubagentTempPath,
  SUBAGENT_TEMP_PREFIX,
} from '../src/agent/subagent-registry.ts';

const HOOK_PATH = join(import.meta.dir, 'extract-agent-id.ts');

function runHook(
  input: object
): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('bun', [HOOK_PATH], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
    timeout: 10000,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 0,
  };
}

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

describe('SubagentStop: extract-agent-id', () => {
  beforeEach(() => cleanupTestFiles());
  afterEach(() => cleanupTestFiles());

  describe('temp file location', () => {
    it('uses plugin-namespaced path in tmpdir', () => {
      expect(SUBAGENT_TEMP_PREFIX.startsWith(tmpdir())).toBe(true);
      expect(SUBAGENT_TEMP_PREFIX).toContain('.claude-memory-plugin-subagent-');
    });

    it('builds unique path per agent_id', () => {
      const pathA = buildSubagentTempPath('subagent', 'uuid-aaa');
      const pathB = buildSubagentTempPath('subagent', 'uuid-bbb');
      expect(pathA).not.toBe(pathB);
    });
  });

  describe('hook execution', () => {
    it('exits cleanly with exit code 0', () => {
      const result = runHook({ agent_id: 'test-uuid-123' });
      expect(result.exitCode).toBe(0);
    });

    it('creates a per-subagent temp file when agent_id is present', () => {
      runHook({ agent_id: 'unique-agent-abc' });
      const path = buildSubagentTempPath('subagent', 'unique-agent-abc');
      expect(existsSync(path)).toBe(true);
    });

    it('does not create a temp file when agent_id is absent', () => {
      runHook({});
      const files = readdirSync(tmpdir()).filter((f) =>
        f.startsWith('.claude-memory-plugin-subagent-')
      );
      expect(files.length).toBe(0);
    });

    it('two concurrent agents create two separate files', () => {
      runHook({ agent_id: 'concurrent-agent-1' });
      runHook({ agent_id: 'concurrent-agent-2' });
      expect(existsSync(buildSubagentTempPath('subagent', 'concurrent-agent-1'))).toBe(true);
      expect(existsSync(buildSubagentTempPath('subagent', 'concurrent-agent-2'))).toBe(true);
    });

    it('second agent does not overwrite first agent file', () => {
      runHook({ agent_id: 'agent-first' });
      runHook({ agent_id: 'agent-second' });
      // Both files must still exist
      expect(existsSync(buildSubagentTempPath('subagent', 'agent-first'))).toBe(true);
      expect(existsSync(buildSubagentTempPath('subagent', 'agent-second'))).toBe(true);
    });
  });

  describe('hook input parsing', () => {
    it('handles missing agent_id gracefully', () => {
      const result = runHook({ session_id: 'some-parent' });
      expect(result.exitCode).toBe(0);
    });

    it('handles null-like hook input gracefully', () => {
      const result = runHook({});
      expect(result.exitCode).toBe(0);
    });
  });
});
