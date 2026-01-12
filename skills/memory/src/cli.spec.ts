/**
 * CLI Entry Point E2E Tests
 *
 * Tests the actual CLI binary by spawning processes.
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'bun';
import * as path from 'node:path';

const CLI_PATH = path.join(import.meta.dir, 'cli.ts');

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn(['bun', CLI_PATH, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

describe('CLI Entry Point E2E', () => {
  describe('help command', () => {
    it('displays help with no arguments', async () => {
      const { stdout, exitCode } = await runCli([]);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Memory Skill');
      expect(stdout).toContain('COMMANDS:');
    });

    it('displays help with help command', async () => {
      const { stdout, exitCode } = await runCli(['help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('COMMANDS:');
    });

    it('displays full help with help --full', async () => {
      const { stdout, exitCode } = await runCli(['help', '--full']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('COMMANDS:');
      // Full help has more detail
      expect(stdout.length).toBeGreaterThan(1000);
    });
  });

  describe('unknown command handling', () => {
    it('returns error for unknown command', async () => {
      const { stdout, exitCode } = await runCli(['nonsense-command']);

      // Unknown commands return exit code 1
      expect(exitCode).toBe(1);
      expect(stdout).toContain('error');
      expect(stdout).toContain('Unknown command');
    });
  });

  describe('command routing', () => {
    it('routes to read command with non-existent memory', async () => {
      const { stdout, exitCode } = await runCli(['read', 'non-existent-id']);

      // CLI returns 0, wraps response - error is nested in data
      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.status).toBe('success');
      expect(result.data.status).toBe('error');
      expect(result.data.error).toContain('not found');
    });

    it('routes to list command', async () => {
      const { stdout, exitCode } = await runCli(['list']);

      expect(exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.status).toBe('success');
    });

    it('routes to health command', async () => {
      const { stdout, exitCode } = await runCli(['health']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('success');
    });

    it('routes to status command', async () => {
      const { exitCode } = await runCli(['status']);

      expect(exitCode).toBe(0);
    });
  });

  describe('JSON output format', () => {
    it('outputs valid JSON for list command', async () => {
      const { stdout, exitCode } = await runCli(['list']);

      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();

      const result = JSON.parse(stdout);
      expect(result).toHaveProperty('status');
    });

    it('outputs valid JSON for error responses', async () => {
      const { stdout, exitCode } = await runCli(['read', 'does-not-exist']);

      // CLI returns 0, error is nested in response
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();

      const result = JSON.parse(stdout);
      expect(result.status).toBe('success');
      expect(result.data.status).toBe('error');
    });
  });
});
