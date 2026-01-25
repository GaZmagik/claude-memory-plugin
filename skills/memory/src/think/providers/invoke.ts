/**
 * T084b: Provider CLI Invocation with Timeout
 * Execute provider CLI commands with 30s timeout (FR-045)
 */
import { execFileSync } from 'node:child_process';
import type { ProviderCommand, ProviderResult, ProviderName } from '../../types/provider-config.js';
import { parseCodexOutput } from './codex-parser.js';
import { parseGeminiOutput } from './gemini-parser.js';
import { formatProviderError } from './errors.js';

/** Default timeout for provider CLI invocations (30 seconds per FR-045) */
export const DEFAULT_TIMEOUT_MS = 30000;

/** Maximum output length to capture (bytes) */
const MAX_OUTPUT_LENGTH = 10 * 1024 * 1024; // 10MB

/**
 * Invoke a provider CLI and return parsed result
 */
export function invokeProviderCli(
  command: ProviderCommand,
  provider: ProviderName,
  model?: string
): ProviderResult {
  const startTime = Date.now();
  const timeout = command.timeout ?? DEFAULT_TIMEOUT_MS;

  try {
    const result = execFileSync(command.binary, command.args, {
      encoding: 'utf-8',
      maxBuffer: MAX_OUTPUT_LENGTH,
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: command.env ? { ...process.env, ...command.env } : undefined,
    });

    // Parse output based on provider
    let content = result.trim();
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
