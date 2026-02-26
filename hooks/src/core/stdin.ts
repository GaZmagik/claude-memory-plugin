/**
 * Safe stdin reading utilities for Claude Code hooks
 */

import type { HookInput, HookOutput } from './types.ts';

/** Maximum stdin size: 1MB — prevents unbounded memory consumption */
const MAX_STDIN_BYTES = 1024 * 1024;

/**
 * Read all data from stdin as a string.
 * Handles the async iterator pattern for stdin.
 * @param input - Optional readable stream (defaults to process.stdin). Used for testing.
 */
export async function readStdin(input?: AsyncIterable<Buffer | string>): Promise<string> {
  const chunks: Buffer[] = [];
  const source = input ?? process.stdin;
  let totalBytes = 0;

  for await (const chunk of source) {
    const buf = Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_STDIN_BYTES) {
      throw new Error(`stdin exceeded maximum size of ${MAX_STDIN_BYTES} bytes`);
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Parse stdin as JSON hook input.
 * Returns null if stdin is empty or invalid JSON.
 * @param input - Optional readable stream (defaults to process.stdin). Used for testing.
 */
export async function parseHookInput(input?: AsyncIterable<Buffer | string>): Promise<HookInput | null> {
  try {
    const raw = await readStdin(input);
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
export function outputHookResponse(hookEventName: string, additionalContext?: string): void;
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
