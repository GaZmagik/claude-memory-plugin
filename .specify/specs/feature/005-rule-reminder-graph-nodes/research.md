# Research: Rule and Reminder Graph Nodes

**Purpose**: Document technology evaluation and architectural decisions

---

## Decision 1: Two MemoryType Values (rule + reminder)

**Chosen**: Add `MemoryType.Rule = 'rule'` and `MemoryType.Reminder = 'reminder'` as distinct enum values

**Rationale**:
- Preserves semantic distinction between prescriptive files (rules govern behaviour) and descriptive files (reminders carry agent state)
- Enables distinct graph edges: `governed-by` (memory → rule) vs `reminded-by` (memory → reminder)
- Supports visual differentiation: hexagon shape for authoritative rules, cylinder shape for persistent storage
- Future filtering: "show me decisions governed by constitution" has different intent from "show me patterns agent-curator remembers"
- Honest type system: each type accurately represents what the entity is

**Alternatives Considered**:

### Option A: Single `context-file` Type
- **Pros**: Simpler type system (one new enum value instead of two), less code duplication
- **Cons**: Obscures meaningful semantic distinction, loses graph edge specificity, conflates "how to behave" with "what I know"
- **Why not chosen**: Too generic. The prescriptive vs descriptive distinction is fundamental to how these files function in the Claude CLI ecosystem.

### Option B: Reuse `hub` Type
- **Pros**: No new enum values needed, leverages existing infrastructure
- **Cons**: Semantic corruption - Hub means "user-writable linking node in basePath", not "read-only external file". Would require special-casing throughout codebase. Violates single responsibility principle.
- **Why not chosen**: Hub has distinct lifecycle (user-created, mutable, lives in permanent/) that conflicts with external file semantics (CLI-owned, read-only, lives outside basePath).

### Option C: Generic `external` Type with Subtype Field
- **Pros**: Extensible for future external file categories
- **Cons**: Speculative complexity (violates YAGNI). Requires runtime subtype checking instead of compile-time type safety. Extra field in every query.
- **Why not chosen**: No evidence of additional external file categories needed. Two types handle current requirements cleanly.

---

## Decision 2: IndexEntry Extension Strategy

**Chosen**: Extend IndexEntry interface with two optional fields: `externalFileKind?: string` and `externalPath?: string`

**Rationale**:
- Backward compatible: existing memories never set these fields
- Type-safe: presence of `externalPath` signals external file
- Minimal: two optional fields vs separate interface requiring union types throughout codebase
- Structural compatibility: `relativePath` gets sentinel value `external/<id>` to satisfy existing field expectations
- Avoids proliferation: one IndexEntry interface instead of `IndexEntry | ExternalIndexEntry` union everywhere

**Alternatives Considered**:

### Option A: Separate ExternalIndexEntry Interface
- **Pros**: Clearer separation, no optional fields polluting base interface
- **Cons**: Requires union types `IndexEntry | ExternalIndexEntry` in search, list, filter functions. Complicates type guards throughout codebase. More complex than warranted for two fields.
- **Why not chosen**: Violates simplicity principle. Two optional fields is minimal extension with maximum compatibility.

### Option B: Store External Files in Separate Index (external-index.json)
- **Pros**: Complete isolation, no changes to IndexEntry
- **Cons**: Requires parallel index loading, merging results in search/list operations, duplicate index management logic, complicates scope handling
- **Why not chosen**: Over-engineering. External files participate in same operations (search, link, mermaid) as regular memories - should share index infrastructure.

### Option C: Use Metadata Field (meta: Record<string, unknown>)
- **Pros**: No new fields needed, leverages existing extensibility
- **Cons**: Loses type safety (meta is untyped), no compile-time validation, requires runtime checks, less discoverable in code
- **Why not chosen**: Type safety matters for core fields. externalPath is not optional metadata - it's a fundamental property determining file location.

---

## Decision 3: Embedding Pipeline Reuse

**Chosen**: Reuse existing `getEmbeddingForMemory()` from search/embedding.ts unchanged

**Rationale**:
- Content read from `externalPath` instead of constructed basePath location
- `truncateForEmbedding()` already handles large files (6000 char limit = ~1500 tokens)
- Content-hash based cache invalidation detects file changes automatically
- Graceful Ollama fallback already implemented
- No modifications needed to embedding.ts

**Alternatives Considered**:

### Option A: Separate Embedding Function for External Files
- **Pros**: Isolated logic for external file handling
- **Cons**: Code duplication, would need to replicate truncation, normalisation, cache management
- **Why not chosen**: Embedding generation is identical regardless of file location. Violates DRY principle.

### Option B: Skip Embeddings for External Files
- **Pros**: Simpler implementation, no Ollama dependency
- **Cons**: External files invisible to semantic search (primary feature requirement). Defeats purpose of indexing them.
- **Why not chosen**: Semantic search is core value proposition - "memory semantic 'no wrapper abstractions'" must return CLAUDE.md rule.

### Option C: Custom Truncation for CLAUDE.md Files
- **Pros**: Could preserve markdown structure (e.g., extract headings)
- **Cons**: Speculative complexity. Current truncation works at word boundaries. No evidence of issues with 6000 char limit.
- **Why not chosen**: YAGNI. Existing truncation is sufficient. Can revisit if user feedback indicates problems.

---

## Decision 4: Sync Integration Strategy

**Chosen**: Extend `syncMemories()` to call external file indexer as final pass AFTER existing reconciliation

**Rationale**:
- External files are additive - they don't invalidate existing user memories
- Keeps existing sync logic (orphan cleanup, ghost node removal) untouched
- Failed external discovery doesn't corrupt user data
- Clear separation: reconciliation phase → discovery phase
- Enables separate `memory index-context` command (external discovery only, skips reconciliation)

**Alternatives Considered**:

### Option A: Inline Discovery During File Scan
- **Pros**: Single traversal, potentially faster
- **Cons**: Mixes concerns (user memory reconciliation + external file discovery). Complicates error handling. If discovery fails, entire sync fails.
- **Why not chosen**: Violates single responsibility. Sync has complex state management - adding discovery increases cognitive load.

### Option B: Separate Background Process
- **Pros**: Doesn't block sync, could run continuously watching for file changes
- **Cons**: Massive over-engineering for a feature that runs on-demand. Requires process management, inotify integration, race condition handling.
- **Why not chosen**: Violates YAGNI. No requirement for real-time updates. User-triggered sync is sufficient.

### Option C: Hook into Write Operations
- **Pros**: Automatic re-indexing when memories created
- **Cons**: External files change independently of memory operations. Wouldn't detect CLAUDE.md edits. Unnecessary coupling.
- **Why not chosen**: Wrong trigger. External file changes are orthogonal to memory lifecycle.

---

## Decision 5: ID Generation Scheme

**Chosen**: Deterministic IDs using path components and stable markers

**Scheme**:
```
CLAUDE.md at project root          → rule-project-claude-md
CLAUDE.local.md at project root    → rule-local-claude-local-md
~/.claude/CLAUDE.md                → rule-global-claude-md
CLAUDE.md 2 dirs above cwd         → rule-ancestor-2-claude-md
.claude/rules/security.md          → rule-project-security
~/.claude/rules/tdd.md             → rule-global-tdd
.claude/agent-memory/curator/MEMORY.md      → reminder-project-curator-memory
.claude/agent-memory/curator/patterns.md    → reminder-project-curator-patterns
~/.claude/agent-memory/curator/MEMORY.md    → reminder-global-curator-memory
```

**Rationale**:
- Determinism: same file generates same ID across syncs
- Stability: ID doesn't change if file content changes
- Readability: human-parseable (reminder-project-curator-memory clearly indicates what it is)
- Uniqueness: path components (ancestor-N, project, global, agent name, filename) prevent collisions
- Canonical paths: symlinks resolved to prevent duplicate indexing

**Alternatives Considered**:

### Option A: Content Hash as ID
- **Pros**: Guaranteed uniqueness, detects duplicates
- **Cons**: ID changes when file content changes, breaks edges, requires edge migration, confuses users
- **Why not chosen**: Unstable IDs are user-hostile. Edges would break on every CLAUDE.md edit.

### Option B: UUID Generation
- **Pros**: Guaranteed uniqueness
- **Cons**: Non-deterministic - same file gets different ID on each sync, creates duplicate nodes, unreadable
- **Why not chosen**: Violates determinism requirement. Would create new node on every sync.

### Option C: Relative Path as ID
- **Pros**: Simple, deterministic
- **Cons**: Fragile - breaks if project moved, long IDs (.claude/agent-memory/curator/MEMORY.md), special char escaping needed
- **Why not chosen**: Not portable. IDs should be location-agnostic where possible.

---

## Decision 6: Vendor Directory Filtering

**Chosen**: Hardcoded exclusion list: `node_modules/`, `.git/`, `vendor/`, `dist/`, `build/`

**Rationale**:
- Prevents indexing third-party CLAUDE.md files in dependencies
- Avoids performance issues from scanning large directories
- Sensible defaults cover 95% of projects
- Simple implementation: path.includes() check

**Alternatives Considered**:

### Option A: Configurable Exclusion List
- **Pros**: User flexibility for non-standard project structures
- **Cons**: Configuration complexity, another file to manage, premature optimisation
- **Why not chosen**: YAGNI. No evidence of projects needing custom exclusions. Can add config later if needed.

### Option B: .gitignore Integration
- **Pros**: Reuses existing exclusion mechanism
- **Cons**: .gitignore syntax is complex (negation, wildcards). Not all ignored directories should be excluded (e.g., .env is gitignored but isn't a vendor directory). Tight coupling.
- **Why not chosen**: Semantic mismatch. Gitignore is about version control, not CLAUDE.md discovery.

### Option C: No Filtering
- **Pros**: Simplest implementation
- **Cons**: Would index node_modules/some-package/CLAUDE.md, causing confusion, performance issues, false positives in search
- **Why not chosen**: Poor user experience. Third-party CLAUDE.md files pollute results.

---

## Decision 7: Read-Only Enforcement

**Chosen**: Guard checks in every mutating command (cmdWrite, cmdDelete, cmdRename, cmdMove, cmdPromote)

**Implementation**:
```typescript
if (node.type === MemoryType.Rule || node.type === MemoryType.Reminder) {
  throw new Error(`'${id}' is a read-only external node. Run 'memory sync' to refresh it.`);
}
```

**Rationale**:
- Data safety: prevents accidental corruption of Claude CLI-owned files
- Clear error messages: guides user to correct action (run sync to update)
- Fail-fast: checks happen before file operations
- Consistent: same guard logic in all mutating operations

**Alternatives Considered**:

### Option A: File Permissions
- **Pros**: OS-level protection
- **Cons**: Doesn't prevent plugin from reading externalPath and modifying file. User could change permissions. Platform-specific. Doesn't provide actionable error message.
- **Why not chosen**: Wrong layer. Plugin should enforce semantics, not rely on filesystem permissions.

### Option B: Separate Command Namespace (memory-readonly)
- **Pros**: Physical separation
- **Cons**: Confusing UX (two separate command hierarchies). User doesn't know which commands apply to which nodes. Still needs guards internally.
- **Why not chosen**: Over-complicates interface. Better to have unified commands with runtime checks.

### Option C: Soft Warning Instead of Error
- **Pros**: Doesn't block operations
- **Cons**: Risk of accidental modification. Warning fatigue (users ignore warnings). Violates data safety principle.
- **Why not chosen**: Too risky. External files are critical Claude configuration - corruption is unacceptable.

---

## Open Questions (Resolved During Specification)

1. **`memory read <rule-id>`: show full content or metadata only?**
   **RESOLVED**: Full content. Rules and reminders ARE the content - metadata (tags, severity) is sparse or non-existent.

2. **`memory index-context --scope`: accept scope flag?**
   **RESOLVED**: Yes. Enables targeted refresh (e.g., `--scope project` for local CLAUDE.md changes without re-scanning global).

3. **Ancestor CLAUDE.md scoping: project or global?**
   **RESOLVED**: Above git root = global scope. Within git root = project scope. Aligns with scope semantics.

4. **`memory audit` / `memory quality`: exclude rule/reminder nodes?**
   **RESOLVED**: Yes, auto-exclude. Quality metrics (tag count, severity, link count) are meaningless for external files.

5. **Vendor exclusion list: configurable or hardcoded?**
   **RESOLVED**: Hardcoded sensible defaults. Can make configurable in future if user feedback warrants (YAGNI).

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Bun | Existing project runtime, fast TypeScript execution |
| Type System | TypeScript 5.3 | Type safety for new MemoryType/EdgeType values |
| Testing | Bun test + .spec.ts | Established pattern, TDD hooks enforce co-location |
| Embeddings | Ollama (optional) | Existing pipeline, graceful fallback if unavailable |
| Storage | JSON files | Existing format (graph.json, index.json, embeddings.json) |
| Discovery | Node fs module | Synchronous file operations for directory walking |
| Path Resolution | Node path module | Canonical path resolution for symlink handling |

---

## Performance Considerations

1. **Directory Tree Walking**: Linear in depth (cwd → home). Mitigated by vendor filtering and early termination.
2. **Symlink Resolution**: O(1) per path via fs.realpathSync(). Visited paths cached in Set to prevent loops.
3. **Embedding Generation**: Batched via existing pipeline. Content hash avoids regeneration if unchanged.
4. **Index Updates**: Atomic writes via writeFileAtomic(). No lock contention (single-process CLI).

---

## Security Considerations

1. **Path Traversal**: Canonical path resolution prevents escaping basePath boundaries
2. **Symlink Loops**: Visited path tracking prevents infinite recursion
3. **File Size Limits**: truncateForEmbedding() caps at 6000 chars to prevent OOM
4. **Read-Only Enforcement**: Guards prevent accidental modification of CLI configuration files

---

**Conclusion**: All technology decisions favour simplicity, reuse, and backward compatibility. No new external dependencies required. Implementation extends existing infrastructure with minimal modifications.
