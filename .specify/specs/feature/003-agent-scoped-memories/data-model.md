# Data Model: Agent-Scoped Memories

**Feature**: 003-agent-scoped-memories
**Version**: 1.0.0
**Last Updated**: 2026-02-01

---

## Overview

Agent-scoped memories extend the existing memory system with agent-specific namespaces whilst maintaining full compatibility with existing data structures. All agent memories use identical schemas to project/global memories, differing only in storage location and metadata.

---

## Entity: AgentScope

**Description**: An isolated memory namespace for a specific agent, stored in `.claude/memory/agents/<agent-name>/` or `~/.claude/memory/agents/<agent-name>/`

**Properties**:

| Property | Type | Required | Validation | Description |
|----------|------|----------|------------|-------------|
| agentName | string | Yes | Sanitised slug | Agent identifier (lowercase, hyphens only) |
| scopeType | `'agent-project'` \| `'agent-global'` | Yes | Enum value | Storage scope (project-level or global) |
| basePath | string | Yes | Absolute path | Full filesystem path to agent's memory directory |
| indexPath | string | Yes | Absolute path | Path to agent's index.json |
| graphPath | string | Yes | Absolute path | Path to agent's graph.json |
| embeddingsPath | string | Yes | Absolute path | Path to agent's embeddings.json |

**Filesystem Structure**:
```
{basePath}/
├── permanent/          # Permanent agent memories
│   ├── {type}-{slug}.md
│   └── ...
├── temporary/          # Temporary agent memories (optional)
│   └── ...
├── index.json          # Agent-specific index
├── graph.json          # Agent-specific graph
└── embeddings.json     # Agent-specific embeddings
```

**Creation Rules**:
- Auto-created on first `memory write --agent <name>`
- Agent name sanitised: `typescript-expert` ✅, `TypeScript Expert!` → `typescript-expert`
- Directory permissions: 0755 (same as project scope)
- No manual registration required

**Relationships**:
- **Contains** many `AgentMemory` entities
- **HasOne** `AgentGraph`
- **HasOne** `AgentIndex`

---

## Entity: AgentMemory

**Description**: A memory file with agent-scoped storage and metadata

**Schema**: Identical to existing memory schema with additional frontmatter field

**Frontmatter Extensions**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| agent | string | No* | undefined | Agent name (sanitised) |
| scope | `Scope` | Yes | agent-project | Storage scope enum value |

\* Required when scope is `agent-project` or `agent-global`, optional otherwise

**Example Frontmatter**:
```yaml
---
id: learning-esm-imports
type: learning
title: ESM imports require .js extensions
tags: [typescript, esm, gotcha]
created: 2026-02-01T10:30:00Z
updated: 2026-02-01T10:30:00Z
scope: agent-project
agent: typescript-expert
severity: high
---

# Content here...
```

**File Path Calculation**:
- **agent-project**: `.claude/memory/agents/{agent}/permanent/{type}-{slug}.md`
- **agent-global**: `~/.claude/memory/agents/{agent}/permanent/{type}-{slug}.md`

**Validation Rules**:
- If `agent` field present, `scope` must be `agent-project` or `agent-global`
- If `scope` is `agent-project` or `agent-global`, `agent` field must be present
- Agent name in frontmatter must match directory name (sanitised)

**Relationships**:
- **BelongsTo** one `AgentScope`
- **LinkedTo** many `AgentMemory` or `ProjectMemory` (via graph edges)

---

## Entity: AgentGraph

**Description**: Graph adjacency list for agent memories, stored in `<agent-scope>/graph.json`

**Schema**: Extension of existing `MemoryGraph` with cross-scope metadata

**Structure**:
```typescript
interface AgentGraph {
  version: number;          // Graph schema version (currently 1)
  nodes: GraphNode[];       // Agent memory nodes
  edges: CrossScopeEdge[];  // Edges with scope metadata
}

interface GraphNode {
  id: string;               // Memory ID (without scope prefix)
  type: string;             // Memory type
  title?: string;           // Memory title (optional)
}

interface CrossScopeEdge {
  source: string;           // Source memory ID
  target: string;           // Target memory ID
  label: string;            // Relationship type
  sourceScope?: Scope;      // Source scope (if cross-scope)
  targetScope?: Scope;      // Target scope (if cross-scope)
  targetAgent?: string;     // Target agent name (if cross-agent)
}
```

**Edge Types**:

| Edge Type | Use Case | Example |
|-----------|----------|---------|
| **Same-scope** | Agent memory → Agent memory | `learning-a` → `gotcha-b` (both in typescript-expert) |
| **Agent → Project** | Agent references shared knowledge | `learning-esm` → `decision-use-typescript` |
| **Project → Agent** | Project acknowledges agent implementation | `decision-api-design` → `agent:typescript-expert:artifact-validation` |
| **Cross-agent** | Agent references another agent's memory | `typescript-expert:learning-a` → `rust-expert:learning-b` |

**Cross-Scope Edge Example**:
```json
{
  "source": "learning-esm-imports",
  "target": "decision-use-typescript",
  "label": "informs",
  "sourceScope": "agent-project",
  "targetScope": "project",
  "targetAgent": null
}
```

**Storage Rules**:
- **Same-scope edges**: Stored only in agent's graph.json, no scope metadata
- **Cross-scope edges**: Stored in BOTH source and target graph files with full scope metadata
- **Edge deletion**: Must remove from all affected graph files

**Relationships**:
- **BelongsTo** one `AgentScope`
- **References** many `AgentMemory` or `ProjectMemory` nodes

---

## Entity: AgentIndex

**Description**: Cached metadata index for agent memories, stored in `<agent-scope>/index.json`

**Schema**: Identical to existing index schema

**Structure**:
```typescript
interface AgentIndex {
  version: number;
  memories: IndexEntry[];
  lastUpdated: string;
}

interface IndexEntry {
  id: string;
  type: MemoryType;
  title: string;
  tags: string[];
  created: string;
  updated: string;
  relativePath: string;
  severity?: Severity;
  // Note: scope and agent fields NOT stored in index (inferred from directory)
}
```

**Update Triggers**:
- Memory created in agent scope
- Memory updated in agent scope
- Memory deleted from agent scope
- Memory moved to/from agent scope

**Performance Characteristics**:
- O(1) lookup by ID
- O(n) search by type/tags (n = agent memories only)
- Cached in memory during session

**Relationships**:
- **BelongsTo** one `AgentScope`
- **Indexes** many `AgentMemory` entities

---

## Extended Entity: Scope (Enum)

**Description**: Extended scope hierarchy including agent scopes

**Values**:

| Value | Storage Location | Git Tracked | Use Case |
|-------|------------------|-------------|----------|
| `enterprise` | Managed settings path | Yes | Organisation-wide knowledge |
| `local` | `.claude/memory/local/` | No | Personal project notes |
| `project` | `.claude/memory/` | Yes | Shared project knowledge |
| `global` | `~/.claude/memory/` | No | Personal cross-project knowledge |
| **`agent-project`** | `.claude/memory/agents/{name}/` | **Yes** | **Agent project knowledge** |
| **`agent-global`** | `~/.claude/memory/agents/{name}/` | **No** | **Agent cross-project knowledge** |

**Hierarchy for Agent Operations**:
```
With --agent flag:
  agent-project (search first)
    ↓
  agent-global
    ↓ (only with --include-shared)
  project
    ↓
  global

Without --agent flag (existing behaviour):
  enterprise
    ↓
  local
    ↓
  project
    ↓
  global
```

**Resolution Logic**:
- Default for `--agent` in git repo: `agent-project`
- Default for `--agent` outside git repo: `agent-global`
- Default without `--agent`: unchanged (project if git, else global)

---

## Data Migrations

### Migration 1: Existing Graphs to Support Cross-Scope Edges

**Required**: No

**Reason**: Backward compatible - existing edges without scope metadata are treated as same-scope edges

**Automatic Upgrade Path**:
- Existing edges remain valid
- Cross-scope edges automatically include metadata when created
- No schema version bump required

**Example**:
```json
// Existing edge (v1.2.0 and earlier)
{
  "source": "learning-a",
  "target": "learning-b",
  "label": "relates-to"
}

// Still valid in v1.3.0 - interpreted as same-scope edge
// New cross-scope edge adds metadata
{
  "source": "learning-c",
  "target": "decision-d",
  "label": "informs",
  "sourceScope": "agent-project",
  "targetScope": "project"
}
```

### Migration 2: Memory Frontmatter

**Required**: No

**Reason**: `agent` field is optional, existing memories continue to work

**Automatic Upgrade Path**:
- Existing memories have no `agent` field
- Agent-scoped memories include `agent` field from creation
- No need to retroactively add field to existing memories

---

## Validation Rules

### Agent Name Sanitisation

**Input** → **Output**:
- `TypeScript Expert` → `typescript-expert`
- `rust_expert` → `rust-expert`
- `API Architect (Senior)` → `api-architect-senior`
- `émigré-agent` → `emigre-agent` (ASCII transliteration)
- `123-agent` → `123-agent` (leading numbers allowed)
- `--my-agent--` → `my-agent` (trim hyphens)

**Algorithm**:
1. Convert to lowercase
2. Replace whitespace and underscores with hyphens
3. Remove non-alphanumeric except hyphens
4. Collapse multiple hyphens to single hyphen
5. Trim leading/trailing hyphens
6. Validate minimum length (1 character after sanitisation)

**Validation Errors**:
- Empty string after sanitisation → "Agent name must contain at least one alphanumeric character"
- Reserved names (`project`, `global`, `local`, `enterprise`) → "Agent name conflicts with scope name"

### Cross-Scope Link Validation

**Rules**:
- Source memory must exist in its declared scope
- Target memory must exist in its declared scope
- Both source and target scopes must be accessible
- Cross-scope edges must have `sourceScope`, `targetScope` metadata
- If target is agent memory, `targetAgent` must match agent name

**Cleanup on Deletion**:
1. Memory deleted from scope A
2. Find all cross-scope edges referencing memory
3. Remove edges from all affected scope graphs (A, B, C, ...)
4. Update orphan status in remaining scopes

---

## State Transitions

### Agent Directory Lifecycle

```
[Not Exists]
    │
    │ First memory write with --agent
    ↓
[Directory Created]
    │ - permanent/ directory
    │ - index.json (empty)
    │ - graph.json (empty)
    │ - embeddings.json (empty)
    ↓
[Active]
    │ - Contains memories
    │ - Index updated on write/delete
    │ - Graph updated on link/unlink
    ↓
[Archived] (manual operation, not in v1.3.0)
    │ - Moved to .claude/memory/agents/.archived/{name}/
```

### Memory Scope Transition

```
[Created in Agent Scope]
    │
    │ memory move --from-agent X --to-scope project
    ↓
[Moved to Project Scope]
    │ - File moved to project directory
    │ - Frontmatter updated (remove agent, change scope)
    │ - Cross-scope links become same-scope
    │ - Index updated in both scopes
    │ - Graph updated in both scopes
```

**Note**: Memory scope transitions are supported but not prioritised for v1.3.0 (basic move operation sufficient).

---

## Performance Considerations

### Index Caching

- Agent indexes cached separately from project index
- Cache invalidated on write/delete operations
- Cache key: `agent:{name}:scope:{type}`

### Graph Loading

- Agent graphs loaded on-demand
- Cross-scope link traversal requires loading multiple graphs
- Optimisation: cache loaded graphs during single operation (e.g., impact analysis)

### Search Performance

- Agent-scoped search: O(n) where n = agent memories only
- `--include-shared` flag: O(n + m) where m = project/global memories
- Semantic search uses agent-specific embeddings.json (isolated vector space)

---

## Example Data Flows

### Example 1: Create Agent Memory

```
User: memory write "ESM imports" --type learning --agent typescript-expert

1. CLI parser extracts --agent flag → agent = "typescript-expert"
2. Sanitise agent name → "typescript-expert" (already clean)
3. Resolve scope: in git repo → agent-project
4. Calculate base path: .claude/memory/agents/typescript-expert/
5. Check if directory exists → No
6. Create directory structure (permanent/, index.json, graph.json, embeddings.json)
7. Generate memory ID → learning-esm-imports
8. Build frontmatter:
   - id: learning-esm-imports
   - scope: agent-project
   - agent: typescript-expert
   - ... other fields
9. Write file: .claude/memory/agents/typescript-expert/permanent/learning-esm-imports.md
10. Update index.json with new entry
11. Return success with memory ID
```

### Example 2: Cross-Scope Link

```
User: memory link learning-esm-imports decision-use-typescript --agent typescript-expert

1. Parse arguments:
   - source: learning-esm-imports (agent-scoped)
   - target: decision-use-typescript (project-scoped)
   - agent: typescript-expert
2. Load agent graph: .claude/memory/agents/typescript-expert/graph.json
3. Load project graph: .claude/memory/graph.json
4. Verify source exists in agent scope → Yes
5. Verify target exists in project scope → Yes
6. Create edge in agent graph:
   {
     source: "learning-esm-imports",
     target: "decision-use-typescript",
     label: "relates-to",
     sourceScope: "agent-project",
     targetScope: "project"
   }
7. Create reverse edge in project graph:
   {
     source: "decision-use-typescript",
     target: "learning-esm-imports",
     label: "relates-to",
     sourceScope: "project",
     targetScope: "agent-project",
     targetAgent: "typescript-expert"
   }
8. Save both graphs
9. Return success
```

### Example 3: Delete with Cross-Scope Cleanup

```
User: memory delete decision-use-typescript (project memory with agent links)

1. Load project graph
2. Find all edges referencing decision-use-typescript
3. Identify cross-scope edges:
   - Edge to agent:typescript-expert:learning-esm-imports
   - Edge to agent:rust-expert:artifact-validation
4. For each cross-scope edge:
   a. Load target agent graph
   b. Remove reverse edge
   c. Save agent graph
5. Remove all edges from project graph
6. Delete memory file
7. Update project index
8. Return success with cleanup report:
   - Removed 2 cross-scope links
   - Affected agents: typescript-expert, rust-expert
```

---

**Data Model Version**: 1.0.0
**Schema Compatibility**: Backward compatible with v1.2.0 memory files and graphs
