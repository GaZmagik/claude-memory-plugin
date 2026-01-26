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

  it('strips path traversal attempts', () => {
    // Sanitises by removing dangerous characters, returns what's left
    expect(sanitiseStyleName('../../../etc/passwd')).toBe('etcpasswd');
    expect(sanitiseStyleName('..\\..\\windows')).toBe('windows');
  });

  it('strips path separators', () => {
    expect(sanitiseStyleName('/etc/passwd')).toBe('etcpasswd');
  });

  it('handles empty string', () => {
    expect(sanitiseStyleName('')).toBe('');
  });
});

describe('sanitiseAgentName', () => {
  it('passes through valid agent names', () => {
    expect(sanitiseAgentName('security-expert')).toBe('security-expert');
  });

  it('strips path traversal attempts', () => {
    // Sanitises by removing dangerous characters, returns what's left
    expect(sanitiseAgentName('../malicious')).toBe('malicious');
  });

  it('handles empty string', () => {
    expect(sanitiseAgentName('')).toBe('');
  });
});
