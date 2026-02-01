# API Type Definitions: Agent-Scoped Memories

**Feature**: 003-agent-scoped-memories
**Version**: 1.0.0

---

## TypeScript Interfaces

### Extended Scope Enum

```typescript
/**
 * Memory Scope Enumeration (Extended)
 *
 * Defines the 6-tier scope hierarchy for memory storage.
 * Precedence: Enterprise > Local > Project > Global > AgentProject > AgentGlobal
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
  /** NEW: Agent project-specific memories (tracked in git) */
  AgentProject = 'agent-project',
  /** NEW: Agent cross-project memories in ~/.claude/memory/agents/ */
  AgentGlobal = 'agent-global',
}
```

---

### Agent Context

```typescript
/**
 * Agent context for scope resolution
 */
export interface AgentContext {
  /** Agent name (sanitised slug) */
  name: string;
  /** Original unsanitised name (for display purposes) */
  originalName?: string;
}

/**
 * Extended scope context with agent support
 */
export interface ScopeContext {
  /** Current working directory */
  cwd: string;
  /** Path to global memory storage (~/.claude/memory/) */
  globalMemoryPath: string;
  /** Whether enterprise scope is enabled */
  enterpriseEnabled?: boolean;
  /** Path to enterprise memory storage */
  enterprisePath?: string;
  /** NEW: Agent context (if operating in agent scope) */
  agent?: AgentContext;
}
```

---

### Agent Scope Resolution

```typescript
/**
 * Result of agent scope resolution
 */
export interface AgentScopeResolution extends ScopeResolution {
  /** Agent context (present when scope is agent-project or agent-global) */
  agentContext?: AgentContext;
  /** Whether this is an agent scope */
  isAgentScope: boolean;
}

/**
 * Options for resolving agent scope
 */
export interface ResolveAgentScopeOptions extends ResolveScopeOptions {
  /** Agent name for scoped operations */
  agentName?: string;
}
```

---

### Cross-Scope Edges

```typescript
/**
 * Extended graph edge with cross-scope metadata
 */
export interface CrossScopeEdge extends GraphEdge {
  /** Source memory scope (optional - only present for cross-scope edges) */
  sourceScope?: Scope;
  /** Target memory scope (optional - only present for cross-scope edges) */
  targetScope?: Scope;
  /** Target agent name (optional - only present when target is agent-scoped) */
  targetAgent?: string;
  /** Source agent name (optional - only present when source is agent-scoped) */
  sourceAgent?: string;
}

/**
 * Graph with cross-scope edge support
 */
export interface AgentAwareGraph extends MemoryGraph {
  edges: CrossScopeEdge[];
}
```

---

### Agent Memory Metadata

```typescript
/**
 * Extended memory frontmatter with agent field
 */
export interface AgentMemoryFrontmatter extends MemoryFrontmatter {
  /** Agent name (required when scope is agent-project or agent-global) */
  agent?: string;
}

/**
 * Agent memory with scope indicator
 */
export interface AgentScopedMemory extends ScopedMemory {
  /** Agent name (present when scope is agent-project or agent-global) */
  agentName?: string;
  /** Full scope identifier for display (e.g., "agent-project:typescript-expert") */
  scopeDisplay: string;
}
```

---

### Agent Directory Metadata

```typescript
/**
 * Agent directory information
 */
export interface AgentInfo {
  /** Agent name (sanitised) */
  name: string;
  /** Full path to agent directory */
  path: string;
  /** Scope (agent-project or agent-global) */
  scope: Scope.AgentProject | Scope.AgentGlobal;
  /** Total memory count */
  memoryCount: number;
  /** Memory counts by type */
  typeCounts: Record<MemoryType, number>;
  /** Last updated timestamp */
  lastUpdated: string;
  /** Whether directory has valid structure */
  isValid: boolean;
}

/**
 * Result of listing all agents
 */
export interface ListAgentsResponse extends BaseResponse {
  /** Agents in project scope */
  projectAgents: AgentInfo[];
  /** Agents in global scope */
  globalAgents: AgentInfo[];
  /** Total agent count */
  totalAgents: number;
  /** Total memory count across all agents */
  totalMemories: number;
}
```

---

### Agent Name Sanitisation

```typescript
/**
 * Agent name sanitisation result
 */
export interface SanitiseAgentNameResult {
  /** Sanitised name (filesystem-safe slug) */
  sanitised: string;
  /** Original input name */
  original: string;
  /** Whether sanitisation was needed */
  wasModified: boolean;
  /** Validation errors (if any) */
  errors?: string[];
}

/**
 * Sanitise an agent name to filesystem-safe slug
 *
 * @param name - Raw agent name
 * @returns Sanitisation result
 *
 * @example
 * sanitiseAgentName("TypeScript Expert")
 * // { sanitised: "typescript-expert", original: "TypeScript Expert", wasModified: true }
 */
export function sanitiseAgentName(name: string): SanitiseAgentNameResult;
```

---

### Extended CLI Argument Parsing

```typescript
/**
 * Extended parsed arguments with agent support
 */
export interface ParsedArgsWithAgent extends ParsedArgs {
  flags: {
    /** Agent name for scoped operations */
    agent?: string;
    /** Target agent for cross-agent operations (e.g., linking) */
    'target-agent'?: string;
    /** Include shared (project/global) scopes in results */
    'include-shared'?: boolean;
    /** Search across all agents */
    'all-agents'?: boolean;
    // ... existing flags
  };
}
```

---

### Agent-Scoped Operations

```typescript
/**
 * Request to write agent-scoped memory
 */
export interface WriteAgentMemoryRequest extends WriteMemoryRequest {
  /** Agent name for scoped storage */
  agentName?: string;
}

/**
 * Request to read agent-scoped memory
 */
export interface ReadAgentMemoryRequest extends ReadMemoryRequest {
  /** Agent name for scoped lookup */
  agentName?: string;
}

/**
 * Request to search within agent scope
 */
export interface SearchAgentMemoriesRequest extends SearchMemoriesRequest {
  /** Agent name for scoped search */
  agentName?: string;
  /** Include project/global scopes in results */
  includeShared?: boolean;
}

/**
 * Request to create cross-scope link
 */
export interface CreateCrossScopeLinkRequest extends LinkMemoriesRequest {
  /** Source agent name (if source is agent-scoped) */
  sourceAgent?: string;
  /** Target agent name (if target is agent-scoped) */
  targetAgent?: string;
}
```

---

### Agent Graph Operations

```typescript
/**
 * Request to generate agent-aware Mermaid diagram
 */
export interface GenerateAgentMermaidRequest extends GenerateMermaidRequest {
  /** Agent name for scoped diagram */
  agentName?: string;
  /** Include shared (project/global) nodes */
  includeShared?: boolean;
}

/**
 * Response with agent-specific graph statistics
 */
export interface AgentGraphStatsResponse extends GraphStatsResponse {
  /** Cross-scope link breakdown */
  crossScopeLinks: {
    /** Links to project scope */
    toProject: number;
    /** Links to global scope */
    toGlobal: number;
    /** Links to other agents */
    toOtherAgents: number;
  };
  /** Agent context */
  agent: AgentContext;
}

/**
 * Request to validate agent graph health
 */
export interface ValidateAgentGraphRequest extends ValidateGraphRequest {
  /** Agent name for scoped validation */
  agentName?: string;
}
```

---

### Scope Indicator Formatting

```typescript
/**
 * Scope indicator for display
 */
export type ScopeIndicator =
  | '[agent-project]'
  | '[agent-global]'
  | '[project]'
  | '[global]'
  | '[local]'
  | '[enterprise]'
  | `[agent:${string}]`;  // Cross-agent reference

/**
 * Format scope for display with agent context
 *
 * @param scope - Memory scope
 * @param agentName - Agent name (if agent-scoped)
 * @param isCrossScope - Whether this is a cross-scope reference
 * @returns Formatted scope indicator
 *
 * @example
 * formatScopeIndicator(Scope.AgentProject, "typescript-expert", false)
 * // "[agent-project]"
 *
 * formatScopeIndicator(Scope.AgentProject, "rust-expert", true)
 * // "[agent:rust-expert]"
 */
export function formatScopeIndicator(
  scope: Scope,
  agentName?: string,
  isCrossScope?: boolean
): ScopeIndicator;
```

---

## Validation Functions

```typescript
/**
 * Validate agent name
 *
 * @param name - Agent name to validate
 * @returns Validation result with errors (if any)
 */
export function validateAgentName(name: string): {
  valid: boolean;
  errors?: string[];
};

/**
 * Check if agent directory exists
 *
 * @param agentName - Agent name
 * @param scope - Agent scope (agent-project or agent-global)
 * @param cwd - Current working directory
 * @returns Whether directory exists
 */
export function agentDirectoryExists(
  agentName: string,
  scope: Scope.AgentProject | Scope.AgentGlobal,
  cwd: string
): boolean;

/**
 * Validate cross-scope edge metadata
 *
 * @param edge - Edge to validate
 * @returns Validation result
 */
export function validateCrossScopeEdge(edge: CrossScopeEdge): {
  valid: boolean;
  errors?: string[];
};
```

---

## Helper Utilities

```typescript
/**
 * Determine if a scope is agent-scoped
 */
export function isAgentScope(scope: Scope): scope is Scope.AgentProject | Scope.AgentGlobal {
  return scope === Scope.AgentProject || scope === Scope.AgentGlobal;
}

/**
 * Get agent directory path
 *
 * @param agentName - Agent name (sanitised)
 * @param scope - Agent scope
 * @param cwd - Current working directory
 * @param globalMemoryPath - Global memory path
 * @returns Full path to agent directory
 */
export function getAgentDirectoryPath(
  agentName: string,
  scope: Scope.AgentProject | Scope.AgentGlobal,
  cwd: string,
  globalMemoryPath: string
): string;

/**
 * Extract agent name from memory ID (if present)
 *
 * @param memoryId - Memory ID (may include agent prefix)
 * @returns Agent name or undefined
 *
 * @example
 * extractAgentFromMemoryId("agent:typescript-expert:learning-esm")
 * // "typescript-expert"
 *
 * extractAgentFromMemoryId("learning-esm")
 * // undefined
 */
export function extractAgentFromMemoryId(memoryId: string): string | undefined;

/**
 * Build fully-qualified memory reference
 *
 * @param memoryId - Memory ID
 * @param scope - Memory scope
 * @param agentName - Agent name (if agent-scoped)
 * @returns Fully-qualified reference
 *
 * @example
 * buildMemoryReference("learning-esm", Scope.AgentProject, "typescript-expert")
 * // "agent:typescript-expert:learning-esm"
 *
 * buildMemoryReference("decision-api", Scope.Project)
 * // "project:decision-api"
 */
export function buildMemoryReference(
  memoryId: string,
  scope: Scope,
  agentName?: string
): string;
```

---

## Error Types

```typescript
/**
 * Agent-specific error types
 */
export class AgentNotFoundError extends Error {
  constructor(agentName: string) {
    super(`Agent not found: ${agentName}`);
    this.name = 'AgentNotFoundError';
  }
}

export class InvalidAgentNameError extends Error {
  constructor(name: string, reason: string) {
    super(`Invalid agent name '${name}': ${reason}`);
    this.name = 'InvalidAgentNameError';
  }
}

export class CrossScopeLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrossScopeLinkError';
  }
}

export class AgentDirectoryError extends Error {
  constructor(agentName: string, operation: string, reason: string) {
    super(`Agent directory error (${agentName}, ${operation}): ${reason}`);
    this.name = 'AgentDirectoryError';
  }
}
```

---

## Constants

```typescript
/**
 * Reserved agent names that cannot be used
 */
export const RESERVED_AGENT_NAMES = [
  'project',
  'global',
  'local',
  'enterprise',
  'agent',
  'agents',
] as const;

/**
 * Agent name validation regex
 */
export const AGENT_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Maximum agent name length
 */
export const MAX_AGENT_NAME_LENGTH = 50;

/**
 * Agent directory structure
 */
export const AGENT_DIRECTORY_STRUCTURE = {
  permanent: 'permanent',
  temporary: 'temporary',
  index: 'index.json',
  graph: 'graph.json',
  embeddings: 'embeddings.json',
} as const;
```

---

**API Types Version**: 1.0.0
**Backward Compatibility**: Extends existing types without breaking changes
