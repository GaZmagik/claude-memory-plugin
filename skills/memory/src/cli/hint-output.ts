/**
 * Hint Output for stderr
 *
 * Outputs hints to stderr (not stdout) so they are visible to users
 * without polluting machine-parseable JSON output.
 */

/** Prefix for hint messages */
export const HINT_PREFIX = '💡 Hint: ';

/**
 * Hint message structure
 */
export interface HintMessage {
  /** The hint text */
  text: string;
  /** Optional example command */
  example?: string;
  /** Type of hint (for categorisation) */
  type?: 'call' | 'style' | 'agent' | 'auto';
}

/**
 * Options for hint formatting
 */
export interface HintFormatOptions {
  /** Whether to use colours (default: auto-detect TTY) */
  useColours?: boolean;
}

/**
 * Interactive mode options
 */
export interface InteractiveOptions {
  /** Whether non-interactive mode is enabled */
  nonInteractive: boolean;
  /** Whether stdin is a TTY */
  isTTY?: boolean;
  /** Whether to auto-detect CI environment */
  detectCI?: boolean;
}

/**
 * Format a hint message for output
 *
 * @param hint - The hint message to format
 * @param options - Optional formatting options
 * @returns Formatted hint string with newline
 */
export function formatHint(hint: HintMessage, options?: HintFormatOptions): string {
  const useColours = options?.useColours ?? (process.stderr.isTTY ?? false);

  let output = HINT_PREFIX + hint.text;

  if (hint.example) {
    output += '\n  Example: ' + hint.example;
  }

  // Add ANSI colour codes if TTY
  if (useColours) {
    // Dim yellow for hints
    output = '\x1b[33m' + output + '\x1b[0m';
  }

  return output + '\n';
}

/**
 * Output a hint to stderr
 *
 * @param hint - The hint message to output
 * @param options - Optional formatting options
 */
export function outputHintToStderr(
  hint: HintMessage,
  options?: HintFormatOptions
): void {
  const formatted = formatHint(hint, options);
  process.stderr.write(formatted);
}

/**
 * Check if hints should be shown in the current mode
 *
 * @param options - Interactive mode options
 * @returns true if hints should be shown
 */
export function shouldShowHintInMode(options: InteractiveOptions): boolean {
  // Non-interactive mode suppresses hints
  if (options.nonInteractive) {
    return false;
  }

  // Non-TTY suppresses hints
  if (options.isTTY === false) {
    return false;
  }

  // CI environment detection
  if (options.detectCI) {
    const ciEnvVars = ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 'JENKINS_URL'];
    for (const envVar of ciEnvVars) {
      if (process.env[envVar]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get a rotating hint based on invocation count
 *
 * @param count - Current invocation count (0-indexed)
 * @returns Hint message for this invocation
 */
export function getRotatingHint(count: number): HintMessage {
  const hints: HintMessage[] = [
    {
      type: 'call',
      text: 'Use --call claude to get AI assistance with your thought',
      example: 'memory think add "Complex topic" --call claude',
    },
    {
      type: 'style',
      text: 'Try --style to specify an output style (Devils-Advocate, Architect, etc.)',
      example: 'memory think add "Trade-offs?" --style Devils-Advocate',
    },
    {
      type: 'auto',
      text: 'Use --auto to let AI select the best style for your thought',
      example: 'memory think add "What approach?" --auto',
    },
  ];

  const index = count % hints.length;
  // Fallback to first hint if somehow undefined (defensive programming)
  return hints[index] ?? hints[0] ?? { type: 'call', text: 'Use --call claude for AI assistance', example: 'memory think add "topic" --call claude' };
}
