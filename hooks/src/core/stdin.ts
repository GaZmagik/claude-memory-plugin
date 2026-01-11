/**
 * Safe stdin reading utilities for Claude Code hooks
 */

import type { HookInput, HookOutput } from './types.ts';

/**
 * Read all data from stdin as a string.
 * Handles the async iterator pattern for stdin.
 */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Parse stdin as JSON hook input.
 * Returns null if stdin is empty or invalid JSON.
 */
export async function parseHookInput(): Promise<HookInput | null> {
  try {
    const raw = await readStdin();
    const trimmed = raw.trim();

    if (!trimmed) {
      return null;
    }

    return JSON.parse(trimmed) as HookInput;
  } catch {
    return null;
  }
}

/**
 * Output JSON response to stdout for Claude to read.
 * Accepts either a full HookOutput object or separate parameters.
 */
export function outputHookResponse(output: HookOutput): void;
export function outputHookResponse(hookEventName: string, additionalContext: string): void;
export function outputHookResponse(
  outputOrEventName: HookOutput | string,
  additionalContext?: string
): void {
  let output: HookOutput;

  if (typeof outputOrEventName === 'string') {
    output = {
      hookSpecificOutput: {
        hookEventName: outputOrEventName,
        additionalContext: additionalContext ?? '',
      },
    };
  } else {
    output = outputOrEventName;
  }

  console.log(JSON.stringify(output));
}
