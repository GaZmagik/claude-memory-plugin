# Exploration: Context-File Graph Nodes

**Created**: 2026-02-18
**Updated**: 2026-02-18 (corrections applied after user review)
**Explorer**: speckit-explorer agent + manual corrections
**Status**: Ready for Specification

---

## Feature Intent

The memory plugin currently indexes only files it creates and owns — memories in
`permanent/` and `temporary/` directories. However, the Claude CLI ecosystem contains
two additional categories of knowledge files that agents read directly:

1. **Rule files** — `CLAUDE.md`, `CLAUDE.local.md`, and `rules/*.md` files at any level
   of the directory tree and in `~/.claude/`. These are prescriptive: they tell Claude
   *how* to behave.

2. **Reminder files** — `MEMORY.md` and sub-files in agent-memory directories
   (`.claude/agent-memory/{name}/`, `.claude/agent-memory-local/{name}/`,
   `~/.claude/agent-memory/{name}/`). These are descriptive: they record *what* an
   agent carries between sessions. They are injected into agent system prompts by the
   Claude CLI at session start.

Both categories influence agent behaviour at least as much as stored memories, yet they
are invisible to the knowledge graph.

The goal is to make these external files first-class graph nodes so that:
- Semantic search can surface a CLAUDE.md rule alongside a related gotcha
- Edges can be drawn from a decision memory to the rule that motivated it
- `suggest-links` can discover that a gotcha and a CLAUDE.md rule are semantically linked
- Mermaid diagrams can show the full picture of what an agent knows and is governed by

All of this must be done non-destructively: the plugin indexes these files and generates
embeddings for them, but never writes to them.

---

## Suggested Specify Prompt

Use this as the argument for `/speckit:specify`:

```
Add support for indexing two categories of external Claude CLI files as read-only graph
nodes in the memory knowledge graph, using two new MemoryType values:

TYPE 1 — `rule`:
  Files that prescribe how Claude must behave. Discovered by scanning:
  - CLAUDE.md and CLAUDE.local.md in the current working directory and every ancestor
    directory up to and including the user's home directory (the Claude CLI walks up the
    tree at session start — discovery must replicate this behaviour)
  - ~/.claude/CLAUDE.md and ~/.claude/CLAUDE.local.md
  - .claude/rules/*.md (project scope)
  - ~/.claude/rules/*.md (global scope)

TYPE 2 — `reminder`:
  Files that describe what an agent carries between sessions. Discovered by scanning:
  - .claude/agent-memory/{name}/MEMORY.md and sub-files → agent-project scope, agent={name}
  - .claude/agent-memory-local/{name}/MEMORY.md and sub-files → local scope, agent={name}
  - ~/.claude/agent-memory/{name}/MEMORY.md and sub-files → agent-global scope, agent={name}

Both types must:
  - Appear in the graph as read-only nodes with the appropriate type
  - Receive embeddings via the existing Ollama pipeline (graceful fallback)
  - Be discoverable by `memory sync` and `memory rebuild`
  - Be targetable by a new `memory index-context` command for cheap on-demand re-indexing
  - Be searchable via `memory search` and `memory semantic`
  - Be linkable via `memory link` and `memory unlink`
  - Appear distinctly in `memory mermaid` and `memory graph` (distinct shape/colour per type)
  - Be suggested as candidates in `memory suggest-links`
  - Never be created, modified, or deleted by any plugin command

New edge label:
  - `governed-by`: a memory is governed by a rule (direction: memory → rule)
  - `reminded-by`: a memory is contextualised by a reminder (direction: memory → reminder)

Scope mapping:
  - CLAUDE.md / rules/ at project path → project scope
  - CLAUDE.local.md / rules/ at project path → local scope (gitignored)
  - CLAUDE.md / rules/ at ~/.claude/ → global scope
  - agent-memory/{name}/* → agent-project scope, agent={name}
  - agent-memory-local/{name}/* → local scope, agent={name}
  - ~/.claude/agent-memory/{name}/* → agent-global scope, agent={name}

Success criteria:
  - `memory sync` discovers and indexes all rule and reminder files in known paths
  - `memory semantic "no wrapper abstractions"` returns the relevant CLAUDE.md rule node
  - `memory mermaid` renders rule and reminder nodes with distinct shapes/colours
  - `memory link <memory-id> <rule-id> governed-by` works correctly
  - Rule and reminder nodes are never written to, renamed, or deleted by any plugin command
  - `memory suggest-links` includes rule and reminder nodes as candidates
  - CLAUDE.md discovery walks up the directory tree correctly (not just project root)
```

---

## Suggested Plan Prompt

Use this as the argument for `/speckit:plan`:

```
Implement rule and reminder graph nodes using two new MemoryType enum values.
Do NOT reuse `hub` — these types have distinct read-only semantics and separate
sync lifecycles. See research notes for rationale.

NEW MODULE: `skills/memory/src/external/`
  - external-file-discovery.ts: scan known paths, return ExternalFileEntry[]
  - external-file-indexer.ts: upsert entries into graph.json, index.json, embeddings.json
  - external-file-types.ts: ExternalFileEntry interface, ExternalFileKind enum
      Kinds for `rule`:     'claude-instructions' | 'claude-local-instructions' | 'rules-file'
      Kinds for `reminder`: 'agent-memory-summary' | 'agent-memory-sub-file'

TYPE SYSTEM CHANGES (minimal):
  - Add MemoryType.Rule = 'rule' and MemoryType.Reminder = 'reminder' to enums.ts
  - Add parseMemoryType cases for both in cli/helpers.ts
  - Add NODE_SHAPES and NODE_STYLES entries for both in graph/mermaid.ts
      rule: hexagon shape {{ }} — formal/authoritative
      reminder: cylinder shape [(  )] — stored/persistent knowledge
  - Add EdgeType.GovernedBy = 'governed-by' and EdgeType.RemindedBy = 'reminded-by' to enums.ts

INDEXENTRY EXTENSION (two optional fields added to existing interface):
  - externalFileKind?: ExternalFileKind — which sub-kind of rule/reminder
  - externalPath?: string — absolute path to the source file (lives outside basePath)
  The existing `relativePath` field holds a sentinel like `external/<id>` for
  structural compatibility. `externalPath` is authoritative for file reads.

DISCOVERY LOGIC in external-file-discovery.ts:
  Rule discovery:
    1. Walk up from cwd toward home, collecting CLAUDE.md and CLAUDE.local.md at each level
    2. Scan ~/.claude/CLAUDE.md, ~/.claude/CLAUDE.local.md
    3. Scan .claude/rules/*.md (project) and ~/.claude/rules/*.md (global)
  Reminder discovery:
    5. Enumerate .claude/agent-memory/*/  → MEMORY.md + sub-files (agent-project scope)
    6. Enumerate .claude/agent-memory-local/*/ → MEMORY.md + sub-files (local scope)
    7. Enumerate ~/.claude/agent-memory/*/ → MEMORY.md + sub-files (agent-global scope)

EMBEDDING PIPELINE: reuse getEmbeddingForMemory() from search/embedding.ts unchanged.
  Content is read from externalPath. Truncation via truncateForEmbedding() (6000 chars)
  handles large CLAUDE.md files. Content-hash cache invalidation handles file changes.

SYNC STRATEGY: extend syncMemories() in maintenance/sync.ts to call
  external-file-indexer.ts as a final pass after existing reconciliation.
  Add `memory index-context` CLI command for on-demand re-indexing without full sync.

SCOPE MAPPING for storage:
  Rule files at project paths → stored in project scope graph.json/index.json
  Rule files with CLAUDE.local.md → stored in local scope graph.json/index.json
  Rule files at ~/.claude/ → stored in global scope graph.json/index.json
  Reminder files for agent-memory/{name}/ → stored in agent-project scope for agent {name}
  Reminder files for agent-memory-local/{name}/ → stored in local scope for agent {name}
  Reminder files for ~/.claude/agent-memory/{name}/ → stored in agent-global scope

READ-ONLY GUARDS: add to cmdWrite, cmdDelete, cmdRename, cmdMove, cmdPromote:
  if (node.type === MemoryType.Rule || node.type === MemoryType.Reminder) {
    error("'<id>' is a read-only external node. Run 'memory sync' to refresh it.")
  }

ID SCHEME (deterministic, stable across syncs):
  CLAUDE.md at project root → 'rule-project-claude-md'
  CLAUDE.local.md at project root → 'rule-local-claude-md'
  ~/.claude/CLAUDE.md → 'rule-global-claude-md'
  CLAUDE.md two dirs up from cwd → 'rule-ancestor-2-claude-md'
  .claude/rules/security.md → 'rule-project-security'
  ~/.claude/rules/tdd.md → 'rule-global-tdd'
  .claude/agent-memory/curator/MEMORY.md → 'reminder-project-curator-memory'
  .claude/agent-memory/curator/patterns.md → 'reminder-project-curator-patterns'
  ~/.claude/agent-memory/curator/MEMORY.md → 'reminder-global-curator-memory'

CONSTITUTION ALIGNMENT:
  - P5 (Simplicity): reuse IndexEntry, embedding pipeline, link infrastructure unchanged
  - P2 (TDD): all new modules in external/ must have .spec.ts counterparts
  - link.ts is at 507 lines — do NOT add to it; any helpers go in external-file-indexer.ts
```

---

## Research Notes

### Type Decision: `rule` + `reminder` (not `hub`, not `context-file`)

**Confirmed by user**: two types with clean semantic boundaries.

| Type | Files | Nature | Writable? |
|---|---|---|---|
| `rule` | CLAUDE.md, CLAUDE.local.md, rules/*.md | Prescriptive — governs behaviour | Never |
| `reminder` | agent-memory/{name}/MEMORY.md + sub-files | Descriptive — agent session state | Never |

**Why not `hub`**: Hub is user-writable, lives inside basePath, and means "a memory that
links other memories." Neither `rule` nor `reminder` is that. Overloading `hub` would
corrupt the type system.

**Why not `context-file`**: Too generic. It obscures the meaningful semantic distinction
between prescriptive rules and descriptive reminders. Two types with honest names are
better than one umbrella.

---

### Corrected Path Model

**Paths confirmed against actual filesystem** (surveyed 2026-02-18):

```
Agent memory (project):        .claude/agent-memory/{name}/MEMORY.md
                                .claude/agent-memory/{name}/*.md (sub-files)
Agent memory (local):          .claude/agent-memory-local/{name}/MEMORY.md
                                .claude/agent-memory-local/{name}/*.md
Agent memory (global):         ~/.claude/agent-memory/{name}/MEMORY.md
                                ~/.claude/agent-memory/{name}/*.md

Rules (project):               .claude/rules/*.md
Rules (global):                ~/.claude/rules/*.md

CLAUDE instructions (project): .claude/CLAUDE.md, CLAUDE.md (at cwd and ancestors)
CLAUDE instructions (local):   .claude/CLAUDE.local.md, CLAUDE.local.md (at cwd and ancestors)
CLAUDE instructions (global):  ~/.claude/CLAUDE.md, ~/.claude/CLAUDE.local.md
```

**IMPORTANT — CLAUDE.md discovery algorithm** (replicating Claude CLI behaviour):
```
current_dir = cwd
while current_dir != home_dir.parent:
    if exists(current_dir / "CLAUDE.md"): collect it → project/local scope
    if exists(current_dir / "CLAUDE.local.md"): collect it → local scope
    if exists(current_dir / ".claude/CLAUDE.md"): collect it → project scope
    if exists(current_dir / ".claude/CLAUDE.local.md"): collect it → local scope
    current_dir = current_dir.parent
collect ~/.claude/CLAUDE.md → global scope
collect ~/.claude/CLAUDE.local.md → global scope (local treatment)
```

Note: CLAUDE.md files in `node_modules/` or other vendor directories must be excluded.
A simple heuristic: skip any path containing `node_modules`, `.git` (as a file), or
other standard vendor directories.

---

### Scope Mapping (corrected)

| File | Scope | Stored in basePath |
|---|---|---|
| `~/.claude/CLAUDE.md` | global | `~/.claude/memory/` |
| `~/.claude/CLAUDE.local.md` | global | `~/.claude/memory/` |
| `{any-dir}/CLAUDE.md` (non-vendor) | project | `{git-root}/.claude/memory/` |
| `{any-dir}/CLAUDE.local.md` | local | `{git-root}/.claude/memory/` |
| `~/.claude/rules/*.md` | global | `~/.claude/memory/` |
| `{git-root}/.claude/rules/*.md` | project | `{git-root}/.claude/memory/` |
| `.claude/agent-memory/{n}/*` | agent-project (agent={n}) | `{git-root}/.claude/memory/agents/{n}/` |
| `.claude/agent-memory-local/{n}/*` | local + agent={n} | `{git-root}/.claude/memory/` (stored in project graph.json with agent metadata field) |
| `~/.claude/agent-memory/{n}/*` | agent-global (agent={n}) | `~/.claude/memory/agents/{n}/` |

---

### Commands Requiring Changes

| Command | Change |
|---|---|
| `memory sync` | Add external-file discovery + indexer pass after existing reconciliation |
| `memory rebuild` | Same as sync |
| `memory write` | Read-only guard: reject type rule/reminder |
| `memory delete` | Read-only guard |
| `memory rename` | Read-only guard |
| `memory move` | Read-only guard |
| `memory promote` | Read-only guard |
| `memory search` | No change — nodes appear in index.json |
| `memory semantic` | No change — embeddings in embeddings.json |
| `memory suggest-links` | No change — embeddings participate automatically |
| `memory mermaid` | Add NODE_SHAPES + NODE_STYLES for rule and reminder types |
| `memory graph` | No change — returns raw graph.json |
| `memory link` / `unlink` | No change — valid targets like any node |
| `memory list` | Add 'rule' and 'reminder' to type filter parsing |
| `memory read` | Read from externalPath when type is rule/reminder |
| `memory stats` | Will include rule/reminder in type counts automatically |
| `memory health` | No change |
| **New** `memory index-context` | Targeted re-indexing of external files only |

---

### Open Questions (for specification phase)

1. **`memory read <rule-id>`**: show full external file content, or metadata only?
   Recommendation: full content (these files are the primary value; metadata is sparse).

2. **`memory index-context --scope`**: should it accept a scope flag, or always re-index all?
   Recommendation: accept `--scope` to allow cheap targeted refreshes.

3. **Ancestor CLAUDE.md scoping**: CLAUDE.md files found above the git root (in parent
   directories) — are they project or global scope? Recommendation: treat as global if
   above git root, project if within git root.

4. **`memory audit` / `memory quality`**: should rule/reminder nodes be excluded from
   quality scoring? Their metadata (tag count, severity, etc.) is meaningless for
   externally-owned files. Recommendation: auto-exclude.

5. **Vendor directory exclusion**: should the exclusion list be configurable, or hardcoded?
   Recommendation: hardcoded sensible defaults (node_modules, .git, vendor, dist, build).

---

## Next Steps

1. Run `/speckit:specify` with the suggested specify prompt
2. Run `/speckit:plan` with the suggested plan prompt
4. Implementation phases:
   a. Phase 1: Type system (MemoryType.Rule, MemoryType.Reminder, IndexEntry extensions, EdgeType additions)
   b. Phase 2: `external/` module — discovery + indexer with full TDD
   c. Phase 3: sync/rebuild integration + read-only guards
   d. Phase 4: mermaid rendering
   e. Phase 5: `index-context` command + CLI wiring
