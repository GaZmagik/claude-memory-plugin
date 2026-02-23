import type { CommandHelpEntry } from '../types.js';

export const QUALITY_HELP: Record<string, CommandHelpEntry> = {
  // Quality Operations
  health: {
    usage: 'memory health [scope]',
    description: 'Quick connectivity health check with score',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory health',
      'memory health user',
    ],
  },

  validate: {
    usage: 'memory validate [scope]',
    description: 'Detailed validation with issue detection',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory validate',
      'memory validate --scope user',
    ],
    notes: `  Checks for orphaned nodes, broken links, invalid frontmatter,
  missing required fields, and other consistency issues.`,
  },

  quality: {
    usage: 'memory quality <id>',
    description: 'Assess quality score for a single memory',
    arguments: `  <id>    The memory ID to assess`,
    flags: `  --deep    Include LLM-based checks (slower but more thorough)`,
    examples: [
      'memory quality decision-architecture',
      'memory quality learning-patterns --deep',
    ],
    notes: `  Returns a quality score (0-100) based on:
  - Tier 1: Frontmatter completeness
  - Tier 2: Content structure and linking
  - Tier 3 (--deep): LLM assessment of clarity and usefulness`,
  },

  audit: {
    usage: 'memory audit [scope]',
    description: 'Bulk quality scan across all memories',
    arguments: `  [scope]    Target scope (default: project)`,
    flags: `  --threshold <n>    Minimum quality score to pass (default: 50)
  --deep             Include LLM checks for each memory`,
    examples: [
      'memory audit',
      'memory audit --threshold 70',
      'memory audit user --deep',
    ],
  },

  'audit-quick': {
    usage: 'memory audit-quick [scope]',
    description: 'Fast deterministic-only quality scan',
    arguments: `  [scope]    Target scope (default: project)`,
    examples: [
      'memory audit-quick',
    ],
    notes: `  Faster than full audit - only runs Tier 1 and 2 checks.
  Use for quick feedback during development.`,
  },
};
