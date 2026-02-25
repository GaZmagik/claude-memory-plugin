import { describe, it, expect } from 'vitest';
import { sanitiseAgentName } from '../../../skills/memory/src/scope/sanitise-agent-name.js';

describe('sanitiseAgentName', () => {
  describe('Basic sanitisation', () => {
    it('should convert to lowercase', () => {
      expect(sanitiseAgentName('TypeScript-Expert')).toBe('typescript-expert');
      expect(sanitiseAgentName('RUST-SYSTEMS')).toBe('rust-systems');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitiseAgentName('TypeScript Expert')).toBe('typescript-expert');
      expect(sanitiseAgentName('API  Architect')).toBe('api-architect');
    });

    it('should replace underscores with hyphens', () => {
      expect(sanitiseAgentName('API_Architect')).toBe('api-architect');
      expect(sanitiseAgentName('rust_systems_expert')).toBe('rust-systems-expert');
    });

    it('should remove non-alphanumeric characters except hyphens', () => {
      expect(sanitiseAgentName('Rust (Systems)')).toBe('rust-systems');
      expect(sanitiseAgentName('API@Architect!')).toBe('api-architect');
      expect(sanitiseAgentName('TypeScript#Expert$')).toBe('typescript-expert');
    });

    it('should collapse multiple hyphens to single hyphen', () => {
      expect(sanitiseAgentName('TypeScript---Expert')).toBe('typescript-expert');
      expect(sanitiseAgentName('API  -  Architect')).toBe('api-architect');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(sanitiseAgentName('-typescript-expert-')).toBe('typescript-expert');
      expect(sanitiseAgentName('---api-architect---')).toBe('api-architect');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitiseAgentName('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      expect(sanitiseAgentName('!@#$%^&*()')).toBe('');
    });

    it('should handle string with only spaces', () => {
      expect(sanitiseAgentName('   ')).toBe('');
    });

    it('should handle already-sanitised names', () => {
      expect(sanitiseAgentName('typescript-expert')).toBe('typescript-expert');
      expect(sanitiseAgentName('rust-systems')).toBe('rust-systems');
    });

    it('should handle single character names', () => {
      expect(sanitiseAgentName('A')).toBe('a');
      expect(sanitiseAgentName('X')).toBe('x');
    });

    it('should handle names with numbers', () => {
      expect(sanitiseAgentName('TypeScript5 Expert')).toBe('typescript5-expert');
      expect(sanitiseAgentName('API-v2-Architect')).toBe('api-v2-architect');
    });
  });

  describe('Unicode handling', () => {
    it('should remove non-ASCII characters', () => {
      expect(sanitiseAgentName('TypeScript™ Expert')).toBe('typescript-expert');
      expect(sanitiseAgentName('Rust © Systems')).toBe('rust-systems');
    });

    it('should handle emoji', () => {
      expect(sanitiseAgentName('TypeScript 🚀 Expert')).toBe('typescript-expert');
      expect(sanitiseAgentName('🎯 API Architect')).toBe('api-architect');
    });

    it('should handle accented characters by replacing them with hyphens', () => {
      expect(sanitiseAgentName('Café Expert')).toBe('caf-expert');
      expect(sanitiseAgentName('Naïve Architect')).toBe('na-ve-architect');
    });
  });

  describe('Real-world examples from research.md', () => {
    it('should match documented sanitisation examples', () => {
      expect(sanitiseAgentName('TypeScript Expert')).toBe('typescript-expert');
      expect(sanitiseAgentName('API_Architect')).toBe('api-architect');
      expect(sanitiseAgentName('Rust (Systems)')).toBe('rust-systems');
    });
  });
});
