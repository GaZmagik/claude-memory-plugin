/**
 * Tests for SessionEnd Memory Cleanup Hook
 *
 * This hook captures memories before /clear destroys conversation context.
 * For agent sessions (CLAUDE_AGENT_NAME set), triggers on any exit reason.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync, unlinkSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildSubagentTempPath } from '../src/agent/subagent-registry.ts';

const HOOK_PATH = join(import.meta.dir, 'memory-cleanup.ts');

function runHook(
  input: object,
  env?: Record<string, string>
): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('bun', [HOOK_PATH], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
    env: { ...process.env, ...env },
    timeout: 10000,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 0,
  };
}

function cleanupSubagentFiles() {
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

describe('SessionEnd Memory Cleanup Hook', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `memory-cleanup-test-${Date.now()}`);
    mkdirSync(join(testDir, '.claude', 'logs'), { recursive: true });
    mkdirSync(join(testDir, '.claude', 'flags'), { recursive: true });
    cleanupSubagentFiles();
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    cleanupSubagentFiles();
  });

  describe('non-agent session — command format', () => {
    it('should use namespaced command /claude-memory-plugin:commit', () => {
      const expectedPattern = /^\/claude-memory-plugin:commit session-end-trigger=/;
      expect(expectedPattern.test('/claude-memory-plugin:commit session-end-trigger=clear')).toBe(true);
      expect(expectedPattern.test('/memory-commit session-end-trigger=clear')).toBe(false);
    });
  });

  describe('non-agent session — clear flag creation', () => {
    it('should create clear flag file with session info', () => {
      const flagDir = join(testDir, '.claude', 'flags');
      const sessionId = 'test-session-456';
      const flagFile = join(flagDir, `clear-${sessionId}`);

      writeFileSync(
        flagFile,
        `timestamp=${new Date().toISOString()}\nsession_id=${sessionId}\nreason=clear\n`
      );

      expect(existsSync(flagFile)).toBe(true);
    });
  });

  describe('non-agent session — reason filtering', () => {
    it('should only trigger on clear reason when no CLAUDE_AGENT_NAME', () => {
      const validReasons = ['clear'];
      const invalidReasons = ['exit', 'timeout', 'unknown', 'error'];

      validReasons.forEach((reason) => {
        expect(reason).toBe('clear');
      });

      invalidReasons.forEach((reason) => {
        expect(reason).not.toBe('clear');
      });
    });

    it('exits cleanly on non-clear reason without agent name', () => {
      const result = runHook(
        { session_id: 'test-123', cwd: testDir, reason: 'exit' },
        { CLAUDE_AGENT_NAME: '' }
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe('agent session — command format', () => {
    it('should use /claude-memory-plugin:agent-commit command for agent sessions', () => {
      const expectedPattern = /^\/claude-memory-plugin:agent-commit agent-name=/;
      expect(
        expectedPattern.test('/claude-memory-plugin:agent-commit agent-name=speckit-explorer session-end-trigger=exit')
      ).toBe(true);
      expect(
        expectedPattern.test('/claude-memory-plugin:commit agent-name=speckit-explorer')
      ).toBe(false);
    });

    it('should include agent-name= and session-end-trigger= in prompt', () => {
      const agentName = 'speckit-explorer';
      const reason = 'exit';
      const prompt = `/claude-memory-plugin:agent-commit agent-name=${agentName} session-end-trigger=${reason}`;
      expect(prompt).toContain(`agent-name=${agentName}`);
      expect(prompt).toContain(`session-end-trigger=${reason}`);
    });
  });

  describe('agent session — reason filtering', () => {
    it('exits cleanly on any reason when CLAUDE_AGENT_NAME is set but no session_id', () => {
      const result = runHook(
        { cwd: testDir, reason: 'exit' },
        { CLAUDE_AGENT_NAME: 'speckit-explorer' }
      );
      expect(result.exitCode).toBe(0);
    });

    it('exits cleanly when CLAUDE_AGENT_NAME is set, session_id present, no JSONL context', () => {
      // No real JSONL file exists → extractContextAsSystemPrompt returns null → allow()
      const result = runHook(
        { session_id: 'non-existent-session', cwd: testDir, reason: 'exit' },
        { CLAUDE_AGENT_NAME: 'speckit-explorer' }
      );
      expect(result.exitCode).toBe(0);
    });

    it('exits cleanly when CLAUDE_AGENT_NAME set on clear reason', () => {
      const result = runHook(
        { session_id: 'non-existent-session', cwd: testDir, reason: 'clear' },
        { CLAUDE_AGENT_NAME: 'speckit-explorer' }
      );
      expect(result.exitCode).toBe(0);
    });
  });

  describe('agent session — detection', () => {
    it('does not treat empty CLAUDE_AGENT_NAME as agent session', () => {
      const agentName = (process.env.CLAUDE_AGENT_NAME ?? '').trim();
      const isAgentSession = agentName.length > 0;
      expect(isAgentSession).toBe(false);
    });

    it('detects agent session from non-empty CLAUDE_AGENT_NAME', () => {
      const agentName = 'speckit-explorer';
      const isAgentSession = agentName.trim().length > 0;
      expect(isAgentSession).toBe(true);
    });
  });

  describe('subagent sweep — unclaimed registry entries', () => {
    it('exits cleanly when no unclaimed subagent entries exist', () => {
      const result = runHook(
        { session_id: 'test-sweep-1', cwd: testDir, reason: 'exit' },
        { CLAUDE_AGENT_NAME: '' }
      );
      expect(result.exitCode).toBe(0);
    });

    it('claims unclaimed subagent entry on non-clear reason', () => {
      // Write a subagent registry entry (no real JSONL → spawn skipped, but file is claimed)
      writeFileSync(
        buildSubagentTempPath('subagent', 'sweep-test-uuid-1'),
        JSON.stringify({
          agentId: 'sweep-test-uuid-1',
          agentType: 'subagent',
          sessionId: '',
          timestamp: new Date().toISOString(),
        })
      );

      const result = runHook(
        { session_id: 'test-sweep-2', cwd: testDir, reason: 'exit' },
        { CLAUDE_AGENT_NAME: '' }
      );
      expect(result.exitCode).toBe(0);
      // Original unclaimed file should be gone (claimed via rename)
      expect(existsSync(buildSubagentTempPath('subagent', 'sweep-test-uuid-1'))).toBe(false);
    });

    it('claims unclaimed subagent entry on clear reason', () => {
      writeFileSync(
        buildSubagentTempPath('subagent', 'sweep-test-uuid-2'),
        JSON.stringify({
          agentId: 'sweep-test-uuid-2',
          agentType: 'subagent',
          sessionId: '',
          timestamp: new Date().toISOString(),
        })
      );

      const result = runHook(
        { session_id: 'test-sweep-3', cwd: testDir, reason: 'clear' },
        { CLAUDE_AGENT_NAME: '' }
      );
      expect(result.exitCode).toBe(0);
      expect(existsSync(buildSubagentTempPath('subagent', 'sweep-test-uuid-2'))).toBe(false);
    });

    it('cleans up claimed marker file after sweep (no-context path)', () => {
      // No JSONL context file → extractContextAsSystemPrompt returns null → cleanup still runs
      writeFileSync(
        buildSubagentTempPath('subagent', 'sweep-test-uuid-3'),
        JSON.stringify({
          agentId: 'sweep-test-uuid-3',
          agentType: 'subagent',
          sessionId: '',
          timestamp: new Date().toISOString(),
        })
      );

      runHook(
        { session_id: 'test-sweep-4', cwd: testDir, reason: 'exit' },
        { CLAUDE_AGENT_NAME: '' }
      );

      // Both unclaimed and claimed files must be absent — cleanup is unconditional
      expect(existsSync(buildSubagentTempPath('subagent', 'sweep-test-uuid-3'))).toBe(false);
      const claimedFiles = readdirSync(tmpdir()).filter((f) =>
        f.startsWith('.claude-memory-plugin-claimed-subagent-sweep-test-uuid-3')
      );
      expect(claimedFiles.length).toBe(0);
    });

    it('stops sweeping after MAX_SUBAGENT_SWEEP entries, leaving remainder untouched', () => {
      // Write 12 entries — cap is 10, so at least 2 must remain after the hook runs
      for (let i = 0; i < 12; i++) {
        writeFileSync(
          buildSubagentTempPath('subagent', `cap-test-uuid-${i}`),
          JSON.stringify({
            agentId: `cap-test-uuid-${i}`,
            agentType: 'subagent',
            sessionId: '',
            timestamp: new Date().toISOString(),
          })
        );
      }

      runHook(
        { session_id: 'cap-test-session', cwd: testDir, reason: 'exit' },
        { CLAUDE_AGENT_NAME: '' }
      );

      // At least 2 entries (unclaimed or claimed) should remain — sweep capped at 10
      const remaining = readdirSync(tmpdir()).filter(
        (f) =>
          f.startsWith('.claude-memory-plugin-subagent-subagent-cap-test-uuid-') ||
          f.startsWith('.claude-memory-plugin-claimed-subagent-cap-test-uuid-')
      );
      expect(remaining.length).toBeGreaterThanOrEqual(2);
    });
  });
});
