/**
 * Work Significance Classifier
 *
 * Classifies agent work as trivial or meaningful to determine
 * whether a retrospective memory capture is appropriate.
 */

export enum WorkSignificance {
  /** Trivial work: read-only, simple searches, status checks */
  Trivial = 'trivial',
  /** Meaningful work: implementation, fixes, refactoring, reviews */
  Meaningful = 'meaningful',
}

/**
 * Keywords that indicate meaningful work
 */
const MEANINGFUL_KEYWORDS = [
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
  'write',
  'develop',
  'architect',
  'solve',
  'resolve',
];

/**
 * Keywords that indicate trivial work
 */
const TRIVIAL_KEYWORDS = [
  'read',
  'search',
  'find',
  'grep',
  'check',
  'list',
  'status',
  'show',
  'display',
];

/**
 * Subagent types that typically do meaningful work
 */
const MEANINGFUL_AGENTS = [
  'Plan',
  'typescript-pro',
  'javascript-pro',
  'python-expert',
  'rust-expert',
  'security-code-expert',
  'code-quality-expert',
  'test-quality-expert',
  'performance-optimisation-expert',
];

/**
 * Subagent types that typically do trivial work
 */
const TRIVIAL_AGENTS = [
  'Explore',
  'general-purpose',
];

/**
 * Classify work significance based on subagent type and task prompt.
 *
 * Heuristics:
 * - Short prompts (<50 chars) are likely trivial
 * - Prompts with meaningful keywords are meaningful
 * - Prompts with only trivial keywords are trivial
 * - Certain agent types indicate meaningful work
 * - Explore/general-purpose agents typically do trivial work
 *
 * @param subagentType - Type of subagent executing the task
 * @param prompt - Task prompt/description
 * @returns Classification result
 */
export function classifyWork(
  subagentType: string | undefined,
  prompt: string
): WorkSignificance {
  // Empty prompts are trivial
  if (!prompt || prompt.trim().length === 0) {
    return WorkSignificance.Trivial;
  }

  const lowerPrompt = prompt.toLowerCase();

  // Check for meaningful keywords FIRST (before length check)
  const hasMeaningfulKeyword = MEANINGFUL_KEYWORDS.some(keyword =>
    lowerPrompt.includes(keyword)
  );

  if (hasMeaningfulKeyword) {
    return WorkSignificance.Meaningful;
  }

  // Very short prompts without meaningful keywords are likely trivial
  if (prompt.trim().length < 50) {
    return WorkSignificance.Trivial;
  }

  // Check for trivial keywords
  const hasTrivialKeyword = TRIVIAL_KEYWORDS.some(keyword =>
    lowerPrompt.includes(keyword)
  );

  if (hasTrivialKeyword) {
    return WorkSignificance.Trivial;
  }

  // Check subagent type
  if (subagentType) {
    if (MEANINGFUL_AGENTS.includes(subagentType)) {
      return WorkSignificance.Meaningful;
    }

    if (TRIVIAL_AGENTS.includes(subagentType)) {
      return WorkSignificance.Trivial;
    }
  }

  // Default: if we can't determine, assume trivial (safer default)
  // Avoids spamming agents with retrospective prompts
  return WorkSignificance.Trivial;
}
