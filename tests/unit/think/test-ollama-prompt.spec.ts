/**
 * T042 [US2] Unit test for Ollama prompt building with avoid list
 * TDD Red Phase - Tests written before implementation
 */
import { describe, it, expect } from 'vitest';
import { buildSelectionPrompt } from '../../../skills/memory/src/think/ollama-selector.js';

describe('ollama-selector', () => {
  describe('buildSelectionPrompt', () => {
    const availableStyles = ['Devils-Advocate', 'Socratic', 'Concise', 'ELI5', 'Comparative'];
    const availableAgents = ['recall', 'curator'];

    it('includes the thought content in prompt', () => {
      const prompt = buildSelectionPrompt('Test thought', availableStyles, availableAgents, []);
      expect(prompt).toContain('Test thought');
    });

    it('includes available styles in prompt', () => {
      const prompt = buildSelectionPrompt('Test', availableStyles, availableAgents, []);
      expect(prompt).toContain('Devils-Advocate');
      expect(prompt).toContain('Socratic');
    });

    it('includes available agents in prompt', () => {
      const prompt = buildSelectionPrompt('Test', availableStyles, availableAgents, []);
      expect(prompt).toContain('recall');
      expect(prompt).toContain('curator');
    });

    it('excludes styles in avoid list from prompt', () => {
      const prompt = buildSelectionPrompt('Test', availableStyles, availableAgents, ['Devils-Advocate']);
      expect(prompt).not.toContain('Devils-Advocate');
      expect(prompt).toContain('Socratic');
    });

    it('requests JSON output format', () => {
      const prompt = buildSelectionPrompt('Test', availableStyles, availableAgents, []);
      expect(prompt.toLowerCase()).toContain('json');
    });

    it('specifies expected response structure', () => {
      const prompt = buildSelectionPrompt('Test', availableStyles, availableAgents, []);
      expect(prompt).toContain('style');
      expect(prompt).toContain('reason');
    });

    it('handles empty styles list', () => {
      const prompt = buildSelectionPrompt('Test', [], availableAgents, []);
      expect(prompt).toBeDefined();
    });

    it('handles empty agents list', () => {
      const prompt = buildSelectionPrompt('Test', availableStyles, [], []);
      expect(prompt).toBeDefined();
    });
  });
});
