# Speckit Explorer Agent Memory

## Sessions

### 2026-02-18: Context-File Graph Nodes

**Exploration file**: `.specify/specs/explore/context-file-graph-nodes.md`
**Decision memory**: `decision-context-file-graph-nodes-key-decisions`

**Key decisions**:

- New `MemoryType.ContextFile = 'context-file'` — NOT hub. Write guards key on this type.
- Two new optional `IndexEntry` fields: `contextFileKind` and `externalPath`.
- New `skills/memory/src/context/` module (discovery, indexer, types). Do NOT touch link.ts.
- `link.ts` is now at **507 lines** (warning 500, hard limit 1000) — confirmed still critical.
- Scope mapping: `~/.claude/CLAUDE.md` → global; `{git-root}/.claude/CLAUDE.md` → project;
  `~/.claude/agents/*.md` → global; `{git-root}/.claude/agents/*.md` → project;
  `.claude/memory/agents/{name}/MEMORY.md` → agent-project/agent-global (NOT a plugin memory).
- `.claude/memory/agents/{name}/MEMORY.md` lives at agent dir root, NOT in `permanent/` —
  currently safe from accidental scan; must be indexed explicitly as `agent-memory-summary`.
- `loadMergedGraph()` picks up context nodes for free since they are stored in scope graph.json.
- New `EdgeType.GovernedBy = 'governed-by'` (memory → context-file direction).
- New `EdgeType.Documents = 'documents'` — currently only in mermaid abbreviations, not enum.
- `memory index-context` new command for targeted on-demand re-indexing.
- 5-phase implementation: types → discovery/indexer → sync integration → mermaid/guards → CLI.

### 2026-02-17: v1.5.0 Memory Graph Enhancement Suite

**Exploration file**: `.specify/specs/explore/v1.5.0-memory-graph-enhancements.md`

**Key patterns identified in this project**:

- `GraphEdge` optional-field pattern in `structure.ts` — adding optional fields is the right
  way to extend edges; no separate metadata store needed at this scale.
- `loadMergedGraph()` in `structure.ts` is the canonical multi-scope graph loader — always
  reuse it for cross-scope analysis commands.
- `getInboundEdges` / `getOutboundEdges` in `edges.ts` — available for connectivity scoring.
- `link.ts` was at 503 lines when explored (warning 500, hard limit 1000). New edge-writing
  logic must go into a new `link-update.ts` file, not into `link.ts`.
- Ollama client lives in `hooks/src/services/ollama.ts` — NOT importable from `skills/memory/`
  (different runtime boundary). Any memory-skill feature needing Ollama must create its own
  thin `skills/memory/src/services/ollama.ts`.
- Bun test runner in use — use `mock.module()` not `vi.mock()`.
- `check-relevance` CLI handler belongs in `utility.ts`; implementation in `maintenance/`.
- `suggest-links --auto-link` is READ-ONLY for cross-scope edges — this is a hard constraint.

**verifiedRelation lifecycle** (approved design):
  stage (`verifiedRelation` field on edge) → `update-edge --apply` → clean promotion
  (replace `label`, remove `verifiedRelation`, final: `{ label: "...", similarity: 0.91 }`).

**Recommended implementation order**:
  Feature 2 (similarity on edges) → Feature 4 (update-edge + link.ts refactor)
  → Feature 1 (check-relevance) → Feature 3 (LLM verification)
