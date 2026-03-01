/**
 * Tests for Ollama pre-warm hook
 *
 * NOTE: These tests need rewriting to actually import and test the hook code.
 * The hook uses runHook() which executes at module load time, so testing
 * requires mocking runHook to capture the callback before import.
 *
 * @since v1.2.0
 */

import { describe, it } from 'vitest';

describe('Ollama Pre-warm Hook', () => {
  describe('pre-warming behaviour', () => {
    it.skip('should call isAvailable with configured chat_model', () => {
      // Requires: mock runHook, loadSettings, isAvailable, generate
      // Then import hook module and invoke captured callback
    });

    it.skip('should call generate with "ping" prompt, configured model, and num_ctx=128', () => {
      // Verify generate() called with minimal context window
    });

    it.skip('should call configureClient with settings.ollama_host', () => {
      // Verify Ollama client configured before availability check
    });
  });

  describe('error handling', () => {
    it.skip('should return allow() when Ollama is not available', () => {
      // Mock isAvailable → false, verify generate() never called
    });

    it.skip('should return allow() when generate() throws', () => {
      // Mock generate → reject, verify hook doesn't throw
    });
  });

  describe('settings integration', () => {
    it.skip('should load settings from input.cwd', () => {
      // Mock loadSettings, verify called with correct cwd
    });

    it.skip('should fall back to process.cwd() when input.cwd is missing', () => {
      // Invoke callback with empty input
    });
  });
});
