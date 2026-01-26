/**
 * T024: Unit test for session deduplication cache
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import will fail until implementation exists (TDD Red phase)
import {
  InjectionDeduplicator,
  createDeduplicationKey,
} from '../../../hooks/src/memory/enhanced-injector.js';

describe('Session Deduplication Cache', () => {
  describe('createDeduplicationKey()', () => {
    it('should create key from memoryId and type', () => {
      const key = createDeduplicationKey('decision-use-postgres', 'decision');
      expect(key).toBe('decision-use-postgres:decision');
    });

    it('should create unique keys for same memory different types', () => {
      const key1 = createDeduplicationKey('my-memory', 'gotcha');
      const key2 = createDeduplicationKey('my-memory', 'decision');
      expect(key1).not.toBe(key2);
    });
  });

  describe('InjectionDeduplicator', () => {
    let dedup: InjectionDeduplicator;

    beforeEach(() => {
      dedup = new InjectionDeduplicator();
    });

    it('should return true for first occurrence', () => {
      const result = dedup.shouldInject('memory-1', 'gotcha');
      expect(result).toBe(true);
    });

    it('should return false for duplicate', () => {
      dedup.shouldInject('memory-1', 'gotcha');
      const result = dedup.shouldInject('memory-1', 'gotcha');
      expect(result).toBe(false);
    });

    it('should allow same memory with different type', () => {
      dedup.shouldInject('memory-1', 'gotcha');
      const result = dedup.shouldInject('memory-1', 'decision');
      expect(result).toBe(true);
    });

    it('should track multiple memories independently', () => {
      expect(dedup.shouldInject('memory-1', 'gotcha')).toBe(true);
      expect(dedup.shouldInject('memory-2', 'gotcha')).toBe(true);
      expect(dedup.shouldInject('memory-1', 'gotcha')).toBe(false);
      expect(dedup.shouldInject('memory-2', 'gotcha')).toBe(false);
    });

    it('should have clear() method to reset', () => {
      dedup.shouldInject('memory-1', 'gotcha');
      dedup.clear();
      const result = dedup.shouldInject('memory-1', 'gotcha');
      expect(result).toBe(true);
    });

    it('should have size() method', () => {
      expect(dedup.size()).toBe(0);
      dedup.shouldInject('memory-1', 'gotcha');
      expect(dedup.size()).toBe(1);
      dedup.shouldInject('memory-2', 'decision');
      expect(dedup.size()).toBe(2);
    });
  });
});
