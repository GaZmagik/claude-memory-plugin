/**
 * Interactive Prompt for AI Assistance
 *
 * Prompts users to accept AI assistance for complex thoughts.
 * Uses the prompts library for interactive confirmation.
 */

import prompts from 'prompts';
import type { InteractiveOptions } from './hint-output.js';

// Re-export for convenience
export type { InteractiveOptions };

/**
 * Options for AI assistance prompt
 */
export interface AiAssistancePromptOptions {
  /** The thought text */
  thought: string;
  /** The command being executed */
  command: string;
  /** Whether non-interactive mode is enabled */
  nonInteractive?: boolean;
  /** Whether stdin is a TTY */
  isTTY?: boolean;
  /** Whether to suggest a specific style */
  suggestStyle?: boolean;
}

/**
 * Result from AI assistance prompt
 */
export interface AiAssistancePromptResult {
  /** Whether to proceed with AI assistance */
  proceed: boolean;
  /** Whether the prompt was aborted (Ctrl+C) */
  aborted?: boolean;
  /** Whether skipped due to non-interactive mode */
  skippedDueToNonInteractive?: boolean;
  /** Suggested AI invocation (e.g., '--call claude') */
  suggestion?: string;
}

/**
 * Check if prompts should be shown
 *
 * @param options - Interactive options
 * @returns true if prompts should be shown
 */
export function shouldPrompt(options: InteractiveOptions): boolean {
  // Non-interactive mode suppresses prompts
  if (options.nonInteractive) {
    return false;
  }

  // Non-TTY suppresses prompts
  if (options.isTTY === false) {
    return false;
  }

  // CI environment detection
  if (options.detectCI) {
    const ciEnvVars = ['CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 'JENKINS_URL', 'CIRCLECI', 'TRAVIS', 'GITLAB_CI', 'BUILDKITE'];
    for (const envVar of ciEnvVars) {
      if (process.env[envVar]) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Prompt user for AI assistance on a complex thought
 *
 * @param options - Prompt options
 * @returns Prompt result
 */
export async function promptForAiAssistance(
  options: AiAssistancePromptOptions
): Promise<AiAssistancePromptResult> {
  // Skip prompt in non-interactive mode
  if (options.nonInteractive) {
    return {
      proceed: false,
      skippedDueToNonInteractive: true,
    };
  }

  // Skip if not a TTY
  if (options.isTTY === false) {
    return {
      proceed: false,
      skippedDueToNonInteractive: true,
    };
  }

  // Build the prompt
  const response = await prompts({
    type: 'confirm',
    name: 'proceed',
    message: 'This thought seems complex. Invoke AI for assistance? (y/N, use --non-interactive to skip)',
    initial: false, // Default to "no" for safety
  });

  // Handle abort (Ctrl+C)
  if (response.proceed === undefined) {
    return {
      proceed: false,
      aborted: true,
    };
  }

  // Build suggestion based on thought content
  let suggestion: string | undefined;
  if (response.proceed) {
    if (options.suggestStyle && options.thought.includes('?')) {
      suggestion = '--style Devils-Advocate';
    } else {
      suggestion = '--call claude';
    }
  }

  return {
    proceed: response.proceed,
    suggestion,
  };
}
