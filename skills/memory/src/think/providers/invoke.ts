/**
 * T084b: Provider CLI Invocation with Timeout
 * Execute provider CLI commands with 30s timeout (FR-045)
 */
import { execFile } from 'node:child_process';
import type { ProviderCommand, ProviderResult, ProviderName } from '../../types/provider-config.js';
import { parseCodexOutput } from './codex-parser.js';
import { parseGeminiOutput } from './gemini-parser.js';
import { formatProviderError } from './errors.js';

/** Default timeout for provider CLI invocations (fallback if command.timeout not set) */
export const DEFAULT_TIMEOUT_MS = 120000;

/** Maximum output length to capture (bytes) */
const MAX_OUTPUT_LENGTH = 10 * 1024 * 1024; // 10MB

/**
 * Invoke a provider CLI and return parsed result
 */
export async function invokeProviderCli(
  command: ProviderCommand,
  provider: ProviderName,
  model?: string
): Promise<ProviderResult> {
  const startTime = Date.now();
  const timeout = command.timeout ?? DEFAULT_TIMEOUT_MS;

  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(command.binary, command.args, {
        encoding: 'utf-8',
        maxBuffer: MAX_OUTPUT_LENGTH,
        timeout,
        env: command.env ? { ...process.env, ...command.env } : undefined,
      }, (error, stdout, stderr) => {
        if (error) {
          // Attach stderr to error for downstream handling
          (error as Record<string, unknown>).stderr = stderr;
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });

    // Parse output based on provider
    let content = stdout.trim();
    if (provider === 'codex') {
      content = parseCodexOutput(content);
    } else if (provider === 'gemini') {
      content = parseGeminiOutput(content);
    }

    return {
      content,
      provider,
      model,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const execError = error as { status?: number; stderr?: Buffer | string; killed?: boolean };
    const stderr = typeof execError.stderr === 'string'
      ? execError.stderr
      : execError.stderr?.toString() ?? '';

    // Check for timeout (killed by signal)
    if (execError.killed) {
      return {
        content: '',
        provider,
        model,
        durationMs: Date.now() - startTime,
        timedOut: true,
        error: formatProviderError(provider, 'timeout', timeout / 1000),
      };
    }

    return {
      content: '',
      provider,
      model,
      durationMs: Date.now() - startTime,
      error: formatProviderError(provider, 'error', undefined, stderr || 'Unknown error'),
    };
  }
}
