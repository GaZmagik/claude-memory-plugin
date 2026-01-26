/**
 * Co-located tests for codex-parser.ts
 */
import { describe, it, expect } from 'vitest';
import { parseCodexOutput, extractCodexModel } from './codex-parser.js';

describe('codex-parser exports', () => {
  it('exports parseCodexOutput', () => expect(parseCodexOutput).toBeDefined());
  it('exports extractCodexModel', () => expect(extractCodexModel).toBeDefined());
});

describe('extractCodexModel', () => {
  it('extracts model from codex banner output', () => {
    const output = `OpenAI Codex v0.89.0 (research preview)
--------
workdir: /home/user/project
model: gpt-5.2-codex
provider: openai
--------
user
test prompt`;
    expect(extractCodexModel(output)).toBe('gpt-5.2-codex');
  });

  it('extracts different model names', () => {
    const output = `model: o3-mini\nprovider: openai`;
    expect(extractCodexModel(output)).toBe('o3-mini');
  });

  it('returns undefined for empty input', () => {
    expect(extractCodexModel('')).toBeUndefined();
    expect(extractCodexModel(null)).toBeUndefined();
    expect(extractCodexModel(undefined)).toBeUndefined();
  });

  it('returns undefined when no model line present', () => {
    const output = 'Some output without model info';
    expect(extractCodexModel(output)).toBeUndefined();
  });
});
