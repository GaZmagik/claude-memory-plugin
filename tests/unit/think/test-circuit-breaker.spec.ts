/**
 * T044 [US2] Unit test for circuit breaker state tracking
 * TDD Red Phase - Tests written before implementation
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../../../skills/memory/src/think/circuit-breaker.js';

describe('circuit-breaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 });
  });

  describe('initial state', () => {
    it('starts in closed state', () => {
      expect(breaker.isOpen()).toBe(false);
    });

    it('allows requests initially', () => {
      expect(breaker.canExecute()).toBe(true);
    });

    it('has zero failure count', () => {
      expect(breaker.getFailureCount()).toBe(0);
    });
  });

  describe('failure tracking', () => {
    it('increments failure count on recordFailure', () => {
      breaker.recordFailure();
      expect(breaker.getFailureCount()).toBe(1);
    });

    it('opens circuit after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);
    });

    it('blocks requests when open', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(false);
    });
  });

  describe('success tracking', () => {
    it('resets failure count on success', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();
      expect(breaker.getFailureCount()).toBe(0);
    });

    it('keeps circuit closed after success', () => {
      breaker.recordFailure();
      breaker.recordSuccess();
      expect(breaker.isOpen()).toBe(false);
    });
  });

  describe('reset behaviour', () => {
    it('transitions to half-open after timeout', async () => {
      const fastBreaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      fastBreaker.recordFailure();
      expect(fastBreaker.isOpen()).toBe(true);

      await new Promise((r) => setTimeout(r, 60));
      expect(fastBreaker.isHalfOpen()).toBe(true);
    });

    it('allows one request in half-open state', async () => {
      const fastBreaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      fastBreaker.recordFailure();
      await new Promise((r) => setTimeout(r, 60));

      expect(fastBreaker.canExecute()).toBe(true);
    });

    it('closes circuit on success in half-open state', async () => {
      const fastBreaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      fastBreaker.recordFailure();
      await new Promise((r) => setTimeout(r, 60));

      fastBreaker.recordSuccess();
      expect(fastBreaker.isOpen()).toBe(false);
      expect(fastBreaker.isHalfOpen()).toBe(false);
    });

    it('reopens circuit on failure in half-open state', async () => {
      const fastBreaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
      fastBreaker.recordFailure();
      await new Promise((r) => setTimeout(r, 60));

      fastBreaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);
    });
  });

  describe('manual reset', () => {
    it('can be manually reset', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.reset();

      expect(breaker.isOpen()).toBe(false);
      expect(breaker.getFailureCount()).toBe(0);
    });
  });
});
