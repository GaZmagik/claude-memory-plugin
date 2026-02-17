/**
 * Tests for Work Significance Classifier
 */

import { describe, it, expect } from 'vitest';
import { classifyWork, WorkSignificance } from './work-classifier.js';

describe('classifyWork', () => {
  describe('Trivial work', () => {
    it('classifies simple read operations as trivial', () => {
      const result = classifyWork('general-purpose', 'Read files and understand code');
      expect(result).toBe(WorkSignificance.Trivial);
    });

    it('classifies file searches as trivial', () => {
      const result = classifyWork('Explore', 'Search for files matching pattern');
      expect(result).toBe(WorkSignificance.Trivial);
    });

    it('classifies simple grep as trivial', () => {
      const result = classifyWork('general-purpose', 'Grep for keyword in codebase');
      expect(result).toBe(WorkSignificance.Trivial);
    });

    it('classifies short tasks as trivial (less than 50 chars)', () => {
      const result = classifyWork('test-agent', 'Quick check');
      expect(result).toBe(WorkSignificance.Trivial);
    });

    it('classifies status checks as trivial', () => {
      const result = classifyWork('general-purpose', 'Check git status');
      expect(result).toBe(WorkSignificance.Trivial);
    });
  });

  describe('Meaningful work', () => {
    it('classifies implementation tasks as meaningful', () => {
      const result = classifyWork(
        'typescript-expert',
        'Implement cross-scope auto-linking feature with metadata tracking and bidirectional edge storage'
      );
      expect(result).toBe(WorkSignificance.Meaningful);
    });

    it('classifies bug fixes as meaningful', () => {
      const result = classifyWork(
        'rust-expert',
        'Fix memory leak in async executor by properly dropping futures'
      );
      expect(result).toBe(WorkSignificance.Meaningful);
    });

    it('classifies testing work as meaningful', () => {
      const result = classifyWork(
        'test-quality-expert',
        'Write comprehensive test suite for new authentication module'
      );
      expect(result).toBe(WorkSignificance.Meaningful);
    });

    it('classifies refactoring as meaningful', () => {
      const result = classifyWork(
        'code-quality-expert',
        'Refactor payment processing module to improve maintainability and reduce coupling'
      );
      expect(result).toBe(WorkSignificance.Meaningful);
    });

    it('classifies review work as meaningful', () => {
      const result = classifyWork(
        'security-code-expert',
        'Complete security audit of authentication endpoints and identify vulnerabilities'
      );
      expect(result).toBe(WorkSignificance.Meaningful);
    });

    it('classifies design work as meaningful', () => {
      const result = classifyWork(
        'Plan',
        'Design implementation strategy for real-time collaboration feature'
      );
      expect(result).toBe(WorkSignificance.Meaningful);
    });
  });

  describe('Edge cases', () => {
    it('handles empty prompt', () => {
      const result = classifyWork('test-agent', '');
      expect(result).toBe(WorkSignificance.Trivial);
    });

    it('handles undefined subagent type', () => {
      const result = classifyWork(undefined, 'Some task description');
      expect(result).toBe(WorkSignificance.Trivial);
    });

    it('is case-insensitive for keywords', () => {
      const result = classifyWork('agent', 'IMPLEMENT new feature');
      expect(result).toBe(WorkSignificance.Meaningful);
    });

    it('detects multiple meaningful keywords', () => {
      const result = classifyWork(
        'agent',
        'Fix bug and write tests for the authentication module'
      );
      expect(result).toBe(WorkSignificance.Meaningful);
    });
  });

  describe('Keyword detection', () => {
    const meaningfulKeywords = [
      'implement',
      'fix',
      'refactor',
      'design',
      'review',
      'test',
      'optimize',
      'debug',
      'create',
      'build',
    ];

    meaningfulKeywords.forEach(keyword => {
      it(`detects "${keyword}" as meaningful work`, () => {
        const result = classifyWork('agent', `Please ${keyword} the feature`);
        expect(result).toBe(WorkSignificance.Meaningful);
      });
    });

    const trivialKeywords = ['read', 'search', 'find', 'grep', 'check', 'list'];

    trivialKeywords.forEach(keyword => {
      it(`detects "${keyword}" as trivial work`, () => {
        const result = classifyWork('agent', `Please ${keyword} the files`);
        expect(result).toBe(WorkSignificance.Trivial);
      });
    });
  });
});
