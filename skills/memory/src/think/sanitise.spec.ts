/**
 * Unit tests for sanitisation functions
 */
import { describe, it, expect } from 'vitest';
import { sanitiseForPrompt, sanitiseStyleName, sanitiseAgentName } from './sanitise.js';

describe('sanitiseForPrompt', () => {
  it('passes through normal text', () => {
    expect(sanitiseForPrompt('Hello world')).toBe('Hello world');
  });

  it('truncates long text to max length', () => {
    const longText = 'a'.repeat(1000);
    const result = sanitiseForPrompt(longText, 100);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it('handles empty string', () => {
    expect(sanitiseForPrompt('')).toBe('');
  });
});

describe('sanitiseStyleName', () => {
  it('passes through valid style names', () => {
    expect(sanitiseStyleName('Devils-Advocate')).toBe('Devils-Advocate');
    expect(sanitiseStyleName('Socratic')).toBe('Socratic');
  });

  it('blocks path traversal attempts', () => {
    expect(sanitiseStyleName('../../../etc/passwd')).toBe('');
    expect(sanitiseStyleName('..\\..\\windows')).toBe('');
  });

  it('blocks absolute paths', () => {
    expect(sanitiseStyleName('/etc/passwd')).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitiseStyleName('')).toBe('');
  });
});

describe('sanitiseAgentName', () => {
  it('passes through valid agent names', () => {
    expect(sanitiseAgentName('security-expert')).toBe('security-expert');
  });

  it('blocks path traversal attempts', () => {
    expect(sanitiseAgentName('../malicious')).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitiseAgentName('')).toBe('');
  });
});
