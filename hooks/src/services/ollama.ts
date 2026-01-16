/**
 * Ollama client wrapper for Claude Code hooks
 *
 * Uses the official ollama-js library for type-safe API access.
 * Includes timeout handling and retry logic for resilient operation.
 */

import { Ollama } from 'ollama';

// Default Ollama configuration
const DEFAULT_HOST = 'http://localhost:11434';
const DEFAULT_CHAT_MODEL = 'gemma3:4b';
const DEFAULT_EMBEDDING_MODEL = 'embeddinggemma:latest';
const DEFAULT_NUM_CTX = 32768;
const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds for hooks (must be fast)
const DEFAULT_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 100;

// Singleton client instance
let client: Ollama | null = null;

/**
 * Get or create the Ollama client instance.
 */
function getClient(): Ollama {
  if (!client) {
    client = new Ollama({ host: DEFAULT_HOST });
  }
  return client;
}

/**
 * Options for generate calls
 */
export interface GenerateOptions {
  /** Context window size */
  num_ctx?: number;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Options for embed calls
 */
export interface EmbedOptions {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
}

/**
 * Execute a promise with timeout.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
        });
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute with retry logic.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  _operation: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms...
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Generate text using Ollama's generate API.
 *
 * Features:
 * - Configurable timeout (default 10s for hook performance)
 * - Automatic retry with exponential backoff
 * - Graceful degradation (returns empty string on error)
 *
 * @param prompt - The prompt to send to the model
 * @param model - Model name (default: gemma3:4b)
 * @param options - Additional options like num_ctx, timeout, maxRetries
 * @returns Generated text or empty string on error
 */
export async function generate(
  prompt: string,
  model: string = DEFAULT_CHAT_MODEL,
  options: GenerateOptions = {}
): Promise<string> {
  const {
    num_ctx = DEFAULT_NUM_CTX,
    timeout = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = options;

  try {
    const result = await withRetry(
      async () => {
        const response = await withTimeout(
          getClient().generate({
            model,
            prompt,
            options: { num_ctx },
            stream: false,
          }),
          timeout,
          'generate'
        );
        return response.response || '';
      },
      maxRetries,
      'generate'
    );

    return result;
  } catch {
    // Fail silently - hooks should be resilient
    return '';
  }
}

/**
 * Generate embeddings using Ollama's embed API.
 *
 * Features:
 * - Configurable timeout (default 10s for hook performance)
 * - Automatic retry with exponential backoff
 * - Graceful degradation (returns empty array on error)
 *
 * @param text - Text to embed
 * @param model - Embedding model name (default: embeddinggemma:latest)
 * @param options - Additional options like timeout, maxRetries
 * @returns Embedding vector or empty array on error
 */
export async function embed(
  text: string,
  model: string = DEFAULT_EMBEDDING_MODEL,
  options: EmbedOptions = {}
): Promise<number[]> {
  const { timeout = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } =
    options;

  try {
    const result = await withRetry(
      async () => {
        const response = await withTimeout(
          getClient().embed({
            model,
            input: text,
          }),
          timeout,
          'embed'
        );
        return response.embeddings?.[0] || [];
      },
      maxRetries,
      'embed'
    );

    return result;
  } catch {
    // Fail silently - hooks should be resilient
    return [];
  }
}

/**
 * Check if Ollama is available and the required model is loaded.
 *
 * @param model - Model name to check for
 * @returns true if Ollama is available with the model
 */
export async function isAvailable(model?: string): Promise<boolean> {
  try {
    const response = await withTimeout(
      getClient().list(),
      5000, // Quick timeout for availability check
      'list'
    );
    const models = response.models?.map((m) => m.name) || [];

    if (model) {
      return models.some((m) => m.includes(model));
    }

    return models.length > 0;
  } catch {
    return false;
  }
}

/**
 * Re-export default models for use by hooks
 */
export const MODELS = {
  CHAT: DEFAULT_CHAT_MODEL,
  EMBEDDING: DEFAULT_EMBEDDING_MODEL,
} as const;

/**
 * Re-export default configuration
 */
export const CONFIG = {
  HOST: DEFAULT_HOST,
  TIMEOUT_MS: DEFAULT_TIMEOUT_MS,
  MAX_RETRIES: DEFAULT_MAX_RETRIES,
  NUM_CTX: DEFAULT_NUM_CTX,
} as const;
