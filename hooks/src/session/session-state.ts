/**
 * T109: Session state manager for deduplication
 *
 * Tracks which memories have been shown during a session
 * to avoid showing duplicate warnings.
 */

/**
 * Session state structure
 */
export interface SessionState {
  /** Set of memory IDs that have been shown */
  shownMemories: Set<string>;
  /** Timestamps for when each memory was shown */
  shownTimestamps?: Map<string, number>;
  /** Session start time */
  startTime: number;
}

/**
 * Create a new session state
 */
export function createSessionState(startTime?: number): SessionState {
  return {
    shownMemories: new Set(),
    shownTimestamps: new Map(),
    startTime: startTime ?? Date.now(),
  };
}

/**
 * Check if a memory has already been shown in this session
 */
export function hasBeenShown(state: SessionState, memoryId: string): boolean {
  return state.shownMemories.has(memoryId);
}

/**
 * Mark a memory as shown in this session
 */
export function markAsShown(state: SessionState, memoryId: string): void {
  state.shownMemories.add(memoryId);

  if (!state.shownTimestamps) {
    state.shownTimestamps = new Map();
  }
  state.shownTimestamps.set(memoryId, Date.now());
}

/**
 * Clear all shown memories (reset deduplication)
 */
export function clearShownMemories(state: SessionState): void {
  state.shownMemories.clear();
  state.shownTimestamps?.clear();
}

/**
 * Get the count of shown memories
 */
export function getShownCount(state: SessionState): number {
  return state.shownMemories.size;
}

/**
 * Get session duration in milliseconds
 */
export function getSessionDuration(state: SessionState): number {
  return Date.now() - state.startTime;
}

/**
 * Default session timeout (1 hour)
 */
const DEFAULT_SESSION_TIMEOUT = 60 * 60 * 1000;

/**
 * Check if the session has expired
 */
export function isSessionExpired(
  state: SessionState,
  timeout: number = DEFAULT_SESSION_TIMEOUT
): boolean {
  return getSessionDuration(state) > timeout;
}

/**
 * Remove entries older than max age
 */
export function pruneExpiredEntries(
  state: SessionState,
  maxAge: number = DEFAULT_SESSION_TIMEOUT
): void {
  if (!state.shownTimestamps) {
    return;
  }

  const now = Date.now();
  const expiredIds: string[] = [];

  for (const [id, timestamp] of state.shownTimestamps) {
    if (now - timestamp > maxAge) {
      expiredIds.push(id);
    }
  }

  for (const id of expiredIds) {
    state.shownMemories.delete(id);
    state.shownTimestamps.delete(id);
  }
}

/**
 * Serialise session state for persistence
 */
export function serialiseSessionState(state: SessionState): string {
  return JSON.stringify({
    shownMemories: Array.from(state.shownMemories),
    shownTimestamps: state.shownTimestamps
      ? Object.fromEntries(state.shownTimestamps)
      : {},
    startTime: state.startTime,
  });
}

/**
 * Deserialise session state from persistence
 */
export function deserialiseSessionState(json: string): SessionState {
  const data = JSON.parse(json);
  return {
    shownMemories: new Set(data.shownMemories || []),
    shownTimestamps: new Map(Object.entries(data.shownTimestamps || {})),
    startTime: data.startTime || Date.now(),
  };
}
