/**
 * Unit tests for CircuitBreaker
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 });
  });

  describe('initial state', () => {
    it('starts closed (canExecute = true)', () => {
      expect(breaker.canExecute()).toBe(true);
    });

    it('starts with zero failures', () => {
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('isOpen returns false initially', () => {
      expect(breaker.isOpen()).toBe(false);
    });

    it('isHalfOpen returns false initially', () => {
      expect(breaker.isHalfOpen()).toBe(false);
    });
  });

  describe('recordFailure', () => {
    it('increments failure count', () => {
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(1);
    });

    it('opens circuit after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);
      expect(breaker.canExecute()).toBe(false);
    });
  });

  describe('recordSuccess', () => {
    it('resets failure count to zero', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('closes circuit after success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);
      breaker.recordSuccess();
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.reset();
      expect(breaker.getFailureCount()).toBe(0);
      expect(breaker.isOpen()).toBe(false);
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('half-open state', () => {
    it('transitions to half-open after timeout', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);

      await new Promise((r) => setTimeout(r, 150));

      expect(breaker.isHalfOpen()).toBe(true);
      expect(breaker.canExecute()).toBe(true);
    });
  });
});
