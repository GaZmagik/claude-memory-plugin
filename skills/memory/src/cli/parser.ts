/**
 * CLI Argument Parser
 *
 * Parses command-line arguments into structured format.
 * Supports: --flag value, --boolean-flag, positional args, stdin JSON
 */

/**
 * Parsed arguments structure
 */
export interface ParsedArgs {
  /** Positional arguments (non-flag values) */
  positional: string[];
  /** Flag values (--key value or --boolean) */
  flags: Record<string, string | boolean>;
}

/**
 * Parse command-line arguments
 *
 * @param args - Raw argument array (typically process.argv.slice(2))
 * @returns Structured parsed arguments
 *
 * @example
 * parseArgs(['read', 'my-id', '--scope', 'local', '--verbose'])
 * // { positional: ['read', 'my-id'], flags: { scope: 'local', verbose: true } }
 */
export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = { positional: [], flags: {} };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Handle help flags specially
    if (arg === '-h' || arg === '--help') {
      result.flags.help = true;
      continue;
    }

    // Handle full/verbose flags
    if (arg === '-f' || arg === '--full') {
      result.flags.full = true;
      continue;
    }

    // Handle long flags (--flag, --flag value, or --flag=value)
    if (arg.startsWith('--')) {
      const flagPart = arg.slice(2);

      // Check for --flag=value syntax
      const equalsIndex = flagPart.indexOf('=');
      if (equalsIndex !== -1) {
        const key = flagPart.slice(0, equalsIndex);
        const value = flagPart.slice(equalsIndex + 1);
        result.flags[key] = value || true; // Empty value after = treated as boolean
        continue;
      }

      // Standard --flag or --flag value
      const key = flagPart;
      const next = args[i + 1];

      // Check if next arg exists and isn't another flag
      if (next !== undefined && !next.startsWith('-')) {
        result.flags[key] = next;
        i++; // Skip the value
      } else {
        result.flags[key] = true;
      }
      continue;
    }

    // Handle short flags with values (-k value)
    if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];

      if (next !== undefined && !next.startsWith('-')) {
        result.flags[key] = next;
        i++;
      } else {
        result.flags[key] = true;
      }
      continue;
    }

    // Everything else is a positional argument
    result.positional.push(arg);
  }

  return result;
}

/**
 * Read JSON from stdin (non-blocking)
 *
 * @returns Promise resolving to parsed JSON or undefined if no stdin
 */
export async function readStdinJson<T = unknown>(): Promise<T | undefined> {
  // Check if stdin is a TTY (interactive terminal) - no piped input
  if (process.stdin.isTTY) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let hasData = false;

    process.stdin.on('data', (chunk: Buffer) => {
      hasData = true;
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      if (!hasData) {
        resolve(undefined);
        return;
      }

      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve(undefined);
        return;
      }

      try {
        resolve(JSON.parse(raw) as T);
      } catch (error) {
        reject(new Error(`Invalid JSON input: ${error}`));
      }
    });

    process.stdin.on('error', reject);

    // Set a timeout for reading stdin
    setTimeout(() => {
      if (!hasData) {
        resolve(undefined);
      }
    }, 100);
  });
}

/**
 * Read raw text from stdin
 *
 * @returns Promise resolving to string or undefined if no stdin
 */
export async function readStdinRaw(): Promise<string | undefined> {
  if (process.stdin.isTTY) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let hasData = false;

    process.stdin.on('data', (chunk: Buffer) => {
      hasData = true;
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      if (!hasData) {
        resolve(undefined);
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });

    process.stdin.on('error', reject);

    setTimeout(() => {
      if (!hasData) {
        resolve(undefined);
      }
    }, 100);
  });
}

/**
 * Get a flag value as string, with optional default
 */
export function getFlagString(
  flags: Record<string, string | boolean>,
  key: string,
  defaultValue?: string
): string | undefined {
  const value = flags[key];
  if (typeof value === 'string') {
    return value;
  }
  return defaultValue;
}

/**
 * Get a flag value as boolean
 */
export function getFlagBool(
  flags: Record<string, string | boolean>,
  key: string
): boolean {
  return flags[key] === true || flags[key] === 'true';
}

/**
 * Get a flag value as number, with optional default
 */
export function getFlagNumber(
  flags: Record<string, string | boolean>,
  key: string,
  defaultValue?: number
): number | undefined {
  const value = flags[key];
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }
  return defaultValue;
}
