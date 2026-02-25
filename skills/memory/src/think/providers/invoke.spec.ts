/**
 * Unit tests for invoke.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invokeProviderCli, DEFAULT_TIMEOUT_MS } from './invoke.js';
import type { ProviderCommand } from '../../types/provider-config.js';
import * as childProcess from 'node:child_process';
import * as codexParser from './codex-parser.js';
import * as geminiParser from './gemini-parser.js';
import * as errors from './errors.js';

describe('invokeProviderCli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful execution', () => {
    it('executes command and returns result for claude provider', () => {
      const mockOutput = 'Claude response';
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue(mockOutput);

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = invokeProviderCli(command, 'claude', 'claude-sonnet-4');

      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          encoding: 'utf-8',
          timeout: 30000,
          stdio: ['pipe', 'pipe', 'pipe']
        })
      );

      expect(result.content).toBe('Claude response');
      expect(result.provider).toBe('claude');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('uses DEFAULT_TIMEOUT_MS when command.timeout not provided', () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test']
      };

      invokeProviderCli(command, 'claude');

      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          timeout: DEFAULT_TIMEOUT_MS
        })
      );
    });

    it('parses codex output when provider is codex', () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('raw codex output');
      vi.spyOn(codexParser, 'parseCodexOutput').mockReturnValue('parsed codex');

      const command: ProviderCommand = {
        binary: 'codex',
        args: ['exec', 'test'],
        timeout: 120000
      };

      const result = invokeProviderCli(command, 'codex', 'gpt-5-codex');

      expect(codexParser.parseCodexOutput).toHaveBeenCalledWith('raw codex output');
      expect(result.content).toBe('parsed codex');
      expect(result.provider).toBe('codex');
    });

    it('parses gemini output when provider is gemini', () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('raw gemini output');
      vi.spyOn(geminiParser, 'parseGeminiOutput').mockReturnValue('parsed gemini');

      const command: ProviderCommand = {
        binary: 'gemini',
        args: ['test', '--debug'],
        timeout: 120000
      };

      const result = invokeProviderCli(command, 'gemini', 'gemini-2.5-pro');

      expect(geminiParser.parseGeminiOutput).toHaveBeenCalledWith('raw gemini output');
      expect(result.content).toBe('parsed gemini');
      expect(result.provider).toBe('gemini');
    });

    it('trims whitespace from output', () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('  output with spaces  \n');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = invokeProviderCli(command, 'claude');

      expect(result.content).toBe('output with spaces');
    });

    it('passes custom environment variables when provided', () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000,
        env: { CUSTOM_VAR: 'value' }
      };

      invokeProviderCli(command, 'claude');

      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          env: expect.objectContaining({ CUSTOM_VAR: 'value' })
        })
      );
    });

    it('omits env when not provided', () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      invokeProviderCli(command, 'claude');

      expect(childProcess.execFileSync).toHaveBeenCalledWith(
        'claude',
        ['--print', 'test'],
        expect.objectContaining({
          env: undefined
        })
      );
    });
  });

  describe('timeout handling', () => {
    it('detects timeout when process is killed', () => {
      const timeoutError = {
        killed: true,
        status: null,
        stderr: Buffer.from('timeout error')
      };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw timeoutError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Provider timeout after 30s');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = invokeProviderCli(command, 'claude', 'claude-sonnet-4');

      expect(result.content).toBe('');
      expect(result.provider).toBe('claude');
      expect(result.model).toBe('claude-sonnet-4');
      expect(result.timedOut).toBe(true);
      expect(result.error).toBe('Provider timeout after 30s');
      expect(errors.formatProviderError).toHaveBeenCalledWith('claude', 'timeout', 30);
    });

    it('uses command timeout in error message', () => {
      const timeoutError = {
        killed: true,
        status: null,
        stderr: ''
      };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw timeoutError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Timeout');

      const command: ProviderCommand = {
        binary: 'gemini',
        args: ['test'],
        timeout: 120000
      };

      invokeProviderCli(command, 'gemini');

      expect(errors.formatProviderError).toHaveBeenCalledWith('gemini', 'timeout', 120);
    });
  });

  describe('error handling', () => {
    it('handles execution errors with stderr as string', () => {
      const execError = {
        status: 1,
        stderr: 'Command not found',
        killed: false
      };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw execError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Provider error: Command not found');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = invokeProviderCli(command, 'claude', 'claude-sonnet-4');

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

    it('handles execution errors with stderr as Buffer', () => {
      const execError = {
        status: 1,
        stderr: Buffer.from('Buffer error message'),
        killed: false
      };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw execError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Provider error');

      const command: ProviderCommand = {
        binary: 'codex',
        args: ['exec', 'test'],
        timeout: 120000
      };

      const result = invokeProviderCli(command, 'codex');

      expect(result.error).toBe('Provider error');
      expect(errors.formatProviderError).toHaveBeenCalledWith(
        'codex',
        'error',
        undefined,
        'Buffer error message'
      );
    });

    it('handles errors with no stderr', () => {
      const execError = {
        status: 1,
        killed: false
      };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw execError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Unknown error');

      const command: ProviderCommand = {
        binary: 'gemini',
        args: ['test'],
        timeout: 120000
      };

      invokeProviderCli(command, 'gemini');

      expect(errors.formatProviderError).toHaveBeenCalledWith(
        'gemini',
        'error',
        undefined,
        'Unknown error'
      );
    });

    it('handles errors with empty stderr', () => {
      const execError = {
        status: 1,
        stderr: '',
        killed: false
      };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw execError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Unknown error');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      invokeProviderCli(command, 'claude');

      expect(errors.formatProviderError).toHaveBeenCalledWith(
        'claude',
        'error',
        undefined,
        'Unknown error'
      );
    });
  });

  describe('duration tracking', () => {
    it('tracks execution duration for successful calls', () => {
      vi.spyOn(childProcess, 'execFileSync').mockReturnValue('output');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = invokeProviderCli(command, 'claude');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('tracks execution duration for timeouts', () => {
      const timeoutError = { killed: true, status: null, stderr: '' };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw timeoutError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Timeout');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const timeoutResult = invokeProviderCli(command, 'claude');

      expect(timeoutResult.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof timeoutResult.durationMs).toBe('number');
    });

    it('tracks execution duration for errors', () => {
      const execError = { status: 1, stderr: 'error', killed: false };
      vi.spyOn(childProcess, 'execFileSync').mockImplementation(() => {
        throw execError;
      });
      vi.spyOn(errors, 'formatProviderError').mockReturnValue('Error');

      const command: ProviderCommand = {
        binary: 'claude',
        args: ['--print', 'test'],
        timeout: 30000
      };

      const result = invokeProviderCli(command, 'claude');

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });
  });
});
