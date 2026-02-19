# Data Model: Rule and Reminder Graph Nodes

---

## Overview

This feature extends the existing memory data model to include two new categories of graph nodes representing external files owned by the Claude CLI. The design preserves backward compatibility whilst adding minimal new structures.

---

## Type System Extensions

### MemoryType Enum Extension

**Location**: `skills/memory/src/types/enums.ts`

```typescript
export enum MemoryType {
  // Existing types (unchanged)
  Decision = 'decision',
  Learning = 'learning',
  Artifact = 'artifact',
  Gotcha = 'gotcha',
  Breadcrumb = 'breadcrumb',
  Hub = 'hub',

  // NEW: External file types
  /** A prescriptive rule file (CLAUDE.md, rules/*.md) governing agent behaviour */
  Rule = 'rule',
  /** A descriptive reminder file (agent MEMORY.md) carrying agent state */
  Reminder = 'reminder',
}
```

**Semantic Definitions**:
- **Rule**: Read-only external file that prescribes HOW Claude should behave (CLAUDE.md, CLAUDE.local.md, rules/*.md)
- **Reminder**: Read-only external file that describes WHAT an agent carries between sessions (agent MEMORY.md files)

### EdgeType Enum Extension

**Location**: `skills/memory/src/types/enums.ts`

```typescript
export enum EdgeType {
  // Existing types (unchanged)
  RelatesTo = 'relates-to',
  Implements = 'implements',
  Supersedes = 'supersedes',
  BlockedBy = 'blocked-by',
  Informs = 'informs',
  Exemplifies = 'exemplifies',
  RelatedContext = 'related-context',

  // NEW: External file relationship types
  /** Memory is governed by a rule (direction: memory → rule) */
  GovernedBy = 'governed-by',
  /** Memory is contextualised by a reminder (direction: memory → reminder) */
  RemindedBy = 'reminded-by',
}
```

**Edge Direction Semantics**:
- `GovernedBy`: `decision-001 --governed-by--> rule-project-claude-md` (decision complies with rule)
- `RemindedBy`: `gotcha-tdd-stubs --reminded-by--> reminder-project-curator-memory` (gotcha informed by agent memory)

---

## Entity: ExternalFileEntry

**Location**: `skills/memory/src/external/external-file-types.ts`

**Description**: Represents a discovered external file (CLAUDE.md, rules/*.md, agent MEMORY.md) during discovery phase, before indexing.

**Interface**:
```typescript
export interface ExternalFileEntry {
  /** Absolute path to the external file */
  absolutePath: string;

  /** Sub-kind of external file (distinguishes types within rule/reminder categories) */
  kind: ExternalFileKind;

  /** Storage scope for graph/index */
  scope: Scope;

  /** Agent name (required for reminder files, undefined for rule files) */
  agentName?: string;

  /** Content hash (SHA-256 first 16 chars) for cache invalidation */
  contentHash: string;

  /** Deterministic ID for graph node */
  id: string;

  /** Human-readable title derived from filename */
  title: string;
}
```

**Lifecycle**: Created during discovery, consumed during indexing, then discarded. Not persisted.

**Validation Rules**:
- `absolutePath` MUST be canonical (symlinks resolved)
- `id` MUST follow deterministic scheme (see ID generation below)
- `agentName` MUST be present when `kind` is agent-memory-summary or agent-memory-sub-file
- `contentHash` MUST match actual file content hash

---

## Entity: ExternalFileKind Enum

**Location**: `skills/memory/src/external/external-file-types.ts`

**Description**: Distinguishes sub-types within rule and reminder categories.

**Enum Definition**:
```typescript
export enum ExternalFileKind {
  // Rule file kinds
  /** CLAUDE.md at any level (prescriptive instructions) */
  ClaudeInstructions = 'claude-instructions',

  /** CLAUDE.local.md at any level (local-only prescriptive instructions) */
  ClaudeLocalInstructions = 'claude-local-instructions',

  /** File in .claude/rules/ or ~/.claude/rules/ directory */
  RulesFile = 'rules-file',

  // Reminder file kinds
  /** MEMORY.md file in agent-memory directory (primary agent summary) */
  AgentMemorySummary = 'agent-memory-summary',

  /** sub-file in agent-memory directory (e.g., patterns.md, debugging.md) */
  AgentMemorySubFile = 'agent-memory-sub-file',
}
```

**Usage**: Stored in IndexEntry.externalFileKind for filtering and debugging. Not used for core graph operations.

---

## IndexEntry Interface Extension

**Location**: `skills/memory/src/types/memory.ts`

**Description**: Existing IndexEntry interface extended with two optional fields for external file metadata.

**Extended Interface**:
```typescript
export interface IndexEntry {
  // Existing fields (unchanged)
  id: MemoryId;
  type: MemoryType;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  scope: Scope;
  agent?: string;
  relativePath: string;
  severity?: Severity;

  // NEW: External file fields (optional)
  /** Sub-kind of external file (only present for type=rule or type=reminder) */
  externalFileKind?: string;

  /** Absolute path to external file (only present for type=rule or type=reminder) */
  externalPath?: string;
}
```

**Field Semantics**:
- **externalFileKind**: Stores ExternalFileKind enum value as string. Used for filtering/debugging. Example: `'claude-instructions'`, `'agent-memory-summary'`
- **externalPath**: Absolute canonical path to source file. Authoritative for content reads. Example: `/home/user/.claude/CLAUDE.md`, `/home/user/project/.claude/agent-memory/curator/MEMORY.md`
- **relativePath**: For external files, holds sentinel value `external/<id>` for structural compatibility. NOT used for file reads.

**Backward Compatibility**: Existing memories never have these fields set. All queries work unchanged.

**Type Guard**:
```typescript
function isExternalFile(entry: IndexEntry): boolean {
  return entry.externalPath !== undefined;
}
```

---

## GraphNode Extension

**Location**: `skills/memory/src/graph/structure.ts`

**Description**: GraphNode interface already supports arbitrary `type` field. No structural changes needed. External nodes simply have `type: 'rule'` or `type: 'reminder'`.

**Example External Rule Node**:
```typescript
{
  id: 'rule-project-claude-md',
  type: 'rule',
  title: 'CLAUDE.md',
  scope: Scope.Project,
  agent: undefined
}
```

**Example External Reminder Node**:
```typescript
{
  id: 'reminder-project-curator-memory',
  type: 'reminder',
  title: 'Curator Agent Memory',
  scope: Scope.AgentProject,
  agent: 'curator'
}
```

---

## ID Generation Scheme

**Deterministic Algorithm**: Generates stable, unique IDs based on file location and type.

### Rule File IDs

| File Path | Scope | Generated ID |
|-----------|-------|--------------|
| `{git-root}/CLAUDE.md` | Project | `rule-project-claude-md` |
| `{git-root}/CLAUDE.local.md` | Local | `rule-local-claude-local-md` |
| `{git-root}/.claude/CLAUDE.md` | Project | `rule-project-claude-md-dotclaude` |
| `~/.claude/CLAUDE.md` | Global | `rule-global-claude-md` |
| `~/.claude/CLAUDE.local.md` | Global | `rule-global-claude-local-md` |
| `{cwd}/../../CLAUDE.md` (2 ancestors) | Project/Global* | `rule-ancestor-2-claude-md` |
| `{git-root}/.claude/rules/security.md` | Project | `rule-project-security` |
| `{git-root}/.claude/rules/tdd.md` | Project | `rule-project-tdd` |
| `~/.claude/rules/api-design.md` | Global | `rule-global-api-design` |

\* Ancestor scope: global if above git root, project if within git root

### Reminder File IDs

| File Path | Scope | Generated ID |
|-----------|-------|--------------|
| `.claude/agent-memory/curator/MEMORY.md` | AgentProject | `reminder-project-curator-memory` |
| `.claude/agent-memory/curator/patterns.md` | AgentProject | `reminder-project-curator-patterns` |
| `.claude/agent-memory-local/curator/MEMORY.md` | Local | `reminder-local-curator-memory` |
| `~/.claude/agent-memory/curator/MEMORY.md` | AgentGlobal | `reminder-global-curator-memory` |
| `~/.claude/agent-memory/curator/debugging.md` | AgentGlobal | `reminder-global-curator-debugging` |

### ID Construction Rules

1. **Prefix**: `rule-` or `reminder-` based on file category
2. **Scope Marker**: `project-`, `local-`, `global-`, or `ancestor-N-` (N = levels above cwd)
3. **Agent Name** (reminders only): `{agent-name}-` extracted from directory name
4. **Filename Component**: Derived from filename (CLAUDE.md → `claude-md`, security.md → `security`)
5. **Collision Prevention**: If CLAUDE.md exists in both project root and .claude/, append `-dotclaude` to .claude/ version

**Implementation**: `external-file-discovery.ts` exports `generateExternalFileId(entry: ExternalFileEntry): string`

---

## Scope Determination

### Rule File Scope Mapping

| File Location | Scope | Storage Location |
|---------------|-------|------------------|
| `~/.claude/CLAUDE.md` | Global | `~/.claude/memory/graph.json` |
| `~/.claude/CLAUDE.local.md` | Global | `~/.claude/memory/graph.json` |
| `~/.claude/rules/*.md` | Global | `~/.claude/memory/graph.json` |
| Ancestor CLAUDE.md (above git root) | Global | `~/.claude/memory/graph.json` |
| `{git-root}/CLAUDE.md` | Project | `{git-root}/.claude/memory/graph.json` |
| `{git-root}/.claude/CLAUDE.md` | Project | `{git-root}/.claude/memory/graph.json` |
| `{git-root}/.claude/rules/*.md` | Project | `{git-root}/.claude/memory/graph.json` |
| Ancestor CLAUDE.md (within git) | Project | `{git-root}/.claude/memory/graph.json` |
| `{git-root}/CLAUDE.local.md` | Local | `{git-root}/.claude/memory/graph.json` |

### Reminder File Scope Mapping

| File Location | Scope | Storage Location |
|---------------|-------|------------------|
| `~/.claude/agent-memory/{name}/*` | AgentGlobal | `~/.claude/memory/agents/{name}/graph.json` |
| `.claude/agent-memory/{name}/*` | AgentProject | `{git-root}/.claude/memory/agents/{name}/graph.json` |
| `.claude/agent-memory-local/{name}/*` | Local + agent={name} | `{git-root}/.claude/memory/graph.json` |

**Note**: Local-scoped reminder files (agent-memory-local) store in project graph.json with agent metadata, NOT in separate agent directory.

---

## Data Relationships

### Rule Node → Memory Edges

```
decision-001 (Decision)
    |
    | governed-by
    ↓
rule-project-claude-md (Rule: CLAUDE.md)
```

**Semantic**: Decision was made in compliance with or motivated by the rule.

**Use Case**: "Show me all decisions governed by the constitution" → filter edges with label='governed-by', target type='rule', target title contains 'constitution'

### Reminder Node → Memory Edges

```
gotcha-tdd-stubs (Gotcha)
    |
    | reminded-by
    ↓
reminder-project-curator-memory (Reminder: Curator MEMORY.md)
```

**Semantic**: Gotcha is contextualised by knowledge carried by the agent.

**Use Case**: "Show me what the curator agent remembers about TDD" → filter reminder nodes with agent='curator', then traverse inbound edges

---

## Storage Format Examples

### graph.json with External Nodes

```json
{
  "version": 1,
  "nodes": [
    {
      "id": "decision-001",
      "type": "decision",
      "title": "Use TDD for Feature 005"
    },
    {
      "id": "rule-project-claude-md",
      "type": "rule",
      "title": "CLAUDE.md",
      "scope": "project"
    },
    {
      "id": "reminder-project-curator-memory",
      "type": "reminder",
      "title": "Curator Agent Memory",
      "scope": "agent-project",
      "agent": "curator"
    }
  ],
  "edges": [
    {
      "source": "decision-001",
      "target": "rule-project-claude-md",
      "label": "governed-by"
    }
  ]
}
```

### index.json with External Entries

```json
{
  "version": "1.0",
  "lastUpdated": "2026-02-19T04:00:00.000Z",
  "memories": [
    {
      "id": "decision-001",
      "type": "decision",
      "title": "Use TDD for Feature 005",
      "tags": ["tdd", "feature-005"],
      "created": "2026-02-19T03:00:00.000Z",
      "updated": "2026-02-19T03:00:00.000Z",
      "scope": "project",
      "relativePath": "permanent/decision-001.md"
    },
    {
      "id": "rule-project-claude-md",
      "type": "rule",
      "title": "CLAUDE.md",
      "tags": [],
      "created": "2026-02-19T04:00:00.000Z",
      "updated": "2026-02-19T04:00:00.000Z",
      "scope": "project",
      "relativePath": "external/rule-project-claude-md",
      "externalFileKind": "claude-instructions",
      "externalPath": "/home/user/project/.claude/CLAUDE.md"
    }
  ]
}
```

### embeddings.json with External File Embeddings

```json
{
  "version": 1,
  "memories": {
    "decision-001": {
      "embedding": [0.123, -0.456, ...],
      "hash": "a1b2c3d4e5f6g7h8",
      "timestamp": "2026-02-19T03:00:00.000Z"
    },
    "rule-project-claude-md": {
      "embedding": [0.789, 0.234, ...],
      "hash": "9i8j7k6l5m4n3o2p",
      "timestamp": "2026-02-19T04:00:00.000Z"
    }
  }
}
```

**Note**: External file embeddings use same cache structure. `hash` field enables change detection.

---

## State Transitions

External file nodes have simpler lifecycle than user memories:

```
File on Disk (not indexed)
    ↓
  [memory sync runs]
    ↓
Discovered (ExternalFileEntry created)
    ↓
Indexed (GraphNode + IndexEntry + Embedding created)
    ↓
  [file content changes]
    ↓
  [memory sync detects hash mismatch]
    ↓
Re-indexed (Embedding regenerated, IndexEntry updated timestamp)
    ↓
  [file deleted]
    ↓
  [memory sync detects missing file]
    ↓
Removed (GraphNode + IndexEntry + Embedding deleted)
```

**No Manual State Transitions**: Users cannot create, rename, move, or delete external nodes. Only sync operations modify state.

---

## Validation Rules

### ExternalFileEntry Validation

1. `absolutePath` MUST be canonical (no `.` or `..` components, symlinks resolved)
2. `absolutePath` MUST exist on filesystem at time of discovery
3. `id` MUST match deterministic generation scheme
4. `kind` MUST be valid ExternalFileKind enum value
5. `scope` MUST be valid Scope enum value
6. `agentName` MUST be present when kind is agent-memory-summary or agent-memory-sub-file
7. `contentHash` MUST match SHA-256 hash of file content (first 16 hex chars)

### IndexEntry Validation (External Files)

1. `type` MUST be 'rule' or 'reminder'
2. `externalPath` MUST be present when type is rule or reminder
3. `externalFileKind` MUST be present when type is rule or reminder
4. `relativePath` MUST have format `external/<id>` for external files
5. `tags` array SHOULD be empty for external files (no manual tagging)
6. `created` timestamp set to discovery time
7. `updated` timestamp updated on re-index if content hash changes

---

## Query Patterns

### Find All Rules
```typescript
const ruleEntries = index.memories.filter(e => e.type === MemoryType.Rule);
```

### Find Rules Governing a Decision
```typescript
const edges = graph.edges.filter(e =>
  e.source === 'decision-001' &&
  e.label === EdgeType.GovernedBy
);
const ruleIds = edges.map(e => e.target);
const rules = graph.nodes.filter(n => ruleIds.includes(n.id));
```

### Find Agent-Specific Reminders
```typescript
const curatorReminders = index.memories.filter(e =>
  e.type === MemoryType.Reminder &&
  e.agent === 'curator'
);
```

### Semantic Search Including External Files
```typescript
// No changes needed - external files participate automatically
const results = await semanticSearch({
  query: "no wrapper abstractions",
  threshold: 0.45,
  basePath
});
// Results may include rule-project-claude-md if relevant
```

---

## Migration Path

**v1.4.x → v1.5.0 (this feature)**:
- No data migration required
- Existing memories unchanged
- First sync after upgrade adds external nodes
- No breaking changes to APIs

**Rollback Safety**:
- If downgrading to v1.4.x, external nodes simply ignored (unknown type)
- User memories unaffected
- Can re-upgrade and external nodes reappear on next sync
