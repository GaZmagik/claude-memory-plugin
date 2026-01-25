/**
 * Co-located tests for attribution.ts (T079)
 */
import { describe, it, expect } from 'vitest';
import { formatAttribution, parseAttribution } from './attribution.js';

describe('attribution', () => {
  describe('formatAttribution', () => {
    it('formats Claude attribution with model', () => {
      const attr = formatAttribution({ provider: 'claude', model: 'haiku' });
      expect(attr).toBe('Claude (haiku)');
    });

    it('formats Codex attribution', () => {
      const attr = formatAttribution({ provider: 'codex', model: 'gpt-5-codex' });
      expect(attr).toBe('Codex (gpt-5-codex)');
    });

    it('formats Gemini attribution', () => {
      const attr = formatAttribution({ provider: 'gemini', model: 'gemini-2.5-pro' });
      expect(attr).toBe('Gemini (gemini-2.5-pro)');
    });

    it('includes style when provided', () => {
      const attr = formatAttribution({ provider: 'claude', model: 'haiku', style: 'Devils-Advocate' });
      expect(attr).toBe('Claude (haiku) [Devils-Advocate]');
    });

    it('includes agent when provided', () => {
      const attr = formatAttribution({ provider: 'claude', model: 'haiku', agent: 'security-reviewer' });
      expect(attr).toBe('Claude (haiku) @security-reviewer');
    });

    it('handles missing model gracefully', () => {
      const attr = formatAttribution({ provider: 'claude' });
      expect(attr).toBe('Claude');
    });

    it('includes both style and agent when provided', () => {
      const attr = formatAttribution({ provider: 'claude', model: 'sonnet', style: 'Concise', agent: 'helper' });
      expect(attr).toBe('Claude (sonnet) [Concise] @helper');
    });
  });

  describe('parseAttribution', () => {
    it('parses provider and model from attribution string', () => {
      const parsed = parseAttribution('Claude (haiku)');
      expect(parsed.provider).toBe('claude');
      expect(parsed.model).toBe('haiku');
    });

    it('parses style from attribution string', () => {
      const parsed = parseAttribution('Claude (haiku) [Devils-Advocate]');
      expect(parsed.style).toBe('Devils-Advocate');
    });

    it('parses agent from attribution string', () => {
      const parsed = parseAttribution('Claude (haiku) @security-reviewer');
      expect(parsed.agent).toBe('security-reviewer');
    });

    it('parses all components', () => {
      const parsed = parseAttribution('Codex (gpt-5) [Style] @agent');
      expect(parsed.provider).toBe('codex');
      expect(parsed.model).toBe('gpt-5');
      expect(parsed.style).toBe('Style');
      expect(parsed.agent).toBe('agent');
    });

    it('handles malformed attribution gracefully', () => {
      const parsed = parseAttribution('Invalid');
      expect(parsed.provider).toBeUndefined();
    });

    it('handles provider-only string', () => {
      const parsed = parseAttribution('Gemini');
      expect(parsed.provider).toBe('gemini');
      expect(parsed.model).toBeUndefined();
    });
  });
});
