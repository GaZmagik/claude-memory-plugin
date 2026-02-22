/**
 * Unit tests for validate-selection.ts
 */

import { describe, it, expect } from 'vitest';
import { validateSelection, type SelectionResult } from './validate-selection.js';

describe('validateSelection', () => {
  const availableStyles = ['concise', 'detailed', 'technical'];
  const availableAgents = ['typescript-pro', 'rust-expert', 'python-expert'];

  describe('validation failures', () => {
    it('rejects selection with neither style nor agent', () => {
      const selection: SelectionResult = {};
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Selection must include style or agent');
    });

    it('rejects unknown style', () => {
      const selection: SelectionResult = { style: 'unknown-style' };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown style: unknown-style');
    });

    it('rejects unknown agent', () => {
      const selection: SelectionResult = { agent: 'unknown-agent' };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown agent: unknown-agent');
    });

    it('rejects both unknown style and agent (style checked first)', () => {
      const selection: SelectionResult = { style: 'bad-style', agent: 'bad-agent' };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown style: bad-style');
    });
  });

  describe('validation successes', () => {
    it('accepts valid style only', () => {
      const selection: SelectionResult = { style: 'concise' };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(true);
      expect(result.style).toBe('concise');
      expect(result.agent).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('accepts valid agent only', () => {
      const selection: SelectionResult = { agent: 'typescript-pro' };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(true);
      expect(result.agent).toBe('typescript-pro');
      expect(result.style).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('accepts both valid style and agent', () => {
      const selection: SelectionResult = { style: 'detailed', agent: 'rust-expert' };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(true);
      expect(result.style).toBe('detailed');
      expect(result.agent).toBe('rust-expert');
      expect(result.error).toBeUndefined();
    });

    it('preserves reason field when valid', () => {
      const selection: SelectionResult = {
        style: 'technical',
        reason: 'User prefers technical explanations'
      };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(true);
      expect(result.style).toBe('technical');
      expect(result.reason).toBe('User prefers technical explanations');
    });

    it('preserves all fields when both style and agent are valid', () => {
      const selection: SelectionResult = {
        style: 'concise',
        agent: 'python-expert',
        reason: 'Python code requires expert review'
      };
      const result = validateSelection(selection, availableStyles, availableAgents);

      expect(result.valid).toBe(true);
      expect(result.style).toBe('concise');
      expect(result.agent).toBe('python-expert');
      expect(result.reason).toBe('Python code requires expert review');
    });
  });

  describe('edge cases', () => {
    it('handles empty available styles array', () => {
      const selection: SelectionResult = { style: 'concise', agent: 'typescript-pro' };
      const result = validateSelection(selection, [], availableAgents);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown style: concise');
    });

    it('handles empty available agents array', () => {
      const selection: SelectionResult = { style: 'concise', agent: 'typescript-pro' };
      const result = validateSelection(selection, availableStyles, []);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown agent: typescript-pro');
    });

    it('handles both empty arrays with style only', () => {
      const selection: SelectionResult = { style: 'concise' };
      const result = validateSelection(selection, [], []);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown style: concise');
    });

    it('handles both empty arrays with agent only', () => {
      const selection: SelectionResult = { agent: 'typescript-pro' };
      const result = validateSelection(selection, [], []);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unknown agent: typescript-pro');
    });
  });
});
