/**
 * Circuit breaker for Ollama calls
 * Prevents cascading failures and enables graceful degradation
 */

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting reset */
  resetTimeoutMs: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Check if circuit is open (blocking requests)
   */
  isOpen(): boolean {
    this.checkHalfOpen();
    return this.state === 'open';
  }

  /**
   * Check if circuit is in half-open state (testing)
   */
  isHalfOpen(): boolean {
    this.checkHalfOpen();
    return this.state === 'half-open';
  }

  /**
   * Check if a request can be executed
   */
  canExecute(): boolean {
    this.checkHalfOpen();
    return this.state !== 'open';
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }

  /**
   * Check if we should transition to half-open
   */
  private checkHalfOpen(): void {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = 'half-open';
        this.failureCount = 0; // Reset for fresh evaluation
      }
    }
  }
}
