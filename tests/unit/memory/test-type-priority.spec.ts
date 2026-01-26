/**
 * T023: Unit test for memory type prioritisation (gotcha > decision > learning)
 */

import { describe, it, expect } from 'vitest';

// Import will fail until implementation exists (TDD Red phase)
import {
  prioritiseMemories,
  MEMORY_TYPE_PRIORITY,
  type ScoredMemory,
} from '../../../hooks/src/memory/enhanced-injector.js';

describe('Memory Type Prioritisation', () => {
  describe('MEMORY_TYPE_PRIORITY', () => {
    it('should rank gotcha highest (lowest number)', () => {
      expect(MEMORY_TYPE_PRIORITY.gotcha).toBeLessThan(MEMORY_TYPE_PRIORITY.decision);
      expect(MEMORY_TYPE_PRIORITY.gotcha).toBeLessThan(MEMORY_TYPE_PRIORITY.learning);
    });

    it('should rank decision higher than learning', () => {
      expect(MEMORY_TYPE_PRIORITY.decision).toBeLessThan(MEMORY_TYPE_PRIORITY.learning);
    });
  });

  describe('prioritiseMemories()', () => {
    const makeMemory = (type: string, score: number): ScoredMemory => ({
      id: `${type}-${score}`,
      type,
      title: `Test ${type}`,
      score,
    });

    it('should sort gotchas before decisions with same score', () => {
      const memories: ScoredMemory[] = [
        makeMemory('decision', 0.8),
        makeMemory('gotcha', 0.8),
      ];

      const result = prioritiseMemories(memories);

      expect(result[0]?.type).toBe('gotcha');
      expect(result[1]?.type).toBe('decision');
    });

    it('should sort decisions before learnings with same score', () => {
      const memories: ScoredMemory[] = [
        makeMemory('learning', 0.7),
        makeMemory('decision', 0.7),
      ];

      const result = prioritiseMemories(memories);

      expect(result[0]?.type).toBe('decision');
      expect(result[1]?.type).toBe('learning');
    });

    it('should sort by score within same type', () => {
      const memories: ScoredMemory[] = [
        makeMemory('gotcha', 0.6),
        makeMemory('gotcha', 0.9),
        makeMemory('gotcha', 0.7),
      ];

      const result = prioritiseMemories(memories);

      expect(result[0]?.score).toBe(0.9);
      expect(result[1]?.score).toBe(0.7);
      expect(result[2]?.score).toBe(0.6);
    });

    it('should prioritise type over score', () => {
      const memories: ScoredMemory[] = [
        makeMemory('learning', 0.95),
        makeMemory('gotcha', 0.5),
      ];

      const result = prioritiseMemories(memories);

      // Gotcha first despite lower score
      expect(result[0]?.type).toBe('gotcha');
    });

    it('should handle empty array', () => {
      const result = prioritiseMemories([]);
      expect(result).toEqual([]);
    });

    it('should handle all three types', () => {
      const memories: ScoredMemory[] = [
        makeMemory('learning', 0.8),
        makeMemory('gotcha', 0.6),
        makeMemory('decision', 0.7),
      ];

      const result = prioritiseMemories(memories);

      expect(result.map(m => m.type)).toEqual(['gotcha', 'decision', 'learning']);
    });
  });
});
