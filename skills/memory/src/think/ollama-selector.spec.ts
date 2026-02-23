/**
 * Unit tests for ollama-selector.ts
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildSelectionPrompt, parseSelectionResponse } from './ollama-selector.js';
import * as sanitiseModule from './sanitise.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildSelectionPrompt', () => {
  describe('basic prompt structure', () => {
    it('builds prompt with styles and agents', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('test thought');

      const result = buildSelectionPrompt(
        'test thought',
        ['Concise', 'Detailed'],
        ['typescript-pro', 'rust-expert'],
        []
      );

      expect(result).toContain('Select output style for thinking session');
      expect(result).toContain('Thought: "test thought"');
      expect(result).toContain('Available styles: Concise, Detailed');
      expect(result).toContain('Available agents: typescript-pro, rust-expert');
      expect(result).toContain('Respond with JSON');
    });

    it('handles no styles available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', [], ['agent-1'], []);

      expect(result).toContain('No styles available');
      expect(result).toContain('Available agents: agent-1');
    });

    it('handles no agents available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', ['Style1'], [], []);

      expect(result).toContain('Available styles: Style1');
      expect(result).not.toContain('Available agents:');
    });

    it('handles neither styles nor agents', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', [], [], []);

      expect(result).toContain('No styles available');
      expect(result).not.toContain('Available agents:');
    });
  });

  describe('thought sanitisation', () => {
    it('calls sanitiseForPrompt with 500 char limit', () => {
      const spy = vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('sanitised');

      buildSelectionPrompt('original thought', ['Style1'], [], []);

      expect(spy).toHaveBeenCalledWith('original thought', 500);
    });

    it('uses sanitised thought in prompt', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('sanitised output');

      const result = buildSelectionPrompt('original', ['Style1'], [], []);

      expect(result).toContain('Thought: "sanitised output"');
      expect(result).not.toContain('original');
    });
  });

  describe('avoid styles filtering', () => {
    it('filters out avoided styles', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt(
        'thought',
        ['Concise', 'Detailed', 'Technical'],
        [],
        ['Detailed']
      );

      expect(result).toContain('Available styles: Concise, Technical');
      expect(result).not.toContain('Detailed');
    });

    it('handles all styles being avoided', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt(
        'thought',
        ['Style1', 'Style2'],
        [],
        ['Style1', 'Style2']
      );

      expect(result).toContain('No styles available');
    });

    it('handles empty avoid list', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt(
        'thought',
        ['Style1', 'Style2'],
        [],
        []
      );

      expect(result).toContain('Available styles: Style1, Style2');
    });
  });

  describe('style-specific rules', () => {
    it('includes Devils-Advocate rule when available and not avoided', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt(
        'thought',
        ['Devils-Advocate', 'Other'],
        [],
        []
      );

      expect(result).toContain('Rules:');
      expect(result).toContain('- Security/risk topics: Devils-Advocate');
    });

    it('excludes Devils-Advocate rule when avoided', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt(
        'thought',
        ['Devils-Advocate'],
        [],
        ['Devils-Advocate']
      );

      expect(result).not.toContain('Security/risk topics');
    });

    it('includes Socratic rule when available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', ['Socratic'], [], []);

      expect(result).toContain('- Design/architecture: Socratic');
    });

    it('includes Comparative rule when available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', ['Comparative'], [], []);

      expect(result).toContain('- Comparisons: Comparative');
    });

    it('includes Concise rule when available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', ['Concise'], [], []);

      expect(result).toContain('- Summaries: Concise');
    });

    it('includes ELI5 rule when available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', ['ELI5'], [], []);

      expect(result).toContain('- Explanations: ELI5');
    });

    it('includes multiple rules when multiple special styles available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt(
        'thought',
        ['Devils-Advocate', 'Socratic', 'Concise'],
        [],
        []
      );

      expect(result).toContain('Rules:');
      expect(result).toContain('Devils-Advocate');
      expect(result).toContain('Socratic');
      expect(result).toContain('Concise');
    });

    it('omits rules section when no special styles available', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', ['Generic', 'Other'], [], []);

      expect(result).not.toContain('Rules:');
    });

    it('does not include rule if style not in available list', () => {
      vi.spyOn(sanitiseModule, 'sanitiseForPrompt').mockReturnValue('thought');

      const result = buildSelectionPrompt('thought', ['Other'], [], []);

      expect(result).not.toContain('Devils-Advocate');
      expect(result).not.toContain('Socratic');
    });
  });
});

describe('parseSelectionResponse', () => {
  describe('successful parsing', () => {
    it('parses valid JSON with style', () => {
      const response = '{"style": "Concise", "reason": "Brief summary needed"}';
      const result = parseSelectionResponse(response);

      expect(result).toEqual({
        style: 'Concise',
        agent: undefined,
        reason: 'Brief summary needed'
      });
    });

    it('parses valid JSON with agent', () => {
      const response = '{"agent": "typescript-pro", "reason": "TypeScript expertise required"}';
      const result = parseSelectionResponse(response);

      expect(result).toEqual({
        style: undefined,
        agent: 'typescript-pro',
        reason: 'TypeScript expertise required'
      });
    });

    it('parses valid JSON with both style and agent', () => {
      const response = '{"style": "Detailed", "agent": "rust-expert", "reason": "Complex Rust analysis"}';
      const result = parseSelectionResponse(response);

      expect(result).toEqual({
        style: 'Detailed',
        agent: 'rust-expert',
        reason: 'Complex Rust analysis'
      });
    });

    it('extracts JSON from text with surrounding content', () => {
      const response = 'Here is my selection: {"style": "Concise", "reason": "test"} Done.';
      const result = parseSelectionResponse(response);

      expect(result).toEqual({
        style: 'Concise',
        agent: undefined,
        reason: 'test'
      });
    });

    it('defaults reason to "No reason" when missing', () => {
      const response = '{"style": "Concise"}';
      const result = parseSelectionResponse(response);

      expect(result).toEqual({
        style: 'Concise',
        agent: undefined,
        reason: 'No reason'
      });
    });
  });

  describe('parsing failures', () => {
    it('returns null when no JSON found', () => {
      const response = 'This is just plain text without JSON';
      const result = parseSelectionResponse(response);

      expect(result).toBeNull();
    });

    it('returns null when JSON has neither style nor agent', () => {
      const response = '{"reason": "Only has reason"}';
      const result = parseSelectionResponse(response);

      expect(result).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      const response = '{invalid json}';
      const result = parseSelectionResponse(response);

      expect(result).toBeNull();
    });

    it('returns null for empty response', () => {
      const response = '';
      const result = parseSelectionResponse(response);

      expect(result).toBeNull();
    });

    it('returns null for malformed JSON with missing closing brace', () => {
      const response = '{"style": "Concise"';
      const result = parseSelectionResponse(response);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles JSON with extra fields', () => {
      const response = '{"style": "Concise", "reason": "test", "extra": "field", "another": 123}';
      const result = parseSelectionResponse(response);

      expect(result).toEqual({
        style: 'Concise',
        agent: undefined,
        reason: 'test'
      });
    });

    it('handles whitespace in JSON', () => {
      const response = '{ "style" : "Concise" , "reason" : "test" }';
      const result = parseSelectionResponse(response);

      expect(result?.style).toBe('Concise');
    });

    it('handles newlines in JSON', () => {
      const response = `{
        "style": "Concise",
        "reason": "test"
      }`;
      const result = parseSelectionResponse(response);

      expect(result?.style).toBe('Concise');
    });

    it('uses first JSON match when multiple present', () => {
      const response = '{"style": "First", "reason": "1"} and {"style": "Second", "reason": "2"}';
      const result = parseSelectionResponse(response);

      expect(result?.style).toBe('First');
    });
  });
});
