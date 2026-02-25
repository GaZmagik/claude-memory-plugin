import { describe, it, expect } from 'vitest';
import { validateAgentName } from '../../../skills/memory/src/scope/validate-agent-name.js';

describe('validateAgentName', () => {
  describe('Valid agent names', () => {
    it('should accept lowercase alphanumeric with hyphens', () => {
      expect(validateAgentName('typescript-expert')).toEqual({ valid: true });
      expect(validateAgentName('rust-systems')).toEqual({ valid: true });
      expect(validateAgentName('api-architect')).toEqual({ valid: true });
    });

    it('should accept names with numbers', () => {
      expect(validateAgentName('typescript5-expert')).toEqual({ valid: true });
      expect(validateAgentName('api-v2-architect')).toEqual({ valid: true });
    });

    it('should accept single character names', () => {
      expect(validateAgentName('a')).toEqual({ valid: true });
      expect(validateAgentName('x')).toEqual({ valid: true });
    });

    it('should accept names without hyphens', () => {
      expect(validateAgentName('typescript')).toEqual({ valid: true });
      expect(validateAgentName('rust')).toEqual({ valid: true });
    });
  });

  describe('Invalid agent names', () => {
    it('should reject empty strings', () => {
      const result = validateAgentName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject names with uppercase letters', () => {
      const result = validateAgentName('TypeScript-Expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject names with spaces', () => {
      const result = validateAgentName('typescript expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('alphanumeric');
    });

    it('should reject names with special characters', () => {
      const result = validateAgentName('typescript@expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('alphanumeric');
    });

    it('should reject names with underscores', () => {
      const result = validateAgentName('typescript_expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('alphanumeric');
    });

    it('should reject names starting with hyphen', () => {
      const result = validateAgentName('-typescript-expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot start or end with hyphen');
    });

    it('should reject names ending with hyphen', () => {
      const result = validateAgentName('typescript-expert-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot start or end with hyphen');
    });

    it('should reject names with consecutive hyphens', () => {
      const result = validateAgentName('typescript--expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('consecutive hyphens');
    });
  });

  describe('Reserved names', () => {
    it('should reject reserved scope names', () => {
      const result = validateAgentName('project');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    });

    it('should reject all scope-related reserved names', () => {
      const reservedNames = ['project', 'global', 'local', 'enterprise'];

      reservedNames.forEach(name => {
        const result = validateAgentName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved');
      });
    });

    it('should reject system-related reserved names', () => {
      const systemNames = ['system', 'admin', 'root', 'default'];

      systemNames.forEach(name => {
        const result = validateAgentName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved');
      });
    });

    it('should reject reserved names case-insensitively (after normalisation)', () => {
      // Note: This test expects validateAgentName to reject uppercase names first
      // But documents the intended behaviour for comparison
      expect(validateAgentName('PROJECT').valid).toBe(false);
      expect(validateAgentName('GLOBAL').valid).toBe(false);
    });
  });

  describe('Length validation', () => {
    it('should reject names longer than 64 characters', () => {
      const longName = 'a'.repeat(65);
      const result = validateAgentName(longName);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should accept names up to 64 characters', () => {
      const maxName = 'a'.repeat(64);
      expect(validateAgentName(maxName)).toEqual({ valid: true });
    });
  });

  describe('Sanitisation hint', () => {
    it('should suggest sanitised version for invalid names', () => {
      const result = validateAgentName('TypeScript Expert');
      expect(result.valid).toBe(false);
      expect(result.suggestion).toBe('typescript-expert');
    });

    it('should not provide suggestion for valid names', () => {
      const result = validateAgentName('typescript-expert');
      expect(result.suggestion).toBeUndefined();
    });
  });
});
