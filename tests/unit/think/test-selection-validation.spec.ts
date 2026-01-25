/**
 * T043 [US2] Unit test for selection validation against discovery whitelist
 * TDD Red Phase - Tests written before implementation
 */
import { describe, it, expect } from 'vitest';
import { validateSelection, type SelectionResult } from '../../../skills/memory/src/think/validate-selection.js';

describe('validate-selection', () => {
  const availableStyles = ['Devils-Advocate', 'Socratic', 'Concise', 'ELI5'];
  const availableAgents = ['recall', 'curator'];

  describe('validateSelection', () => {
    it('accepts valid style selection', () => {
      const selection: SelectionResult = { style: 'Devils-Advocate', reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.valid).toBe(true);
      expect(result.style).toBe('Devils-Advocate');
    });

    it('accepts valid agent selection', () => {
      const selection: SelectionResult = { agent: 'recall', reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.valid).toBe(true);
      expect(result.agent).toBe('recall');
    });

    it('rejects unknown style', () => {
      const selection: SelectionResult = { style: 'NonExistent', reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.valid).toBe(false);
    });

    it('rejects unknown agent', () => {
      const selection: SelectionResult = { agent: 'unknown', reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.valid).toBe(false);
    });

    it('is case sensitive for style names', () => {
      const selection: SelectionResult = { style: 'devils-advocate', reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.valid).toBe(false);
    });

    it('rejects selection without style or agent', () => {
      const selection: SelectionResult = { reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.valid).toBe(false);
    });

    it('accepts selection with both style and agent', () => {
      const selection: SelectionResult = { style: 'Concise', agent: 'recall', reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.valid).toBe(true);
    });

    it('preserves reason in validated result', () => {
      const selection: SelectionResult = { style: 'Concise', reason: 'Security analysis needed' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.reason).toBe('Security analysis needed');
    });

    it('returns error message for invalid selection', () => {
      const selection: SelectionResult = { style: 'Unknown', reason: 'Test' };
      const result = validateSelection(selection, availableStyles, availableAgents);
      expect(result.error).toBeDefined();
    });
  });
});
