/**
 * Ollama client service for the memory skill
 *
 * Minimal surface: generate(), isAvailable(), configureClient().
 * No retry logic. Default 15s timeout (overridable per call). Graceful degradation on error.
 *
 * Does NOT import from hooks/ — different runtime boundary.
 * Reads chat_model from .claude/memory.local.md YAML frontmatter;
 * defaults to gemma3:4b when not configured.
 */

import { Ollama } from 'ollama';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CHAT_MODEL = 'gemma3:4b';
const TIMEOUT_MS = 15_000;
const AVAILABILITY_TIMEOUT_MS = 5_000;

let client: Ollama = new Ollama({ host: 'http://localhost:11434' });

/**
 * Configure the Ollama client with a custom host.
 * Always creates a new client instance.
 */
export function configureClient(host: string): void {
  client = new Ollama({ host });
}

function getClient(): Ollama {
  return client;
}

/**
 * Read chat_model from .claude/memory.local.md YAML frontmatter.
 * Falls back to DEFAULT_CHAT_MODEL if file is missing or field absent.
 */
function readChatModel(): string {
  try {
    const settingsPath = join(process.cwd(), '.claude', 'memory.local.md');
    const content = readFileSync(settingsPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match?.[1]) {
      const line = match[1].split('\n').find(l => l.trimStart().startsWith('chat_model:'));
      if (line) {
        return line.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {
    // File not found or unreadable — use default
  }
  return DEFAULT_CHAT_MODEL;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`Ollama operation timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (handle !== undefined) clearTimeout(handle);
  }
}

/**
 * Generate text using Ollama's generate API.
 * Returns empty string and logs to stderr on timeout or error.
 *
 * @param timeoutMs - Override the default 15s timeout. Use higher values for
 *   slow operations: 60_000 for update-edge --verify, 300_000 for suggest-links --llm-type.
 */
export async function generate(prompt: string, model?: string, timeoutMs = TIMEOUT_MS): Promise<string> {
  const resolvedModel = model ?? readChatModel();
  try {
    const response = await withTimeout(
      getClient().generate({ model: resolvedModel, prompt, stream: false }),
      timeoutMs
    );
    return response.response?.trim() ?? '';
  } catch (error) {
    process.stderr.write(
      `[Ollama] Generate failed: ${error instanceof Error ? error.message : String(error)}\n`
    );
    return '';
  }
}

/**
 * Check whether Ollama is reachable.
 * Returns false without throwing when Ollama is not running.
 */
export async function isAvailable(): Promise<boolean> {
  try {
    await withTimeout(getClient().list(), AVAILABILITY_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}
