/**
 * Tests for validate-agent-name utility
 */

import { describe, it, expect } from 'vitest';
import { validateAgentName } from './validate-agent-name.js';

describe('validateAgentName', () => {
  describe('valid names', () => {
    it('accepts lowercase alphanumeric', () => {
      expect(validateAgentName('typescript')).toEqual({ valid: true });
    });

    it('accepts lowercase with hyphens', () => {
      expect(validateAgentName('typescript-expert')).toEqual({ valid: true });
    });

    it('accepts single character', () => {
      expect(validateAgentName('a')).toEqual({ valid: true });
    });

    it('accepts numbers', () => {
      expect(validateAgentName('agent123')).toEqual({ valid: true });
    });

    it('accepts hyphens with numbers', () => {
      expect(validateAgentName('agent-v2')).toEqual({ valid: true });
    });

    it('accepts 64 character name', () => {
      const name = 'a'.repeat(64);
      expect(validateAgentName(name)).toEqual({ valid: true });
    });
  });

  describe('empty names', () => {
    it('rejects empty string', () => {
      const result = validateAgentName('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects whitespace-only string', () => {
      const result = validateAgentName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('length validation', () => {
    it('rejects names longer than 64 characters', () => {
      const name = 'a'.repeat(65);
      const result = validateAgentName(name);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
      expect(result.error).toContain('64');
    });
  });

  describe('format validation', () => {
    it('rejects uppercase characters', () => {
      const result = validateAgentName('TypeScript');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
      expect(result.suggestion).toBe('typescript');
    });

    it('rejects spaces', () => {
      const result = validateAgentName('typescript expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
      expect(result.suggestion).toBe('typescript-expert');
    });

    it('rejects underscores', () => {
      const result = validateAgentName('typescript_expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
      expect(result.suggestion).toBe('typescript-expert');
    });

    it('rejects special characters', () => {
      const result = validateAgentName('typescript!expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });
  });

  describe('hyphen validation', () => {
    it('rejects leading hyphen', () => {
      const result = validateAgentName('-typescript');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('start or end with hyphen');
    });

    it('rejects trailing hyphen', () => {
      const result = validateAgentName('typescript-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('start or end with hyphen');
    });

    it('rejects consecutive hyphens', () => {
      const result = validateAgentName('typescript--expert');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('consecutive hyphens');
    });
  });

  describe('reserved names', () => {
    const reservedNames = [
      'project',
      'global',
      'local',
      'enterprise',
      'agent-project',
      'agent-global',
      'system',
      'admin',
      'root',
      'default',
      'config',
      'settings',
    ];

    for (const name of reservedNames) {
      it(`rejects reserved name "${name}"`, () => {
        const result = validateAgentName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved');
      });
    }
  });

  describe('suggestion generation', () => {
    it('provides suggestion for uppercase names', () => {
      const result = validateAgentName('TypeScript');
      expect(result.suggestion).toBe('typescript');
    });

    it('provides suggestion for spaced names', () => {
      const result = validateAgentName('TypeScript Expert');
      expect(result.suggestion).toBe('typescript-expert');
    });

    it('does not provide suggestion for empty input', () => {
      const result = validateAgentName('');
      expect(result.suggestion).toBeUndefined();
    });

    it('does not provide suggestion for reserved names', () => {
      const result = validateAgentName('project');
      expect(result.suggestion).toBeUndefined();
    });
  });
});
