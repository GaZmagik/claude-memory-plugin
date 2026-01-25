/**
 * Complex Thought Detection
 *
 * Detects "complex" thoughts that warrant interactive AI assistance prompts.
 * A thought is considered complex if:
 * - It exceeds 200 characters (configurable)
 * - It contains a question mark "?"
 */

/** Default length threshold for complex thought detection */
export const DEFAULT_COMPLEX_THOUGHT_LENGTH = 200;

/**
 * Configuration for complex thought detection
 */
export interface ComplexThoughtConfig {
  /** Length threshold (default: 200) */
  lengthThreshold?: number;
  /** Whether to detect questions (default: true) */
  detectQuestions?: boolean;
}

/**
 * Check if a thought is "complex" enough to warrant AI assistance
 *
 * A thought is complex if:
 * - Its length exceeds the threshold (default: 200 chars)
 * - It contains a question mark "?"
 *
 * Either condition triggers complexity detection.
 *
 * @param thought - The thought text to analyse
 * @param config - Optional configuration
 * @returns true if the thought is considered complex
 */
export function isComplexThought(
  thought: string,
  config?: ComplexThoughtConfig
): boolean {
  const lengthThreshold = config?.lengthThreshold ?? DEFAULT_COMPLEX_THOUGHT_LENGTH;
  const detectQuestions = config?.detectQuestions ?? true;

  // Empty or whitespace-only is not complex
  if (!thought || thought.trim().length === 0) {
    return false;
  }

  // Check length (using raw length, not trimmed)
  if (thought.length > lengthThreshold) {
    return true;
  }

  // Check for question mark
  if (detectQuestions && thought.includes('?')) {
    return true;
  }

  return false;
}
