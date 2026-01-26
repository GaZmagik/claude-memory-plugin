/**
 * Co-located tests for gemini-parser.ts
 */
import { describe, it, expect } from 'vitest';
import { parseGeminiOutput, extractGeminiModel } from './gemini-parser.js';

describe('gemini-parser exports', () => {
  it('exports parseGeminiOutput', () => expect(parseGeminiOutput).toBeDefined());
  it('exports extractGeminiModel', () => expect(extractGeminiModel).toBeDefined());
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
});
