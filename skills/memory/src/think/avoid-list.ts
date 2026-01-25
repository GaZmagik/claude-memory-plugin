/**
 * Extract avoid list from existing thoughts for diversity
 * Ensures different styles are used across a thinking session
 */

export interface ThoughtMetadata {
  style?: string;
  agent?: string;
}

/**
 * Extract styles/agents used in recent thoughts to avoid repetition
 * @param thoughts - Array of thought metadata from current document
 * @param maxRecent - How many recent thoughts to consider (default 3)
 * @returns Array of style names to avoid
 */
export function extractAvoidList(thoughts: ThoughtMetadata[], maxRecent = 3): string[] {
  const recent = thoughts.slice(-maxRecent);
  const styles = new Set<string>();

  for (const thought of recent) {
    if (thought.style) {
      styles.add(thought.style);
    }
  }

  return Array.from(styles);
}

/**
 * Check if a style should be avoided based on recent usage
 */
export function shouldAvoidStyle(style: string, recentStyles: string[]): boolean {
  return recentStyles.includes(style);
}
