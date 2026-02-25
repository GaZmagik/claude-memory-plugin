/**
 * Tests for PostToolUse:Task Agent Retrospective Hook
 *
 * Tests run the hook as a subprocess (it reads from Bun.stdin).
 * No real session spawning occurs in tests because:
 *   - Without a real JSONL file, extractContextAsSystemPrompt returns null
 *   - The hook gracefully falls back to the reminder message
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  buildSubagentTempPath,
  SUBAGENT_TEMP_PREFIX,
} from '../src/agent/subagent-registry.ts';

const HOOK_PATH = join(import.meta.dir, 'agent-retrospective.ts');

function runHook(input: object, env?: Record<string, string>): { stdout: string; stderr: string; exitCode: number } {
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

function parsedOutput(stdout: string): { systemMessage?: string } | null {
  if (!stdout.trim()) return null;
  try {
    return JSON.parse(stdout.trim());
  } catch {
    return null;
  }
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

describe('Agent Retrospective Hook', () => {
  beforeEach(() => cleanupTestFiles());
  afterEach(() => cleanupTestFiles());

  describe('non-Task tool calls', () => {
    it('exits cleanly when tool_name is not Task', () => {
      const result = runHook({ tool_name: 'Bash', tool_input: {} });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('');
    });

    it('exits cleanly with empty input', () => {
      const result = runHook({});
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('');
    });
  });

  describe('Task tool — no agent detected', () => {
    it('exits cleanly when no agent in args and CLAUDE_AGENT_NAME is unset', () => {
      const result = runHook(
        {
          tool_name: 'Task',
          tool_input: { subagent_type: 'general-purpose', prompt: 'Do some research' },
        },
        { CLAUDE_AGENT_NAME: '' }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('');
    });
  });

  describe('Task tool — agent detected, trivial work', () => {
    it('exits cleanly for Explore subagent type', () => {
      const result = runHook({
        tool_name: 'Task',
        tool_input: {
          subagent_type: 'Explore',
          prompt: 'List files in src',
          args: '--agent Explore',
        },
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('');
    });
  });

  describe('Task tool — agent detected, significant work, no subagent entry', () => {
    it('outputs systemMessage when no subagent registry entry exists', () => {
      const result = runHook({
        tool_name: 'Task',
        tool_input: {
          subagent_type: 'typescript-expert',
          prompt: 'Implement complex TypeScript feature with tests',
          args: '--agent typescript-expert',
        },
        session_id: 'parent-session-123',
        cwd: '/tmp',
      });
      expect(result.exitCode).toBe(0);
      const parsed = parsedOutput(result.stdout);
      expect(parsed).not.toBeNull();
      expect(parsed?.systemMessage).toBeDefined();
      expect((parsed?.systemMessage ?? '').length).toBeGreaterThan(0);
    });

    it('includes agent name in systemMessage', () => {
      const result = runHook({
        tool_name: 'Task',
        tool_input: {
          subagent_type: 'typescript-expert',
          prompt: 'Refactor authentication module with full test coverage',
          args: '--agent typescript-expert',
        },
        session_id: 'parent-session-456',
        cwd: '/tmp',
      });
      const parsed = parsedOutput(result.stdout);
      expect(parsed?.systemMessage).toContain('typescript-expert');
    });
  });

  describe('Task tool — agent detected, significant work, registry entry present but no JSONL', () => {
    beforeEach(() => {
      // Write a per-subagent registry entry with a non-existent session
      writeFileSync(
        buildSubagentTempPath('subagent', 'non-existent-session-uuid'),
        JSON.stringify({
          agentId: 'non-existent-session-uuid',
          agentType: 'subagent',
          sessionId: '',
          timestamp: new Date().toISOString(),
        })
      );
    });

    it('outputs systemMessage without crashing when session JSONL not found', () => {
      const result = runHook({
        tool_name: 'Task',
        tool_input: {
          subagent_type: 'security-code-expert',
          prompt: 'Review authentication code for security vulnerabilities',
          args: '--agent security-code-expert',
        },
        session_id: 'parent-session-789',
        cwd: '/tmp',
      });
      expect(result.exitCode).toBe(0);
      const parsed = parsedOutput(result.stdout);
      expect(parsed).not.toBeNull();
      expect(parsed?.systemMessage).toBeDefined();
      expect(parsed?.systemMessage).toContain('security-code-expert');
    });
  });

  describe('subagent registry integration', () => {
    it('uses plugin-namespaced paths to avoid conflicts with user-level hooks', () => {
      expect(SUBAGENT_TEMP_PREFIX).toContain('.claude-memory-plugin-subagent-');
      expect(SUBAGENT_TEMP_PREFIX.startsWith(tmpdir())).toBe(true);
    });
  });
});
