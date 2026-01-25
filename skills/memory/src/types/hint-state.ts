/**
 * HintState Type Definitions
 *
 * Defines the state structure for tracking hint display
 * across a session with progressive disclosure.
 */

/**
 * Hint state persisted to disk
 */
export interface HintState {
  /** Session identifier for isolation */
  sessionId: string;
  /** Count of hints shown per command type */
  counts: Record<string, number>;
  /** Timestamp of last hint shown */
  lastShown: number;
}

/**
 * Options for HintTracker creation
 */
export interface HintTrackerOptions {
  /** Time-to-live in milliseconds (default: 1 hour) */
  ttlMs?: number;
}

/**
 * Configuration for hint threshold behaviour
 */
export interface HintThresholdConfig {
  /** Number of times to show hint before stopping (default: 3) */
  threshold: number;
}
