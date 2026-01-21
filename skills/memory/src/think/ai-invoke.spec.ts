/**
 * Tests for Think AI Invocation
 *
 * Note: These tests focus on prompt building and argument construction.
 * Actual CLI execution is not tested to avoid external dependencies.
 */

import { describe, it, expect } from 'bun:test';
import {
  buildUserPrompt,
  buildCliArgs,
  isClaudeCliAvailable,
} from './ai-invoke.js';
import { ThoughtType } from '../types/enums.js';
import type { ThoughtEntry } from '../types/think.js';

describe('think/ai-invoke', () => {
  describe('buildUserPrompt', () => {
    it('includes topic', () => {
      const prompt = buildUserPrompt({
        topic: 'Should we refactor?',
        thoughtType: ThoughtType.Thought,
        existingThoughts: [],
      });

      expect(prompt).toContain('## Topic');
      expect(prompt).toContain('Should we refactor?');
    });

    it('includes existing thoughts', () => {
      const thoughts: ThoughtEntry[] = [
        {
          timestamp: '2026-01-12T10:00:00Z',
          type: ThoughtType.Thought,
          content: 'First consideration',
        },
        {
          timestamp: '2026-01-12T10:05:00Z',
          type: ThoughtType.CounterArgument,
          content: 'But wait...',
          by: 'Claude',
        },
      ];

      const prompt = buildUserPrompt({
        topic: 'Test',
        thoughtType: ThoughtType.Thought,
        existingThoughts: thoughts,
      });

      expect(prompt).toContain('## Existing Thoughts');
      expect(prompt).toContain('First consideration');
      expect(prompt).toContain('But wait...');
      expect(prompt).toContain('(Claude)');
    });

    it('includes task for Thought type', () => {
      const prompt = buildUserPrompt({
        topic: 'Test',
        thoughtType: ThoughtType.Thought,
        existingThoughts: [],
      });

      expect(prompt).toContain('## Your Task');
      expect(prompt).toContain('thoughtful analysis');
    });

    it('includes task for CounterArgument type', () => {
      const prompt = buildUserPrompt({
        topic: 'Test',
        thoughtType: ThoughtType.CounterArgument,
        existingThoughts: [],
      });

      expect(prompt).toContain('counter-argument');
      expect(prompt).toContain('alternative perspective');
    });

    it('includes task for Branch type', () => {
      const prompt = buildUserPrompt({
        topic: 'Test',
        thoughtType: ThoughtType.Branch,
        existingThoughts: [],
      });

      expect(prompt).toContain('alternative approach');
      expect(prompt).toContain('different direction');
    });

    it('includes task for Conclusion type', () => {
      const prompt = buildUserPrompt({
        topic: 'Test',
        thoughtType: ThoughtType.Conclusion,
        existingThoughts: [],
      });

      expect(prompt).toContain('Synthesise');
      expect(prompt).toContain('conclusion');
    });

    it('includes guidance when provided', () => {
      const prompt = buildUserPrompt({
        topic: 'Test',
        thoughtType: ThoughtType.Thought,
        existingThoughts: [],
        guidance: 'Focus on performance implications',
      });

      expect(prompt).toContain('## Additional Guidance');
      expect(prompt).toContain('Focus on performance implications');
    });

    it('includes output format instructions', () => {
      const prompt = buildUserPrompt({
        topic: 'Test',
        thoughtType: ThoughtType.Thought,
        existingThoughts: [],
      });

      expect(prompt).toContain('## Output Format');
      expect(prompt).toContain('ONLY your thought content');
    });
  });

  describe('buildCliArgs', () => {
    it('includes --print flag', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: {},
      });

      expect(args).toContain('--print');
    });

    it('includes --no-session-persistence for sandbox compatibility', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: {},
      });

      expect(args).toContain('--no-session-persistence');
    });

    it('uses default model haiku', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: {},
      });

      expect(args).toContain('--model');
      expect(args[args.indexOf('--model') + 1]).toBe('haiku');
    });

    it('overrides model when specified', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: { model: 'sonnet' },
      });

      expect(args[args.indexOf('--model') + 1]).toBe('sonnet');
    });

    it('includes session ID for new session', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'new-session-id',
        options: {},
      });

      expect(args).toContain('--session-id');
      expect(args).toContain('new-session-id');
    });

    it('uses --resume when resuming session', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'ignored-id',
        options: { resume: 'existing-session-id' },
      });

      expect(args).toContain('--resume');
      expect(args).toContain('existing-session-id');
      expect(args).not.toContain('--session-id');
    });

    it('includes style as --system-prompt', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: {},
        styleContent: 'You are a helpful assistant.',
      });

      expect(args).toContain('--system-prompt');
      expect(args).toContain('You are a helpful assistant.');
    });

    it('includes agent as --append-system-prompt', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: {},
        agentBody: 'You are an expert in TypeScript.',
      });

      expect(args).toContain('--append-system-prompt');
      expect(args).toContain('You are an expert in TypeScript.');
    });

    it('includes both style and agent', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: {},
        styleContent: 'Base style',
        agentBody: 'Agent expertise',
      });

      expect(args).toContain('--system-prompt');
      expect(args).toContain('--append-system-prompt');
    });

    it('includes tools when specified', () => {
      const args = buildCliArgs({
        prompt: 'Test prompt',
        sessionId: 'test-session',
        options: { tools: ['Read', 'Grep'] },
      });

      expect(args).toContain('--tools');
      expect(args).toContain('Read,Grep');
    });

    it('puts prompt last', () => {
      const args = buildCliArgs({
        prompt: 'The actual prompt',
        sessionId: 'test-session',
        options: {},
      });

      expect(args[args.length - 1]).toBe('The actual prompt');
    });
  });

  describe('isClaudeCliAvailable', () => {
    it('returns boolean', () => {
      const result = isClaudeCliAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  // Note: invokeAI and getClaudeCliVersion are not tested here
  // as they require actual CLI execution. They should be tested
  // via integration tests or with proper process mocking.
});
