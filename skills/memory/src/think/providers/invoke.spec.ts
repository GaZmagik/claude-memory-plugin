/**
 * Unit tests for invoke.ts
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { mock } from 'bun:test';
import type { ProviderCommand } from '../../types/provider-config.js';
import * as codexParser from './codex-parser.js';
import * as geminiParser from './gemini-parser.js';
import * as errors from './errors.js';

// Mock child_process before imports that depend on it
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';
import { invokeProviderCli, DEFAULT_TIMEOUT_MS } from './invoke.js';

const mockExecFile = execFile as unknown as ReturnType<typeof vi.fn>;

/** Helper: make mockExecFile call callback with success */
function mockSuccess(stdout: string) {
  mockExecFile.mockImplementation(
    (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      (cb as (err: null, stdout: string, stderr: string) => void)(null, stdout, '');
    }
  );
}

/** Helper: make mockExecFile call callback with error */
function mockError(errorProps: Record<string, unknown>) {
  const stderrVal = errorProps.stderr;
  mockExecFile.mockImplementation(
    (_bin: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      const err = Object.assign(new Error('exec error'), errorProps);
      (cb as (err: Error, stdout: string, stderr: unknown) => void)(err, '', stderrVal);
    }
  );
}

describe('invokeProviderCli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mock.restore(); // Unmock vi.mock module replacements to prevent cross-test pollution
  });

  describe('successful execution', () => {
    it('executes command and returns result for claude provider', async () => {
      mockSuccess('Claude response');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = await invokeProviderCli(command, 'claude', 'claude-sonnet-4');

      expect(mockExecFile).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          encoding: 'utf-8',
          timeout: 30000,
        }),
        expect.any(Function)
      );

      expect(result.content).toBe('Claude response');
      expect(result.provider).toBe('claude');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('uses DEFAULT_TIMEOUT_MS when command.timeout not provided', async () => {
      mockSuccess('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test']
      };

      await invokeProviderCli(command, 'claude');

      expect(mockExecFile).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          timeout: DEFAULT_TIMEOUT_MS
        }),
        expect.any(Function)
      );
    });

    it('parses codex output when provider is codex', async () => {
      mockSuccess('raw codex output');
      vi.spyOn(codexParser, 'parseCodexOutput').mockReturnValue('parsed codex');

      const command: ProviderCommand = {
        binary: 'codex',
        args: ['exec', 'test'],
        timeout: 120000
      };

      const result = await invokeProviderCli(command, 'codex', 'gpt-5-codex');

      expect(codexParser.parseCodexOutput).toHaveBeenCalledWith('raw codex output');
      expect(result.content).toBe('parsed codex');
      expect(result.provider).toBe('codex');
    });

    it('parses gemini output when provider is gemini', async () => {
      mockSuccess('raw gemini output');
      vi.spyOn(geminiParser, 'parseGeminiOutput').mockReturnValue('parsed gemini');

      const command: ProviderCommand = {
        binary: 'gemini',
        args: ['test', '--debug'],
        timeout: 120000
      };

      const result = await invokeProviderCli(command, 'gemini', 'gemini-2.5-pro');

      expect(geminiParser.parseGeminiOutput).toHaveBeenCalledWith('raw gemini output');
      expect(result.content).toBe('parsed gemini');
      expect(result.provider).toBe('gemini');
    });

    it('trims whitespace from output', async () => {
      mockSuccess('  output with spaces  \n');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = await invokeProviderCli(command, 'claude');

      expect(result.content).toBe('output with spaces');
    });

    it('passes custom environment variables when provided', async () => {
      mockSuccess('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000,
        env: { CUSTOM_VAR: 'value' }
      };

      await invokeProviderCli(command, 'claude');

      expect(mockExecFile).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          env: expect.objectContaining({ CUSTOM_VAR: 'value' })
        }),
        expect.any(Function)
      );
    });

    it('omits env when not provided', async () => {
      mockSuccess('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      await invokeProviderCli(command, 'claude');

      expect(mockExecFile).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          env: undefined
        }),
        expect.any(Function)
      );
    });
  });

  describe('timeout handling', () => {
    it('detects timeout when process is killed', async () => {
      mockError({ killed: true, status: null, stderr: 'timeout error' });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Provider timeout after 30s');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = await invokeProviderCli(command, 'claude', 'claude-sonnet-4');

      expect(result.content).toBe('');
      expect(result.provider).toBe('claude');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.timedOut).toBe(true);
      expect(result.error).toBe('Provider timeout after 30s');
      expect(errors.formatProviderError).toHaveBeenCalledWith('claude', 'timeout', 30);
    });

    it('uses command timeout in error message', async () => {
      mockError({ killed: true, status: null, stderr: '' });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Timeout');

      const command: ProviderCommand = {
        binary: 'gemini',
        args: ['test'],
        timeout: 120000
      };

      await invokeProviderCli(command, 'gemini');

      expect(errors.formatProviderError).toHaveBeenCalledWith('gemini', 'timeout', 120);
    });
  });

  describe('error handling', () => {
    it('handles execution errors with stderr as string', async () => {
      mockError({ status: 1, stderr: 'Command not found', killed: false });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Provider error: Command not found');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = await invokeProviderCli(command, 'claude', 'claude-sonnet-4');

      expect(result.content).toBe('');
      expect(result.provider).toBe('claude');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.timedOut).toBeUndefined();
      expect(result.error).toBe('Provider error: Command not found');
      expect(errors.formatProviderError).toHaveBeenCalledWith(
        'claude',
        'error',
        undefined,
        'Command not found'
      );
    });

    it('handles execution errors with stderr as Buffer', async () => {
      mockError({ status: 1, stderr: Buffer.from('Buffer error message'), killed: false });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Provider error');

      const command: ProviderCommand = {
        binary: 'codex',
        args: ['exec', 'test'],
        timeout: 120000
      };

      const result = await invokeProviderCli(command, 'codex');

      expect(result.error).toBe('Provider error');
      expect(errors.formatProviderError).toHaveBeenCalledWith(
        'codex',
        'error',
        undefined,
        'Buffer error message'
      );
    });

    it('handles errors with no stderr', async () => {
      mockError({ status: 1, killed: false });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Unknown error');

      const command: ProviderCommand = {
        binary: 'gemini',
        args: ['test'],
        timeout: 120000
      };

      await invokeProviderCli(command, 'gemini');

      expect(errors.formatProviderError).toHaveBeenCalledWith(
        'gemini',
        'error',
        undefined,
        'Unknown error'
      );
    });

    it('handles errors with empty stderr', async () => {
      mockError({ status: 1, stderr: '', killed: false });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Unknown error');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      await invokeProviderCli(command, 'claude');

      expect(errors.formatProviderError).toHaveBeenCalledWith(
        'claude',
        'error',
        undefined,
        'Unknown error'
      );
    });
  });

  describe('duration tracking', () => {
    it('tracks execution duration for successful calls', async () => {
      mockSuccess('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = await invokeProviderCli(command, 'claude');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('tracks execution duration for timeouts', async () => {
      mockError({ killed: true, status: null, stderr: '' });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Timeout');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const timeoutResult = await invokeProviderCli(command, 'claude');

      expect(timeoutResult.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof timeoutResult.durationMs).toBe('number');
    });

    it('tracks execution duration for errors', async () => {
      mockError({ status: 1, stderr: 'error', killed: false });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Error');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = await invokeProviderCli(command, 'claude');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });
  });
});
