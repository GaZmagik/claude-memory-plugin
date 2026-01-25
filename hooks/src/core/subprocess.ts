/**
 * Subprocess utilities for TypeScript hooks
 * Provides consistent subprocess spawning with timeout, error handling, and structured results
 *
 * T033-T037: Implementation for US1 (Subprocess Spawning Utilities)
 *
 * Cross-platform: Works with both Bun and Node.js
 */

import {
  spawnSync as nodeSpawnSync,
  spawn as nodeSpawn,
  type ChildProcess,
} from 'node:child_process';

// Buffer limit to prevent memory exhaustion from malicious/runaway processes
const MAX_OUTPUT_BYTES = 10 * 1024 * 1024; // 10MB
const TRUNCATION_NOTICE = '\n... [output truncated at 10MB limit]';

export interface SubprocessOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Working directory */
  cwd?: string;
  /** Environment variables (merged with process.env) */
  env?: Record<string, string>;
  /** Input to pipe to stdin */
  stdin?: string | Buffer;
}

export interface SubprocessResult {
  /** Exit code (null if process was killed) */
  exitCode: number | null;
  /** Standard output as string */
  stdout: string;
  /** Standard error as string */
  stderr: string;
  /** Whether the command succeeded (exit code 0) */
  success: boolean;
  /** Whether the command was killed due to timeout */
  timedOut: boolean;
  /** Execution time in milliseconds */
  durationMs: number;
}

/**
 * Execute a command synchronously with timeout enforcement
 *
 * @param args - Command and arguments as array (prevents injection)
 * @param options - Execution options
 * @returns Structured result with exit code, stdout, stderr
 *
 * @example
 * const result = await spawnSync(['git', 'status'], { timeout: 5000 });
 * if (result.success) console.log(result.stdout);
 */
export async function spawnSync(
  args: string[],
  options: SubprocessOptions = {}
): Promise<SubprocessResult> {
  const { timeout = 30000, cwd, env, stdin } = options;
  const start = Date.now();

  try {
    const command = args[0];
    if (!command) {
      throw new Error('Command is required');
    }
    const cmdArgs = args.slice(1);
    const proc = nodeSpawnSync(command, cmdArgs, {
      cwd,
      env: env && Object.keys(env).length > 0 ? { ...process.env, ...env } : process.env,
      input: stdin,
      timeout,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const durationMs = Date.now() - start;
    const timedOut = proc.signal === 'SIGTERM' && durationMs >= timeout - 50;

    return {
      exitCode: proc.status,
      stdout: proc.stdout ?? '',
      stderr: proc.stderr ?? '',
      success: proc.status === 0,
      timedOut,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    return {
      exitCode: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
      success: false,
      timedOut: durationMs >= timeout - 50,
      durationMs,
    };
  }
}

/**
 * Execute a command asynchronously with timeout enforcement
 *
 * @param args - Command and arguments as array (prevents injection)
 * @param options - Execution options
 * @returns Promise resolving to structured result
 *
 * @example
 * const result = await spawn(['pytest', 'tests/'], { timeout: 60000 });
 */
export async function spawn(
  args: string[],
  options: SubprocessOptions = {}
): Promise<SubprocessResult> {
  const { timeout = 30000, cwd, env, stdin } = options;
  const start = Date.now();

  return new Promise((resolve) => {
    try {
      const command = args[0];
      if (!command) {
        resolve({
          exitCode: null,
          stdout: '',
          stderr: 'Command is required',
          success: false,
          timedOut: false,
          durationMs: 0,
        });
        return;
      }
      const cmdArgs = args.slice(1);
      const proc: ChildProcess = nodeSpawn(command, cmdArgs, {
        cwd,
        env: env && Object.keys(env).length > 0 ? { ...process.env, ...env } : process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let stdoutTruncated = false;
      let stderrTruncated = false;
      let timedOut = false;

      // Collect stdout with buffer limit
      proc.stdout?.on('data', (data: Buffer) => {
        if (stdoutTruncated) return;
        const remaining = MAX_OUTPUT_BYTES - stdoutBytes;
        if (remaining <= 0) {
          stdoutTruncated = true;
          stdout += TRUNCATION_NOTICE;
          return;
        }
        const chunk = data.length <= remaining ? data : data.subarray(0, remaining);
        stdout += chunk.toString();
        stdoutBytes += chunk.length;
        if (data.length > remaining) {
          stdoutTruncated = true;
          stdout += TRUNCATION_NOTICE;
        }
      });

      // Collect stderr with buffer limit
      proc.stderr?.on('data', (data: Buffer) => {
        if (stderrTruncated) return;
        const remaining = MAX_OUTPUT_BYTES - stderrBytes;
        if (remaining <= 0) {
          stderrTruncated = true;
          stderr += TRUNCATION_NOTICE;
          return;
        }
        const chunk = data.length <= remaining ? data : data.subarray(0, remaining);
        stderr += chunk.toString();
        stderrBytes += chunk.length;
        if (data.length > remaining) {
          stderrTruncated = true;
          stderr += TRUNCATION_NOTICE;
        }
      });

      // Write stdin if provided
      if (stdin && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else if (proc.stdin) {
        proc.stdin.end();
      }

      // Set up timeout with proper resource cleanup
      const timeoutId = setTimeout(() => {
        timedOut = true;
        // Destroy streams to close file descriptors and prevent further events
        // destroy() internally handles listener cleanup and prevents race conditions
        proc.stdout?.destroy();
        proc.stderr?.destroy();
        proc.stdin?.destroy();
        // Kill process - this will trigger 'close' event
        proc.kill('SIGTERM');
      }, timeout);

      // Handle process exit
      proc.on('close', (exitCode: number | null) => {
        clearTimeout(timeoutId);
        const durationMs = Date.now() - start;

        resolve({
          exitCode: timedOut ? null : exitCode,
          stdout,
          stderr,
          success: !timedOut && exitCode === 0,
          timedOut,
          durationMs,
        });
      });

      // Handle errors with cleanup
      proc.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        // Clean up streams on error
        proc.stdin?.destroy();
        proc.stdout?.destroy();
        proc.stderr?.destroy();
        const durationMs = Date.now() - start;

        resolve({
          exitCode: null,
          stdout,
          stderr: error.message,
          success: false,
          timedOut: false,
          durationMs,
        });
      });
    } catch (error) {
      const durationMs = Date.now() - start;
      resolve({
        exitCode: null,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        success: false,
        timedOut: false,
        durationMs,
      });
    }
  });
}

/**
 * Execute a command and throw on failure
 *
 * @param args - Command and arguments
 * @param options - Execution options
 * @throws Error if command fails or times out
 */
export async function execOrThrow(
  args: string[],
  options: SubprocessOptions = {}
): Promise<SubprocessResult> {
  const result = await spawnSync(args, options);

  if (result.timedOut) {
    throw new Error(`Command timed out: ${args.join(' ')}`);
  }

  if (!result.success) {
    throw new Error(
      `Command failed with exit code ${result.exitCode}: ${args.join(' ')}\n${result.stderr}`
    );
  }

  return result;
}
