/**
 * Tests for sanitise-agent-name utility
 */

import { describe, it, expect } from 'vitest';
import { sanitiseAgentName } from './sanitise-agent-name.js';

describe('sanitiseAgentName', () => {
  describe('case conversion', () => {
    it('converts uppercase to lowercase', () => {
      expect(sanitiseAgentName('TypeScript')).toBe('typescript');
    });

    it('converts mixed case to lowercase', () => {
      expect(sanitiseAgentName('TypeScript-Expert')).toBe('typescript-expert');
    });
  });

  describe('whitespace handling', () => {
    it('replaces spaces with hyphens', () => {
      expect(sanitiseAgentName('typescript expert')).toBe('typescript-expert');
    });

    it('replaces multiple spaces with single hyphen', () => {
      expect(sanitiseAgentName('typescript   expert')).toBe('typescript-expert');
    });

    it('handles tabs and newlines', () => {
      expect(sanitiseAgentName('typescript\texpert')).toBe('typescript-expert');
    });
  });

  describe('underscore handling', () => {
    it('replaces underscores with hyphens', () => {
      expect(sanitiseAgentName('typescript_expert')).toBe('typescript-expert');
    });

    it('replaces multiple underscores with single hyphen', () => {
      expect(sanitiseAgentName('typescript___expert')).toBe('typescript-expert');
    });
  });

  describe('special character handling', () => {
    it('removes parentheses', () => {
      expect(sanitiseAgentName('rust (systems)')).toBe('rust-systems');
    });

    it('removes brackets', () => {
      expect(sanitiseAgentName('rust [expert]')).toBe('rust-expert');
    });

    it('removes dots', () => {
      expect(sanitiseAgentName('node.js')).toBe('node-js');
    });

    it('removes special symbols', () => {
      expect(sanitiseAgentName('c++ expert!')).toBe('c-expert');
    });
  });

  describe('hyphen normalisation', () => {
    it('collapses multiple hyphens to single', () => {
      expect(sanitiseAgentName('typescript--expert')).toBe('typescript-expert');
    });

    it('removes leading hyphens', () => {
      expect(sanitiseAgentName('-typescript-expert')).toBe('typescript-expert');
    });

    it('removes trailing hyphens', () => {
      expect(sanitiseAgentName('typescript-expert-')).toBe('typescript-expert');
    });

    it('removes both leading and trailing hyphens', () => {
      expect(sanitiseAgentName('--typescript-expert--')).toBe('typescript-expert');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for empty input', () => {
      expect(sanitiseAgentName('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(sanitiseAgentName('   ')).toBe('');
    });

    it('returns empty string for special-characters-only input', () => {
      expect(sanitiseAgentName('!@#$%')).toBe('');
    });

    it('handles single valid character', () => {
      expect(sanitiseAgentName('a')).toBe('a');
    });

    it('preserves numbers', () => {
      expect(sanitiseAgentName('agent123')).toBe('agent123');
    });

    it('handles numbers with hyphens', () => {
      expect(sanitiseAgentName('agent-v2-beta')).toBe('agent-v2-beta');
    });
  });

  describe('examples from docstring', () => {
    it('sanitises "TypeScript Expert" to "typescript-expert"', () => {
      expect(sanitiseAgentName('TypeScript Expert')).toBe('typescript-expert');
    });

    it('sanitises "API_Architect" to "api-architect"', () => {
      expect(sanitiseAgentName('API_Architect')).toBe('api-architect');
    });

    it('sanitises "Rust (Systems)" to "rust-systems"', () => {
      expect(sanitiseAgentName('Rust (Systems)')).toBe('rust-systems');
    });
  });
});
