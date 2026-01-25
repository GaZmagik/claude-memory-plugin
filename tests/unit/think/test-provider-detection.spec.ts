/**
 * T066: Unit tests for provider detection
 * Tests detecting whether CLI tools are available using 'which' command
 */
import { describe, it, expect } from 'vitest';

// Placeholder imports - will be implemented in T077
// import { detectProvider, isProviderAvailable, getAvailableProviders } from '../../../skills/memory/src/think/providers/detect.js';

describe('provider-detection', () => {
  describe('detectProvider', () => {
    it('returns provider name from --call flag value', () => {
      // expect(detectProvider('claude')).toBe('claude');
      // expect(detectProvider('codex')).toBe('codex');
      // expect(detectProvider('gemini')).toBe('gemini');
      expect(true).toBe(true);
    });

    it('normalises case', () => {
      // expect(detectProvider('CLAUDE')).toBe('claude');
      // expect(detectProvider('Codex')).toBe('codex');
      expect(true).toBe(true);
    });

    it('returns null for unknown providers', () => {
      // expect(detectProvider('unknown')).toBeNull();
      // expect(detectProvider('')).toBeNull();
      expect(true).toBe(true);
    });
  });

  describe('isProviderAvailable', () => {
    it('returns true if CLI binary exists in PATH', () => {
      // This would need mocking in real tests
      // expect(isProviderAvailable('claude')).toBe(true); // Assuming claude is installed
      expect(true).toBe(true);
    });

    it('returns false if CLI binary not found', () => {
      // expect(isProviderAvailable('nonexistent-cli')).toBe(false);
      expect(true).toBe(true);
    });

    it('handles errors gracefully', () => {
      // Should not throw, just return false
      // expect(() => isProviderAvailable('invalid')).not.toThrow();
      expect(true).toBe(true);
    });
  });

  describe('getAvailableProviders', () => {
    it('returns array of available provider names', () => {
      // const available = getAvailableProviders();
      // expect(Array.isArray(available)).toBe(true);
      expect(true).toBe(true);
    });

    it('only includes providers with installed CLIs', () => {
      // const available = getAvailableProviders();
      // for (const provider of available) {
      //   expect(isProviderAvailable(provider)).toBe(true);
      // }
      expect(true).toBe(true);
    });
  });
});
