/**
 * Tests for Think Validation
 */

import { describe, it, expect } from 'bun:test';
import {
  validateThinkCreate,
  validateThinkAdd,
  validateThinkConclude,
  validateThinkUse,
  validateThinkDelete,
  isValidTopic,
  isValidThinkScope,
  isValidThinkStatus,
  isValidThoughtType,
  isValidPromotionType,
  isValidThoughtContent,
} from './validation.js';
import { Scope, ThinkStatus, ThoughtType, MemoryType } from '../types/enums.js';

describe('think/validation', () => {
  describe('isValidTopic', () => {
    it('accepts non-empty strings', () => {
      expect(isValidTopic('My topic')).toBe(true);
      expect(isValidTopic('A')).toBe(true);
      expect(isValidTopic('Topic with numbers 123')).toBe(true);
    });

    it('rejects empty and invalid values', () => {
      expect(isValidTopic('')).toBe(false);
      expect(isValidTopic('   ')).toBe(false);
      expect(isValidTopic(null)).toBe(false);
      expect(isValidTopic(undefined)).toBe(false);
      expect(isValidTopic(123)).toBe(false);
    });
  });

  describe('isValidThinkScope', () => {
    it('accepts Project and Local scopes', () => {
      expect(isValidThinkScope(Scope.Project)).toBe(true);
      expect(isValidThinkScope(Scope.Local)).toBe(true);
    });

    it('rejects Global and Enterprise scopes', () => {
      expect(isValidThinkScope(Scope.Global)).toBe(false);
      expect(isValidThinkScope(Scope.Enterprise)).toBe(false);
    });

    it('rejects invalid values', () => {
      expect(isValidThinkScope('invalid')).toBe(false);
      expect(isValidThinkScope(null)).toBe(false);
    });
  });

  describe('isValidThinkStatus', () => {
    it('accepts valid statuses', () => {
      expect(isValidThinkStatus(ThinkStatus.Active)).toBe(true);
      expect(isValidThinkStatus(ThinkStatus.Concluded)).toBe(true);
    });

    it('rejects invalid values', () => {
      expect(isValidThinkStatus('invalid')).toBe(false);
      expect(isValidThinkStatus('pending')).toBe(false);
    });
  });

  describe('isValidThoughtType', () => {
    it('accepts all thought types', () => {
      expect(isValidThoughtType(ThoughtType.Thought)).toBe(true);
      expect(isValidThoughtType(ThoughtType.CounterArgument)).toBe(true);
      expect(isValidThoughtType(ThoughtType.Branch)).toBe(true);
      expect(isValidThoughtType(ThoughtType.Conclusion)).toBe(true);
    });

    it('rejects invalid values', () => {
      expect(isValidThoughtType('invalid')).toBe(false);
      expect(isValidThoughtType('idea')).toBe(false);
    });
  });

  describe('isValidPromotionType', () => {
    it('accepts promotable memory types', () => {
      expect(isValidPromotionType(MemoryType.Decision)).toBe(true);
      expect(isValidPromotionType(MemoryType.Learning)).toBe(true);
      expect(isValidPromotionType(MemoryType.Artifact)).toBe(true);
      expect(isValidPromotionType(MemoryType.Gotcha)).toBe(true);
    });

    it('rejects non-promotable types', () => {
      expect(isValidPromotionType(MemoryType.Breadcrumb)).toBe(false);
      expect(isValidPromotionType(MemoryType.Hub)).toBe(false);
    });
  });

  describe('isValidThoughtContent', () => {
    it('accepts non-empty strings', () => {
      expect(isValidThoughtContent('This is a thought')).toBe(true);
      expect(isValidThoughtContent('A')).toBe(true);
      expect(isValidThoughtContent('Thought with\nnewlines')).toBe(true);
    });

    it('rejects empty and invalid values', () => {
      expect(isValidThoughtContent('')).toBe(false);
      expect(isValidThoughtContent('   ')).toBe(false);
      expect(isValidThoughtContent(null)).toBe(false);
      expect(isValidThoughtContent(undefined)).toBe(false);
      expect(isValidThoughtContent(123)).toBe(false);
    });
  });

  describe('validateThinkCreate', () => {
    it('validates valid create request', () => {
      const result = validateThinkCreate({ topic: 'My topic' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates with scope', () => {
      const result = validateThinkCreate({ topic: 'My topic', scope: Scope.Local });
      expect(result.valid).toBe(true);
    });

    it('rejects missing topic', () => {
      const result = validateThinkCreate({});
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'topic')).toBe(true);
    });

    it('rejects invalid scope', () => {
      const result = validateThinkCreate({ topic: 'My topic', scope: Scope.Global });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'scope')).toBe(true);
    });
  });

  describe('validateThinkAdd', () => {
    it('validates valid add request', () => {
      const result = validateThinkAdd({
        thought: 'My thought',
        type: ThoughtType.Thought,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing thought', () => {
      const result = validateThinkAdd({ type: ThoughtType.Thought });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'thought')).toBe(true);
    });

    it('rejects invalid type', () => {
      const result = validateThinkAdd({ thought: 'My thought', type: 'invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('rejects invalid documentId format', () => {
      const result = validateThinkAdd({
        thought: 'My thought',
        type: ThoughtType.Thought,
        documentId: 'invalid-id',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'documentId')).toBe(true);
    });

    it('accepts valid documentId', () => {
      const result = validateThinkAdd({
        thought: 'My thought',
        type: ThoughtType.Thought,
        documentId: 'think-20260112-103000',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('validateThinkConclude', () => {
    it('validates valid conclude request', () => {
      const result = validateThinkConclude({ conclusion: 'My conclusion' });
      expect(result.valid).toBe(true);
    });

    it('validates with promotion type', () => {
      const result = validateThinkConclude({
        conclusion: 'My conclusion',
        promote: MemoryType.Decision,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid promotion type', () => {
      const result = validateThinkConclude({
        conclusion: 'My conclusion',
        promote: MemoryType.Hub,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'promote')).toBe(true);
    });
  });

  describe('validateThinkUse', () => {
    it('validates valid use request', () => {
      const result = validateThinkUse({ documentId: 'think-20260112-103000' });
      expect(result.valid).toBe(true);
    });

    it('rejects missing documentId', () => {
      const result = validateThinkUse({});
      expect(result.valid).toBe(false);
    });

    it('rejects invalid documentId', () => {
      const result = validateThinkUse({ documentId: 'invalid' });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateThinkDelete', () => {
    it('validates valid delete request', () => {
      const result = validateThinkDelete({ documentId: 'think-20260112-103000' });
      expect(result.valid).toBe(true);
    });

    it('rejects missing documentId', () => {
      const result = validateThinkDelete({});
      expect(result.valid).toBe(false);
    });
  });
});
