#!/usr/bin/env bun
/**
 * Ollama Pre-warm Hook
 *
 * Loads the chat model into memory at session start to reduce
 * PostToolUse latency for first memory operations.
 *
 * This is a best-effort optimization - failures are silently ignored
 * to avoid blocking session start.
 *
 * @since v1.2.0
 */

import { runHook, allow } from '../src/core/error-handler.ts';
import { loadSettings } from '../src/settings/plugin-settings.ts';
import { generate, isAvailable, configureClient } from '../src/services/ollama.ts';

runHook(async (input) => {
  const projectDir = input?.cwd || process.cwd();

  // Load settings to get Ollama configuration
  const settings = await loadSettings(projectDir);

  // Configure Ollama client with user's host
  configureClient(settings.ollama_host);

  // Check if Ollama is available (5s timeout)
  const available = await isAvailable(settings.chat_model);
  if (!available) {
    // Ollama not running or model not available - skip silently
    return allow();
  }

  // Send minimal prompt to load model into memory
  // This triggers model loading without generating much output
  try {
    await generate('ping', settings.chat_model, {
      timeout: settings.ollama_prewarm_timeout,
      num_ctx: 128, // Minimal context window
    });
  } catch {
    // Pre-warming failed - ignore silently (best-effort)
    // The model will still load on first actual use, just with higher latency
  }

  return allow();
});
