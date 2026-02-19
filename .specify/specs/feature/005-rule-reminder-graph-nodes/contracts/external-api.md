# External Module API Contract

**Module**: `skills/memory/src/external/`

**Purpose**: Discover and index external Claude CLI files (CLAUDE.md, rules/*.md, agent MEMORY.md) as read-only graph nodes.

---

## Module Structure

```
external/
├── external-file-types.ts       # Type definitions and enums
├── external-file-types.spec.ts
├── external-file-discovery.ts   # Discovery algorithms
├── external-file-discovery.spec.ts
├── external-file-indexer.ts     # Graph/index/embedding integration
├── external-file-indexer.spec.ts
└── index.ts                     # Public API exports
```

---

## Public API: external-file-types.ts

### ExternalFileKind Enum

```typescript
/**
 * Distinguishes sub-types of external files within rule and reminder categories
 */
export enum ExternalFileKind {
  /** CLAUDE.md at any level (prescriptive instructions) */
  ClaudeInstructions = 'claude-instructions',

  /** CLAUDE.local.md at any level (local-only prescriptive instructions) */
  ClaudeLocalInstructions = 'claude-local-instructions',

  /** File in .claude/rules/ or ~/.claude/rules/ directory */
  RulesFile = 'rules-file',

  /** MEMORY.md file in agent-memory directory (primary agent summary) */
  AgentMemorySummary = 'agent-memory-summary',

  /** Sub-file in agent-memory directory (e.g., patterns.md, debugging.md) */
  AgentMemorySubFile = 'agent-memory-sub-file',
}
```

### ExternalFileEntry Interface

```typescript
/**
 * Represents a discovered external file before indexing
 */
export interface ExternalFileEntry {
  /** Absolute canonical path to the external file */
  absolutePath: string;

  /** Sub-kind of external file */
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

  /** ISO 8601 timestamp when file was last modified */
  modifiedTime: string;
}
```

**Validation Constraints**:
- `absolutePath`: Must be canonical (symlinks resolved), must exist on filesystem
- `kind`: Must be valid ExternalFileKind enum value
- `scope`: Must be valid Scope enum value
- `agentName`: Required when kind is AgentMemorySummary or AgentMemorySubFile
- `contentHash`: Must match actual file content SHA-256 (first 16 hex chars)
- `id`: Must follow deterministic generation scheme (see examples below)
- `title`: Non-empty string derived from filename

**ID Generation Scheme Examples**:

Rule file IDs:
- `CLAUDE.md` at project root → `rule-project-claude-md-root`
- `.claude/CLAUDE.md` at project root → `rule-project-claude-md-dotclaude`
- `CLAUDE.local.md` at project root → `rule-local-claude-md-root`
- `.claude/CLAUDE.local.md` at project root → `rule-local-claude-md-dotclaude-local`
- `~/.claude/CLAUDE.md` → `rule-global-claude-md`
- `CLAUDE.md` two dirs up from cwd → `rule-ancestor-2-claude-md-root`
- `.claude/rules/security.md` → `rule-project-security`
- `~/.claude/rules/tdd.md` → `rule-global-tdd`

Reminder file IDs:
- `.claude/agent-memory/curator/MEMORY.md` → `reminder-project-curator-memory`
- `.claude/agent-memory/curator/patterns.md` → `reminder-project-curator-patterns`
- `.claude/agent-memory-local/speckit-planner/MEMORY.md` → `reminder-local-speckit-planner-memory`
- `~/.claude/agent-memory/curator/MEMORY.md` → `reminder-global-curator-memory`

**ID Generation Rules**:
1. Prefix: `rule-` or `reminder-`
2. Scope: `project`, `local`, `global`, or `ancestor-N` (where N = levels up from cwd)
3. Agent name (reminders only): hyphenated lowercase (e.g., `curator`, `speckit-planner`)
4. File identifier: derived from filename, hyphens for spaces/underscores
5. Suffix (when needed): `-root` (top-level CLAUDE.md), `-dotclaude` (.claude/ variant), `-dotclaude-local` (.claude/ local variant)

---

## Public API: external-file-discovery.ts

### discoverRuleFiles()

```typescript
/**
 * Discover all rule files (CLAUDE.md, CLAUDE.local.md, rules/*.md) in known paths
 *
 * Discovery algorithm:
 * 1. Walk up from cwd to home directory, collecting CLAUDE.md and CLAUDE.local.md at each level
 * 2. Scan ~/.claude/CLAUDE.md and ~/.claude/CLAUDE.local.md
 * 3. Scan .claude/rules/*.md (project) and ~/.claude/rules/*.md (global)
 * 4. Filter out vendor directories (node_modules, .git, dist, build, vendor)
 * 5. Resolve symlinks to canonical paths
 * 6. Generate deterministic IDs
 *
 * @param options - Discovery options
 * @param options.cwd - Current working directory (default: process.cwd())
 * @param options.homeDir - Home directory (default: os.homedir())
 * @param options.gitRoot - Git repository root (for scope determination)
 * @returns Array of discovered rule file entries
 *
 * @throws Never throws - errors logged and invalid files skipped
 */
export function discoverRuleFiles(options?: {
  cwd?: string;
  homeDir?: string;
  gitRoot?: string;
}): ExternalFileEntry[];
```

**Behaviour**:
- Walks directory tree from `cwd` upward to `homeDir`
- At each level, checks for CLAUDE.md and CLAUDE.local.md
- Scans .claude/rules/ and ~/.claude/rules/ for *.md files
- Excludes paths containing: `node_modules`, `.git`, `dist`, `build`, `vendor`
- Resolves symlinks via `fs.realpathSync()` to prevent duplicate indexing
- Tracks visited canonical paths in Set to prevent loops
- Generates deterministic IDs (rule-project-claude-md, rule-global-security, etc.)
- Returns empty array if no rule files found (graceful, not an error)

**Determinism Guarantee**: Same filesystem state produces same array (stable ordering via sorted enumeration).

### discoverReminderFiles()

```typescript
/**
 * Discover all reminder files (MEMORY.md and sub-files) in agent-memory directories
 *
 * Discovery algorithm:
 * 1. Enumerate .claude/agent-memory/{name}/ → MEMORY.md + *.md sub-files (agent-project scope)
 * 2. Enumerate .claude/agent-memory-local/{name}/ → MEMORY.md + *.md sub-files (local scope)
 * 3. Enumerate ~/.claude/agent-memory/{name}/ → MEMORY.md + *.md sub-files (agent-global scope)
 * 4. Resolve symlinks to canonical paths
 * 5. Generate deterministic IDs
 *
 * @param options - Discovery options
 * @param options.projectRoot - Project root directory (default: process.cwd())
 * @param options.homeDir - Home directory (default: os.homedir())
 * @returns Array of discovered reminder file entries
 *
 * @throws Never throws - errors logged and invalid files skipped
 */
export function discoverReminderFiles(options?: {
  projectRoot?: string;
  homeDir?: string;
}): ExternalFileEntry[];
```

**Behaviour**:
- Enumerates agent-memory directories in project (.claude/agent-memory/) and global (~/.claude/agent-memory/)
- For each agent directory, finds MEMORY.md (if exists) and all *.md sub-files
- Resolves symlinks to canonical paths
- Extracts agent name from directory name (e.g., curator, speckit-planner)
- Generates deterministic IDs (reminder-project-curator-memory, reminder-global-curator-patterns)
- Skips agent directories with no markdown files (not an error)
- Returns empty array if no reminder files found

**Determinism Guarantee**: Same filesystem state produces same array (sorted agent names, sorted filenames within each agent).

### discoverExternalFiles()

```typescript
/**
 * Discover all external files (rules + reminders) in one operation
 *
 * Convenience function combining discoverRuleFiles() and discoverReminderFiles().
 *
 * @param options - Discovery options (merged from both rule and reminder options)
 * @returns Array of all discovered external file entries (rules first, then reminders)
 */
export function discoverExternalFiles(options?: {
  cwd?: string;
  homeDir?: string;
  gitRoot?: string;
  projectRoot?: string;
}): ExternalFileEntry[];
```

**Behaviour**:
- Calls `discoverRuleFiles()` and `discoverReminderFiles()`
- Concatenates results (rules first, reminders second)
- Returns combined array

---

## Public API: external-file-indexer.ts

### IndexExternalFilesRequest Interface

```typescript
/**
 * Request parameters for indexing external files
 */
export interface IndexExternalFilesRequest {
  /** Base path for memory storage */
  basePath: string;

  /** Current graph (will be modified in-place) */
  graph: MemoryGraph;

  /** Current index (will be modified in-place) */
  index: MemoryIndex;

  /** Path to embeddings cache file */
  embeddingsPath: string;

  /** Embedding provider (optional - graceful fallback if undefined) */
  embeddingProvider?: EmbeddingProvider;

  /** Dry run - report changes without applying */
  dryRun?: boolean;

  /** Discovered external files (if not provided, runs discovery automatically) */
  externalFiles?: ExternalFileEntry[];
}
```

### IndexExternalFilesResponse Interface

```typescript
/**
 * Response from indexing external files
 */
export interface IndexExternalFilesResponse {
  status: 'success' | 'error';

  /** Changes made during indexing */
  changes: {
    /** External nodes added to graph */
    addedNodes: string[];

    /** External nodes updated (content hash changed) */
    updatedNodes: string[];

    /** External nodes removed (file deleted) */
    removedNodes: string[];

    /** Embeddings generated */
    embeddingsGenerated: number;

    /** Embeddings reused from cache */
    embeddingsReused: number;
  };

  /** Summary counts after indexing */
  summary: {
    totalExternalNodes: number;
    ruleNodes: number;
    reminderNodes: number;
  };

  errors?: string[];
}
```

### indexExternalFiles()

```typescript
/**
 * Index discovered external files into graph, index, and embeddings
 *
 * Algorithm:
 * 1. Discover external files (if not provided in request)
 * 2. For each discovered file:
 *    a. Read content from absolutePath
 *    b. Generate content hash
 *    c. Check if node already exists in graph
 *    d. If new or hash changed:
 *       - Create/update GraphNode
 *       - Create/update IndexEntry
 *       - Generate/update embedding (if provider available)
 * 3. Find external nodes in graph that no longer exist on disk → remove them
 * 4. Save changes (unless dryRun=true)
 *
 * @param request - Indexing request parameters
 * @returns Promise resolving to indexing response
 *
 * @throws Never throws - errors captured in response.errors array
 */
export async function indexExternalFiles(
  request: IndexExternalFilesRequest
): Promise<IndexExternalFilesResponse>;
```

**Behaviour**:
- **Discovery**: If `request.externalFiles` not provided, calls `discoverExternalFiles()` automatically
- **Content Reading**: Reads file content from `absolutePath`, generates content hash
- **Node Creation**: Creates GraphNode with `{ id, type: 'rule'|'reminder', title, scope, agent? }`
- **Index Entry Creation**: Creates IndexEntry with `externalPath`, `externalFileKind`, sentinel `relativePath: 'external/<id>'`
- **Embedding Generation**:
  - If `embeddingProvider` available: generates embedding via `getEmbeddingForMemory()`
  - Content truncated via `truncateForEmbedding()` (6000 char limit)
  - Content hash enables cache invalidation
  - If provider unavailable: skips embeddings (graceful degradation)
- **Change Detection**: Compares content hash to existing embedding cache entry
- **Stale Node Removal**: Finds external nodes in graph with no corresponding discovered file → removes them
- **Atomic Saves**: Updates graph, index, embeddings only if NOT dry run
- **Error Handling**: Logs errors, continues processing remaining files, reports errors in response

**Idempotency**: Calling twice with same filesystem state produces same result.

**Performance**: O(n) where n = number of external files. Embedding generation is parallelisable (future optimisation).

---

## Integration Contract: maintenance/sync.ts

### syncMemories() Extension

**Location**: `skills/memory/src/maintenance/sync.ts`

**Modification**: Add external file indexing as final pass after orphan cleanup.

**Pseudo-code**:
```typescript
export async function syncMemories(request: SyncRequest): Promise<SyncResponse> {
  // ... existing reconciliation logic (lines 189-340) ...

  // NEW: Index external files as final pass
  if (!dryRun) {
    const embeddingProvider = await createOllamaProviderWithHealthCheck();
    const externalResponse = await indexExternalFiles({
      basePath,
      graph,
      index,
      embeddingsPath: path.join(basePath, 'embeddings.json'),
      embeddingProvider,
      dryRun: false,
    });

    // Merge changes into response
    changes.addedToGraph.push(...externalResponse.changes.addedNodes);
    // Note: Updated/removed external nodes tracked separately
  }

  // ... save graph, index, embeddings ...

  return { status, changes, summary, errors };
}
```

**Contract**:
- External indexing runs AFTER all orphan cleanup
- Failed external indexing does NOT fail entire sync
- External node changes reported separately in response

---

## Integration Contract: cli/commands/maintenance.ts

### New Command: index-context

**Signature**:
```typescript
export async function cmdIndexContext(options: {
  scope?: Scope;
  dryRun?: boolean;
  agent?: string;
}): Promise<void>;
```

**Behaviour**:
- Runs ONLY external file discovery and indexing
- Skips orphan reconciliation (assumes graph is healthy)
- Respects `--scope` flag to limit re-indexing (e.g., `--scope project`)
- Supports `--agent` flag to re-index only specific agent's reminders
- Reports changes in JSON format (if JSON output enabled) or human-readable summary

**Use Case**: User edits CLAUDE.md, wants quick refresh without full `memory sync`.

**Performance**: Faster than sync (no file scanning in permanent/temporary, no orphan cleanup).

---

## Error Handling Contract

### Discovery Errors

**Unreadable file** (permissions, corrupted, etc.):
- Log warning with file path and error message
- Skip file, continue discovery
- Do NOT throw exception

**Symlink loop detected**:
- Log warning
- Skip path, continue discovery
- Do NOT throw exception

**Broken symlink** (realpath fails with ENOENT):
- Log warning with symlink path and error message
- Skip file, continue discovery
- Do NOT throw exception

**Invalid vendor path**:
- Silently skip (expected behaviour)

### Indexing Errors

**File deleted between discovery and indexing**:
- Log warning
- Skip file, continue indexing
- Remove stale node if exists

**Embedding generation failure** (Ollama unavailable, network error):
- Log warning
- Continue indexing without embedding
- Node still indexed in graph/index
- User can re-run `memory index-context` after resolving issue

**Graph/index save failure** (disk full, permissions):
- Capture error in `response.errors` array
- Return status: 'error'
- Do NOT corrupt existing graph/index (atomic writes)

---

## Testing Contract

### Unit Tests Required

**external-file-discovery.spec.ts**:
- discoverRuleFiles() finds CLAUDE.md in project root
- discoverRuleFiles() finds CLAUDE.md in ancestor directories
- discoverRuleFiles() finds rules/*.md files
- discoverRuleFiles() excludes vendor directories (node_modules, .git)
- discoverRuleFiles() resolves symlinks to canonical paths
- discoverRuleFiles() generates correct deterministic IDs
- discoverReminderFiles() finds MEMORY.md in agent directories
- discoverReminderFiles() finds sub-files in agent directories
- discoverReminderFiles() handles missing MEMORY.md gracefully
- discoverReminderFiles() extracts agent name correctly

**external-file-indexer.spec.ts**:
- indexExternalFiles() creates GraphNode for discovered rule
- indexExternalFiles() creates IndexEntry with externalPath
- indexExternalFiles() generates embedding via provider
- indexExternalFiles() reuses cached embedding if hash matches
- indexExternalFiles() updates embedding if hash differs
- indexExternalFiles() removes stale external nodes
- indexExternalFiles() handles missing embedding provider gracefully
- indexExternalFiles() respects dryRun flag

### Integration Tests Required

**external-file-indexing.spec.ts**:
- End-to-end: Create CLAUDE.md → sync → semantic search returns it
- End-to-end: Create agent MEMORY.md → sync → list shows reminder node
- End-to-end: Modify CLAUDE.md → sync → embedding regenerated
- End-to-end: Delete CLAUDE.md → sync → node removed from graph
- End-to-end: Link decision to rule → mermaid shows governed-by edge

---

## Versioning Contract

**Initial Release**: v1.5.0 (MINOR version bump - new backward-compatible feature)

**API Stability**: External module APIs are internal (not exported from plugin root). Can change in MINOR versions without breaking plugin consumers.

**Data Format Stability**: IndexEntry extensions (externalFileKind, externalPath) are additive. PATCH/MINOR versions will not remove these fields.

**Deprecation Policy**: If external module APIs need breaking changes, deprecate for one MINOR version before removal.

---

## Performance Contract

**Discovery Performance**:
- Typical project (10 rule files, 3 agents): <500ms
- Large project (50 rule files, 10 agents): <2s
- No performance degradation for projects without external files

**Indexing Performance**:
- 10 external files: <1s (excluding embedding generation)
- 50 external files: <5s (excluding embedding generation)
- Embedding generation: ~100-500ms per file (Ollama-dependent)

**Memory Usage**:
- Discovery: O(n) where n = number of files (array of ExternalFileEntry)
- Indexing: O(n) additional graph nodes + index entries
- No memory leaks (no persistent state beyond graph/index/embeddings)

**Scalability Limits**:
- Tested up to 100 external files
- Theoretical limit: ~1000 external files before performance degrades
- If exceeded: recommend splitting into multiple projects or selective indexing

---

## Backward Compatibility Contract

**Existing Functionality**:
- All existing memory operations (write, read, search, link) unchanged
- Existing graph/index/embeddings format compatible
- Existing memories unaffected

**Rollback Safety**:
- Downgrading to v1.4.x: external nodes ignored (unknown type)
- Re-upgrading to v1.5.0+: external nodes reappear on next sync
- No data loss during rollback/upgrade cycle

**Migration**:
- No migration script required
- First sync after upgrade automatically indexes external files
