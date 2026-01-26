/**
 * Co-located tests for gemini-parser.ts
 */
import { describe, it, expect } from 'vitest';
import { parseGeminiOutput, extractGeminiModel } from './gemini-parser.js';

describe('parseGeminiOutput', () => {
  it('filters out INFO log lines', () => {
    const input = '[INFO] Starting...\nActual content\n[INFO] Done';
    expect(parseGeminiOutput(input)).toBe('Actual content');
  });

  it('filters out DEBUG log lines', () => {
    const input = '[DEBUG] Loading...\nContent here\n[DEBUG] Loaded';
    expect(parseGeminiOutput(input)).toBe('Content here');
  });

  it('filters out WARN and ERROR log lines', () => {
    const input = '[WARN] Warning message\nContent\n[ERROR] Error message';
    expect(parseGeminiOutput(input)).toBe('Content');
  });

  it('filters out status messages', () => {
    const input = 'Thinking...\nActual response\nProcessing...\nDone!';
    expect(parseGeminiOutput(input)).toBe('Actual response');
  });

  it('normalises multiple newlines', () => {
    const input = 'First\n\n\n\nSecond';
    expect(parseGeminiOutput(input)).toBe('First\n\nSecond');
  });

  it('handles empty input', () => {
    expect(parseGeminiOutput('')).toBe('');
    expect(parseGeminiOutput(null)).toBe('');
    expect(parseGeminiOutput(undefined)).toBe('');
  });

  it('handles complex real output', () => {
    const input = `[DEBUG] Loading extensions...
[INFO] Connected
Thinking...
Here is the actual response.
Processing...
Done!`;
    expect(parseGeminiOutput(input)).toBe('Here is the actual response.');
  });
});

describe('extractGeminiModel', () => {
  it('extracts model from JSON-style debug output', () => {
    const output = `[DEBUG] some info
    "message": "No capacity available for model gemini-3-flash-preview on the server",
        "model": "gemini-3-flash-preview"
    }`;
    expect(extractGeminiModel(output)).toBe('gemini-3-flash-preview');
  });

  it('extracts model from User-Agent header', () => {
    const output = `{
      'User-Agent': 'GeminiCLI/0.25.2/gemini-3-pro-preview (linux; x64) google-api-nodejs-client/9.15.1',
    }`;
    expect(extractGeminiModel(output)).toBe('gemini-3-pro-preview');
  });

  it('extracts model from plain format', () => {
    const output = `model: gemini-2.5-pro\nother: stuff`;
    expect(extractGeminiModel(output)).toBe('gemini-2.5-pro');
  });

  it('prefers JSON format over User-Agent', () => {
    const output = `"model": "gemini-3-flash-preview"
      'User-Agent': 'GeminiCLI/0.25.2/gemini-3-pro-preview (linux; x64)'`;
    expect(extractGeminiModel(output)).toBe('gemini-3-flash-preview');
  });

  it('prefers JSON format over plain format', () => {
    const output = `model: gemini-plain-model
    "model": "gemini-json-model"`;
    expect(extractGeminiModel(output)).toBe('gemini-json-model');
  });

  it('returns undefined for empty input', () => {
    expect(extractGeminiModel('')).toBeUndefined();
    expect(extractGeminiModel(null)).toBeUndefined();
    expect(extractGeminiModel(undefined)).toBeUndefined();
  });

  it('returns undefined when no model present', () => {
    const output = '[DEBUG] Loading extensions...\nDone!';
    expect(extractGeminiModel(output)).toBeUndefined();
  });

  it('ignores non-gemini model names', () => {
    const output = `"model": "gpt-4"`;
    expect(extractGeminiModel(output)).toBeUndefined();
  });

  it('handles model with version numbers', () => {
    const output = `"model": "gemini-2.5-pro-exp-03-25"`;
    expect(extractGeminiModel(output)).toBe('gemini-2.5-pro-exp-03-25');
  });

  it('does not extract model from prose text (only JSON format)', () => {
    // The regex requires "model": "gemini-xxx" format, not prose
    const output = `{"error": {"message": "No capacity for model gemini-3-flash-preview"}}`;
    expect(extractGeminiModel(output)).toBeUndefined();
  });

  it('handles User-Agent with platform suffix', () => {
    const output = `'User-Agent': 'GeminiCLI/1.0.0/gemini-2.5-flash (darwin; arm64) node/20.0.0'`;
    expect(extractGeminiModel(output)).toBe('gemini-2.5-flash');
  });

  it('extracts from deeply nested JSON', () => {
    const output = `{"request": {"config": {"model": "gemini-3-pro-preview"}}}`;
    expect(extractGeminiModel(output)).toBe('gemini-3-pro-preview');
  });

  it('returns undefined for partial gemini match', () => {
    const output = `"model": "gem-2"`;
    expect(extractGeminiModel(output)).toBeUndefined();
  });
});
