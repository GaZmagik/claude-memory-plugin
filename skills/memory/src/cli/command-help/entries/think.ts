import type { CommandHelpEntry } from '../types.js';

export const THINK_HELP: Record<string, CommandHelpEntry> = {
  // Think Operations
  think: {
    usage: 'memory think <subcommand> [options]',
    description: 'Ephemeral thinking documents for deliberation',
    subcommands: `  create <topic>      Create new thinking document
  add <thought>       Add thought to current document
  counter <thought>   Add counter-argument
  branch <thought>    Add alternative branch
  list                List all thinking documents
  show [id]           Show document contents
  use <id>            Switch current document
  conclude <text>     Conclude and optionally promote
  delete <id>         Delete thinking document`,
    flags: `  For 'add', 'counter', 'branch':
    --by <author>      Attribute thought to author
    --call <model>     Invoke AI model (claude, haiku, opus, sonnet)
    --agent <name>     Use discovered agent prompt (e.g., curator, recall)
    --style <name>     Use output style (e.g., Devils-Advocate, Concise)
    --model <model>    Specify model when using --call (default: haiku)
    --resume <id>      Resume previous agent conversation

  For 'conclude':
    --promote <type>   Promote to permanent memory type (decision, learning, gotcha, artifact)`,
    examples: [
      '# Basic deliberation workflow',
      'memory think create "Should we use Redis or PostgreSQL?"',
      'memory think add "Redis is faster for simple lookups"',
      'memory think counter "But PostgreSQL reduces infrastructure complexity"',
      'memory think conclude "Use PostgreSQL" --promote decision',
      '',
      '# AI-assisted deliberation with --call',
      'memory think add "Considering microservices migration" --call claude',
      'memory think counter "What are the risks?" --call haiku',
      'memory think add "Evaluate caching strategy" --call opus',
      '',
      '# Using output styles with --style',
      'memory think add "Should we refactor?" --call claude --style Devils-Advocate',
      'memory think counter "Security implications" --call claude --style Security-Auditor',
      'memory think add "Quick summary" --call haiku --style Concise',
      '',
      '# Using agent prompts with --agent',
      'memory think add "Review memory quality" --call claude --agent curator',
      'memory think add "Find related patterns" --call claude --agent recall',
      '',
      '# Document management',
      'memory think list',
      'memory think show',
      'memory think use thought-20240115-123456',
      'memory think delete thought-20240115-123456',
    ],
    notes: `  Thinking documents are ephemeral - they live in temporary/ and are
  meant to be concluded and optionally promoted to permanent memories.
  Use for structured deliberation before making decisions.

  AI Invocation:
    --call invokes an AI model to generate the thought content.
    --style applies an output style (discovered from .claude/output-styles/).
    --agent appends an agent prompt (discovered from .claude/agents/).
    Combine flags: --call claude --style Devils-Advocate --agent recall

  Hint: Complex thoughts (>200 chars or containing "?") will prompt for
  AI assistance in interactive mode. Use --non-interactive to suppress.`,
  },
};
