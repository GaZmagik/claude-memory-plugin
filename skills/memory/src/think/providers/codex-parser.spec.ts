/**
 * Co-located tests for codex-parser.ts
 */
import { describe, it, expect } from 'vitest';
import { parseCodexOutput, extractCodexModel } from './codex-parser.js';

describe('parseCodexOutput', () => {
  it('removes Codex Response banner', () => {
    const input = '====== Codex Response ======\nActual content here';
    expect(parseCodexOutput(input)).toBe('Actual content here');
  });

  it('removes separator lines', () => {
    const input = 'Line one\n---\nLine two\n--------\nLine three';
    expect(parseCodexOutput(input)).toBe('Line one\nLine two\nLine three');
  });

  it('normalises multiple newlines', () => {
    const input = 'First\n\n\n\nSecond\n\n\n\n\nThird';
    expect(parseCodexOutput(input)).toBe('First\n\nSecond\n\nThird');
  });

  it('trims whitespace', () => {
    const input = '  \n  Content  \n  ';
    expect(parseCodexOutput(input)).toBe('Content');
  });

  it('handles empty input', () => {
    expect(parseCodexOutput('')).toBe('');
    expect(parseCodexOutput(null)).toBe('');
    expect(parseCodexOutput(undefined)).toBe('');
  });

  it('handles complex real output', () => {
    const input = `====== Codex Response ======
---
Here is the actual response content.

It has multiple paragraphs.
---
End of response`;
    expect(parseCodexOutput(input)).toBe('Here is the actual response content.\n\nIt has multiple paragraphs.\nEnd of response');
  });
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
