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
}

/**
 * Memory Scope Enumeration
 *
 * Defines the 4-tier scope hierarchy for memory storage.
 * Precedence: Enterprise > Local > Project > Global
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
}
