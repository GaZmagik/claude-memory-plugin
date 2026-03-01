/**
 * Memory Type Enumeration
 *
 * Defines the taxonomy of memory types supported by the system.
 */
export enum MemoryType {
  /** A decision made during development with rationale */
  Decision = 'decision',
  /** A learning or insight gained from experience */
  Learning = 'learning',
  /** A reusable pattern, template, or code snippet */
  Artifact = 'artifact',
  /** A warning about a common pitfall or gotcha */
  Gotcha = 'gotcha',
  /** A temporary navigation marker or breadcrumb */
  Breadcrumb = 'breadcrumb',
  /** A hub node that links related memories together */
  Hub = 'hub',
  /** A prescriptive rule file (CLAUDE.md, rules/*.md) governing agent behaviour */
  Rule = 'rule',
  /** A descriptive reminder file (agent MEMORY.md) carrying agent state */
  Reminder = 'reminder',
  /** Placeholder for nodes with unrecognised or missing type (legacy data) */
  Unknown = 'unknown',
}

/**
 * Memory Scope Enumeration
 *
 * Defines scopes in two separate hierarchies:
 *
 * REGULAR SCOPES (precedence: Enterprise > Local > Project > Global)
 * - Enterprise: Organisation-wide memories
 * - Local: Personal project-specific memories
 * - Project: Shared project memories
 * - Global: Personal cross-project memories
 *
 * AGENT SCOPES (isolated namespaces, parallel to regular scopes)
 * - AgentProject: Agent-specific project memories
 * - AgentGlobal: Agent-specific global memories
 *
 * Agent scopes do not participate in the regular scope precedence chain.
 * Each agent maintains its own memory storage independent of other agents
 * and regular scopes.
 */
export enum Scope {
  /** Organisation-wide memories from managed-settings.json path */
  Enterprise = 'enterprise',
  /** Personal project-specific memories (gitignored) */
  Local = 'local',
  /** Shared project memories (tracked in git) */
  Project = 'project',
  /** Personal cross-project memories in ~/.claude/memory/ */
  Global = 'global',
  /** Agent-specific project memories in .claude/memory/agents/{name}/ */
  AgentProject = 'agent-project',
  /** Agent-specific global memories in ~/.claude/memory/agents/{name}/ */
  AgentGlobal = 'agent-global',
}

/**
 * Memory Severity Level
 *
 * Used for gotchas and learnings to indicate importance.
 */
export enum Severity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

/**
 * Think Document Status
 *
 * Defines the lifecycle status of a thinking document.
 */
export enum ThinkStatus {
  /** Document is active and accepting new thoughts */
  Active = 'active',
  /** Document has been concluded */
  Concluded = 'concluded',
}

/**
 * Thought Entry Type
 *
 * Defines the type of thought within a thinking document.
 */
export enum ThoughtType {
  /** A regular thought or observation */
  Thought = 'thought',
  /** A counter-argument or challenge to existing thoughts */
  CounterArgument = 'counter-argument',
  /** An alternative approach or branch in thinking */
  Branch = 'branch',
  /** The final conclusion of the deliberation */
  Conclusion = 'conclusion',
}

/**
 * Graph Edge Relationship Types
 *
 * Defines the types of relationships between memories in the graph.
 */
export enum EdgeType {
  /** Memory A relates to Memory B */
  RelatesTo = 'relates-to',
  /** Memory A implements Memory B */
  Implements = 'implements',
  /** Memory A supersedes Memory B */
  Supersedes = 'supersedes',
  /** Memory A is blocked by Memory B */
  BlockedBy = 'blocked-by',
  /** Memory A informs Memory B */
  Informs = 'informs',
  /** Memory A exemplifies Memory B */
  Exemplifies = 'exemplifies',
  /** Memory A is related context for Memory B */
  RelatedContext = 'related-context',
  /** Memory is governed by a rule (direction: memory → rule) */
  GovernedBy = 'governed-by',
  /** Memory is contextualised by a reminder (direction: memory → reminder) */
  RemindedBy = 'reminded-by',
}
