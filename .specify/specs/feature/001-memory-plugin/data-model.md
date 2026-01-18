# Data Model: Claude Code Memory Plugin

**Feature**: 001-memory-plugin
**Created**: 2026-01-10
**Purpose**: Define entity schemas, relationships, and state transitions

---

## Entity: Memory

**Description**: A knowledge artifact stored as a markdown file with YAML frontmatter. Represents decisions, learnings, gotchas, artifacts, breadcrumbs, or hubs.

**File Location**:
- Global: `~/.claude/memory/<slug>.md`
- Project: `.claude/memory/<slug>.md`
- Local: `.claude/memory/local/<slug>.md`
- Enterprise: `<enterprisePath>/<slug>.md`

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| slug | string | Yes | `^[a-z0-9]+(-[a-z0-9]+)*$` | Unique identifier, URL-safe, type-prefixed |
| type | MemoryType | Yes | One of: decision, learning, artifact, gotcha, breadcrumb, hub | Memory category |
| title | string | Yes | 1-200 chars | Human-readable title |
| tags | string[] | Yes | Lowercase, hyphenated, 1-50 chars each | Categorisation tags |
| created | ISO8601 | Yes | Valid ISO 8601 timestamp | Creation timestamp |
| updated | ISO8601 | Yes | Valid ISO 8601 timestamp, >= created | Last update timestamp |
| links | string[] | No | Array of valid slugs | References to linked memories |
| content | string | Yes | Markdown, 0-50000 chars | Memory body content |
| scope | Scope | Yes | One of: global, project, local, enterprise | Storage scope |
| embedding | number[] | No | Array of floats (computed) | Semantic embedding vector (cached separately) |

**Relationships**:
- **HasMany** Edge (via Graph): Memory can have multiple outgoing edges
- **HasMany** Edge (via Graph): Memory can have multiple incoming edges
- **BelongsTo** Scope: Memory exists in one of four scopes

**Validation Rules**:
- `slug` must be unique within scope
- `type` must be valid MemoryType enum value
- `tags` array must not be empty
- `created` timestamp must not be in the future
- `updated` timestamp must be >= `created`
- `links` must reference existing memories (validated on read, not write)

**File Format Example**:
```markdown
---
type: decision
tags:
  - auth
  - oauth2
  - security
created: "2026-01-10T10:00:00Z"
updated: "2026-01-10T10:30:00Z"
links:
  - learning-token-refresh
  - hub-authentication
---

# OAuth2 Implementation Decision

We decided to use OAuth2 with PKCE flow for authentication...

## Rationale

- Industry standard
- Better security than basic auth
- Supports refresh tokens

## Trade-offs

- More complex than basic auth
- Requires token management
```

---

## Entity: Graph

**Description**: Adjacency list representing bidirectional relationships between memories. Stored as `graph.json` in each scope.

**File Location**:
- Global: `~/.claude/memory/graph.json`
- Project: `.claude/memory/graph.json`
- Local: `.claude/memory/local/graph.json`
- Enterprise: `<enterprisePath>/graph.json`

**Structure**:
```typescript
interface Graph {
  [memorySlug: string]: Edge[];
}

interface Edge {
  target: string;        // Target memory slug
  label: string;         // Relationship type
  timestamp: string;     // ISO 8601 creation time
}
```

**Fields** (per Edge):

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| target | string | Yes | Valid memory slug, exists in scope | Target memory identifier |
| label | string | Yes | 1-50 chars, lowercase-hyphenated | Relationship label (e.g., "implements", "relates-to") |
| timestamp | ISO8601 | Yes | Valid ISO 8601 timestamp | When edge was created |

**Relationships**:
- **Links** Memory to Memory: Bidirectional edges between memories
- **BelongsTo** Scope: Each graph.json is scoped

**Validation Rules**:
- Edges must be bidirectional (if A→B exists, B→A must exist)
- Target memory must exist in the same scope
- No self-referential edges (A→A)
- No duplicate edges (same source, target, and label)

**Example graph.json**:
```json
{
  "decision-oauth2": [
    {
      "target": "learning-token-refresh",
      "label": "implements",
      "timestamp": "2026-01-10T10:00:00Z"
    },
    {
      "target": "hub-authentication",
      "label": "part-of",
      "timestamp": "2026-01-10T10:05:00Z"
    }
  ],
  "learning-token-refresh": [
    {
      "target": "decision-oauth2",
      "label": "implemented-by",
      "timestamp": "2026-01-10T10:00:00Z"
    }
  ],
  "hub-authentication": [
    {
      "target": "decision-oauth2",
      "label": "contains",
      "timestamp": "2026-01-10T10:05:00Z"
    }
  ]
}
```

**Bidirectional Consistency**:
When creating edge A→B with label "implements":
1. Add edge to A's adjacency list: `{ target: B, label: "implements", timestamp }`
2. Add reverse edge to B's adjacency list: `{ target: A, label: "implemented-by", timestamp }`
3. Update both memory frontmatter `links` arrays

**Label Conventions**:
- `implements` ↔ `implemented-by`
- `relates-to` ↔ `relates-to` (symmetric)
- `part-of` ↔ `contains`
- `builds-on` ↔ `foundation-for`
- `similar-to` ↔ `similar-to` (symmetric)

---

## Entity: Index

**Description**: Cached metadata for fast memory lookups without filesystem scans. Stored as `index.json` in each scope.

**File Location**:
- Global: `~/.claude/memory/index.json`
- Project: `.claude/memory/index.json`
- Local: `.claude/memory/local/index.json`
- Enterprise: `<enterprisePath>/index.json`

**Structure**:
```typescript
interface Index {
  version: string;                    // Index schema version (for migrations)
  lastUpdated: string;                // ISO 8601 timestamp
  memories: Record<string, IndexEntry>;
}

interface IndexEntry {
  slug: string;
  title: string;
  type: MemoryType;
  tags: string[];
  created: string;
  updated: string;
  filePath: string;                   // Absolute path to memory file
  hasEmbedding: boolean;              // Whether embedding cache exists
}
```

**Fields** (per IndexEntry):

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| slug | string | Yes | Valid memory slug | Memory identifier (also the key) |
| title | string | Yes | 1-200 chars | Memory title |
| type | MemoryType | Yes | Valid enum value | Memory category |
| tags | string[] | Yes | Non-empty array | Categorisation tags |
| created | ISO8601 | Yes | Valid timestamp | Creation time |
| updated | ISO8601 | Yes | Valid timestamp | Last update time |
| filePath | string | Yes | Absolute path, file exists | Full path to memory file |
| hasEmbedding | boolean | Yes | - | Whether embedding cache exists |

**Relationships**:
- **MirrorsMany** Memory: Index entry for each memory in scope
- **BelongsTo** Scope: Each index.json is scoped

**Validation Rules**:
- `slug` keys must match `slug` values in entries
- All `filePath` references must point to existing files
- `updated` timestamps must be <= current time

**Example index.json**:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-10T10:30:00Z",
  "memories": {
    "decision-oauth2": {
      "slug": "decision-oauth2",
      "title": "OAuth2 Implementation Decision",
      "type": "decision",
      "tags": ["auth", "oauth2", "security"],
      "created": "2026-01-10T10:00:00Z",
      "updated": "2026-01-10T10:30:00Z",
      "filePath": "/home/user/.claude/memory/decision-oauth2.md",
      "hasEmbedding": true
    },
    "learning-token-refresh": {
      "slug": "learning-token-refresh",
      "title": "Token Refresh Pattern",
      "type": "learning",
      "tags": ["auth", "oauth2", "patterns"],
      "created": "2026-01-10T09:45:00Z",
      "updated": "2026-01-10T09:45:00Z",
      "filePath": "/home/user/.claude/memory/learning-token-refresh.md",
      "hasEmbedding": true
    }
  }
}
```

**Update Strategy**:
- Update index on every CRUD operation (create, update, delete)
- Rebuild from filesystem if corrupted (scan all .md files)
- Validate on session start (check file existence)

---

## Entity: EmbeddingCache

**Description**: Cached embedding vectors for semantic search. One file per memory.

**File Location**: `.embedding-cache/<slug>.json` (in same directory as index.json)

**Structure**:
```typescript
interface EmbeddingCacheEntry {
  slug: string;
  model: string;                      // Embedding model used (e.g., "embeddinggemma")
  vector: number[];                   // Embedding vector (typically 768-1536 dimensions)
  contentHash: string;                // SHA-256 hash of memory content (for staleness detection)
  timestamp: string;                  // ISO 8601 when embedding was computed
}
```

**Fields**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| slug | string | Yes | Valid memory slug | Memory identifier |
| model | string | Yes | Non-empty | Embedding model name |
| vector | number[] | Yes | Array of floats, length 768-1536 | Embedding vector |
| contentHash | string | Yes | SHA-256 hex (64 chars) | Hash of memory content |
| timestamp | ISO8601 | Yes | Valid timestamp | When computed |

**Relationships**:
- **BelongsTo** Memory (1:1): One cache entry per memory
- **BelongsTo** Scope: Cache exists in same scope as memory

**Validation Rules**:
- `contentHash` must match current memory content (recompute if stale)
- `vector` length must match model's output dimension
- Cache files without corresponding memories should be cleaned up

**Example .embedding-cache/decision-oauth2.json**:
```json
{
  "slug": "decision-oauth2",
  "model": "embeddinggemma",
  "vector": [0.123, -0.456, 0.789, /* ... 768 dimensions */],
  "contentHash": "a3d5f1b2c4e6d8f9a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6",
  "timestamp": "2026-01-10T10:00:30Z"
}
```

**Staleness Detection**:
```typescript
function isCacheStale(memory: Memory, cache: EmbeddingCacheEntry): boolean {
  const currentHash = sha256(memory.content);
  return cache.contentHash !== currentHash;
}
```

**Cache Invalidation**:
- On memory update: Delete cache file (recompute on next semantic search)
- On memory delete: Delete cache file
- On model change: Delete all cache files (different embedding space)

---

## Entity: Config

**Description**: User configuration for embedding provider, scope preferences, and plugin behaviour.

**File Location**:
- Global: `~/.claude/memory/config.json`
- Project: `.claude/memory/config.json`

**Structure**:
```typescript
interface Config {
  embedding: EmbeddingConfig;
  scopes: ScopeConfig;
  quality: QualityConfig;
}

interface EmbeddingConfig {
  provider: "ollama" | "openai" | "disabled";
  endpoint: string;                   // Ollama endpoint (default: http://localhost:11434)
  model: string;                      // Primary embedding model
  fallbackModels: string[];           // Fallback models to try
  cacheDirectory: string;             // Cache directory name (default: .embedding-cache)
}

interface ScopeConfig {
  default: "auto" | "global" | "project" | "local";
  enterprise: {
    enabled: boolean;                 // Default: false
  };
}

interface QualityConfig {
  orphanThreshold: number;            // Days before orphan is flagged (default: 30)
  minQualityScore: number;            // Minimum acceptable quality score (default: 50)
}
```

**Fields**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| embedding.provider | string | No | "ollama" | Embedding provider |
| embedding.endpoint | string | No | "http://localhost:11434" | Ollama endpoint |
| embedding.model | string | No | "embeddinggemma" | Primary model |
| embedding.fallbackModels | string[] | No | ["nomic-embed-text", "all-minilm"] | Fallback models |
| embedding.cacheDirectory | string | No | ".embedding-cache" | Cache directory |
| scopes.default | string | No | "auto" | Default scope selection |
| scopes.enterprise.enabled | boolean | No | false | Enable enterprise scope |
| quality.orphanThreshold | number | No | 30 | Days before orphan flagged |
| quality.minQualityScore | number | No | 50 | Minimum quality score |

**Relationships**:
- **ConfiguresOne** Plugin: Single config per scope
- **BelongsTo** Scope: Config can be global or project

**Validation Rules**:
- `embedding.endpoint` must be valid URL
- `embedding.model` and `fallbackModels` must be non-empty strings
- `scopes.default` must be valid enum value
- `quality.orphanThreshold` must be positive integer
- `quality.minQualityScore` must be 0-100

**Example config.json**:
```json
{
  "embedding": {
    "provider": "ollama",
    "endpoint": "http://localhost:11434",
    "model": "embeddinggemma",
    "fallbackModels": ["nomic-embed-text", "all-minilm"],
    "cacheDirectory": ".embedding-cache"
  },
  "scopes": {
    "default": "auto",
    "enterprise": {
      "enabled": false
    }
  },
  "quality": {
    "orphanThreshold": 30,
    "minQualityScore": 50
  }
}
```

**Precedence**: Project config.json overrides global config.json (merged deeply)

---

## Enums

### MemoryType

```typescript
enum MemoryType {
  DECISION = "decision",       // Architectural or design decisions
  LEARNING = "learning",       // Lessons learned from experience
  ARTIFACT = "artifact",       // Code snippets, templates, examples
  GOTCHA = "gotcha",          // Warnings, pitfalls, anti-patterns
  BREADCRUMB = "breadcrumb",  // Navigational hints, quick references
  HUB = "hub"                 // Aggregation nodes for related memories
}
```

### Scope

```typescript
enum Scope {
  GLOBAL = "global",           // ~/.claude/memory/ (personal, cross-project)
  PROJECT = "project",         // .claude/memory/ (shared via git)
  LOCAL = "local",             // .claude/memory/local/ (gitignored)
  ENTERPRISE = "enterprise"    // Managed path (organisation-wide)
}
```

---

## State Transitions

### Memory Lifecycle

```
[Draft] → [Created] → [Updated]* → [Deleted]
```

**States**:
- **Draft**: Memory being written (in-memory, not persisted)
- **Created**: Memory file written to disk, index updated, graph updated (if links)
- **Updated**: Memory content or frontmatter modified, `updated` timestamp changed
- **Deleted**: Memory file removed, index entry removed, graph edges cleaned up

**Transitions**:
- **Draft → Created**: `memory write` command executes successfully
- **Created → Updated**: `memory update` command or manual file edit
- **Updated → Updated**: Multiple updates allowed
- **Created/Updated → Deleted**: `memory delete` command

**Invariants**:
- Index must always reflect filesystem state (sync on CRUD)
- Graph edges must always be bidirectional (sync on link/unlink)
- Embedding cache optional (can be missing or stale)

### Graph Edge Lifecycle

```
[Proposed] → [Created] → [Deleted]
```

**States**:
- **Proposed**: Suggested by AI link recommendation (not yet created)
- **Created**: Bidirectional edge added to graph.json, frontmatter updated
- **Deleted**: Edge removed from graph.json, frontmatter updated

**Transitions**:
- **Proposed → Created**: User accepts suggestion via `memory link`
- **Created → Deleted**: User runs `memory unlink` or deletes source/target memory
- **Proposed → Deleted**: User rejects suggestion (no-op)

**Cascade Deletes**:
- When memory is deleted, all edges referencing it are removed (both directions)
- Orphaned hubs (no remaining edges) are flagged in health check

### Index Rebuild Trigger

```
[Valid] → [Corrupted] → [Rebuilding] → [Valid]
```

**States**:
- **Valid**: index.json is consistent with filesystem
- **Corrupted**: index.json is malformed, missing, or inconsistent
- **Rebuilding**: Scanning filesystem to regenerate index
- **Valid**: Rebuild complete, index consistent

**Transitions**:
- **Valid → Corrupted**: File deleted manually, index.json malformed, filesystem scan reveals inconsistency
- **Corrupted → Rebuilding**: Health check or CRUD operation detects corruption
- **Rebuilding → Valid**: Rebuild completes successfully

**Rebuild Process**:
1. Scan all `*.md` files in scope directory
2. Parse YAML frontmatter from each file
3. Create IndexEntry for each valid memory
4. Write index.json atomically (write to temp file, rename)
5. Validate graph.json references against rebuilt index

---

## Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Scope Hierarchy                          │
│  Enterprise → Local → Project → Global                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Contains
                              ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Memory     │◄──────►│    Graph     │        │    Index     │
│  (*.md file) │ Links  │ (graph.json) │        │(index.json)  │
└──────────────┘        └──────────────┘        └──────────────┘
       │                                               │
       │ Cached by                                     │ References
       ▼                                               ▼
┌──────────────────────┐                    ┌──────────────┐
│  EmbeddingCache      │                    │ IndexEntry   │
│ (.embedding-cache/)  │                    │   (cached)   │
└──────────────────────┘                    └──────────────┘
       │
       │ Configured by
       ▼
┌──────────────┐
│    Config    │
│(config.json) │
└──────────────┘
```

**Cardinality**:
- Memory 1:N Graph (one memory can have many edges)
- Memory 1:1 IndexEntry (one index entry per memory)
- Memory 1:0..1 EmbeddingCache (cache is optional)
- Scope 1:1 Index (one index per scope)
- Scope 1:1 Graph (one graph per scope)
- Scope 0..1:1 Config (config can be global or project)

---

## Data Integrity Rules

1. **Filesystem is Source of Truth**: Index and cache are derived data. On conflict, filesystem wins.

2. **Atomic Writes**: All file writes use atomic operations (write to temp, rename). No partial writes.

3. **Bidirectional Consistency**: Graph edges must always exist in both directions. Orphaned edges are invalid.

4. **Index Consistency**: Index must reflect filesystem. Rebuild on inconsistency detection.

5. **Cache Staleness**: Embedding cache is advisory. Stale cache is recomputed, not an error.

6. **Scope Isolation**: Memories in different scopes are independent. No cross-scope links.

7. **Slug Uniqueness**: Slugs must be unique within a scope. Cross-scope duplicates allowed.

8. **Timestamp Monotonicity**: `updated` must always be >= `created`. Future timestamps rejected.

---

**Data Model Version**: 1.0.0
**Last Updated**: 2026-01-10
**Ready for**: Contract Definition and Implementation
