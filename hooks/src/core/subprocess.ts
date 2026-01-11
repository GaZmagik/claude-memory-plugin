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
    const [command, ...cmdArgs] = args;
    const proc = nodeSpawnSync(command, cmdArgs, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
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
      const [command, ...cmdArgs] = args;
      const proc: ChildProcess = nodeSpawn(command, cmdArgs, {
        cwd,
        env: env ? { ...process.env, ...env } : process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Collect stdout
      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // Collect stderr
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Write stdin if provided
      if (stdin && proc.stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else if (proc.stdin) {
        proc.stdin.end();
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        timedOut = true;
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

      // Handle errors
      proc.on('error', (error: Error) => {
        clearTimeout(timeoutId);
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
