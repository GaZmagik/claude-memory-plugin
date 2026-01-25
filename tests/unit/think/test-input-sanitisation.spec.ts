/**
 * T045 [US2] Unit test for input sanitisation for Ollama prompts
 * TDD Red Phase - Tests written before implementation
 */
import { describe, it, expect } from 'vitest';
import { sanitiseForPrompt, sanitiseStyleName, sanitiseAgentName } from '../../../skills/memory/src/think/sanitise.js';

describe('sanitise', () => {
  describe('sanitiseForPrompt', () => {
    it('removes control characters', () => {
      const result = sanitiseForPrompt('Hello\x00\x01\x02World');
      expect(result).not.toContain('\x00');
    });

    it('normalises whitespace', () => {
      const result = sanitiseForPrompt('Hello    World');
      expect(result).toBe('Hello World');
    });

    it('truncates to max length', () => {
      const long = 'a'.repeat(5000);
      const result = sanitiseForPrompt(long, 1000);
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('preserves valid Unicode', () => {
      const result = sanitiseForPrompt('Hello 世界');
      expect(result).toContain('世界');
    });

    it('handles empty input', () => {
      expect(sanitiseForPrompt('')).toBe('');
    });
  });

  describe('sanitiseStyleName', () => {
    it('removes path traversal characters', () => {
      expect(sanitiseStyleName('../../../etc/passwd')).not.toContain('..');
    });

    it('preserves valid style names', () => {
      expect(sanitiseStyleName('Devils-Advocate')).toBe('Devils-Advocate');
    });

    it('preserves underscores and hyphens', () => {
      expect(sanitiseStyleName('my_custom-style')).toBe('my_custom-style');
    });

    it('truncates long names', () => {
      const long = 'a'.repeat(200);
      expect(sanitiseStyleName(long).length).toBeLessThanOrEqual(100);
    });
  });

  describe('sanitiseAgentName', () => {
    it('removes path traversal characters', () => {
      expect(sanitiseAgentName('../malicious')).not.toContain('..');
    });

    it('preserves valid agent names', () => {
      expect(sanitiseAgentName('recall')).toBe('recall');
      expect(sanitiseAgentName('curator')).toBe('curator');
    });

    it('truncates long names', () => {
      const long = 'a'.repeat(200);
      expect(sanitiseAgentName(long).length).toBeLessThanOrEqual(100);
    });
  });
});
