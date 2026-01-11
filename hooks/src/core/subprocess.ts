/**
 * Subprocess utilities for TypeScript hooks
 * Provides consistent subprocess spawning with timeout, error handling, and structured results
 *
 * T033-T037: Implementation for US1 (Subprocess Spawning Utilities)
 */

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
    const proc = Bun.spawnSync(args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdin: stdin ? Buffer.from(stdin) : undefined,
      timeout,
    });

    const durationMs = Date.now() - start;
    const timedOut = proc.exitCode === null && durationMs >= timeout - 50;

    return {
      exitCode: proc.exitCode,
      stdout: proc.stdout?.toString() ?? '',
      stderr: proc.stderr?.toString() ?? '',
      success: proc.exitCode === 0,
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

  try {
    const proc = Bun.spawn(args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      stdin: stdin ? 'pipe' : undefined,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Write stdin if provided
    if (stdin && proc.stdin) {
      proc.stdin.write(typeof stdin === 'string' ? stdin : stdin);
      proc.stdin.end();
    }

    // Set up timeout
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeout);

    // Wait for process to complete
    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const durationMs = Date.now() - start;

    return {
      exitCode: timedOut ? null : exitCode,
      stdout,
      stderr,
      success: !timedOut && exitCode === 0,
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
      timedOut: false,
      durationMs,
    };
  }
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
