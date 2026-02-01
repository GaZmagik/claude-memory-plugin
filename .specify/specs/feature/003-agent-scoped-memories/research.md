# Research: Agent-Scoped Memories

**Feature**: 003-agent-scoped-memories
**Conducted**: 2026-02-01
**Researcher**: Planner Agent

---

## Decision 1: Scope Enum Extension Strategy

**Chosen**: Extend existing `Scope` enum with `AgentProject` and `AgentGlobal` values

**Rationale**:
- Maintains consistency with existing 4-tier scope hierarchy
- Leverages all existing infrastructure (index, graph, frontmatter systems)
- Agent scopes are conceptually parallel to project/global scopes
- TypeScript enum extension is non-breaking (new values don't affect existing code)
- Existing scope resolution logic easily extended with agent parameter

**Alternatives Considered**:

### Option A: Separate agent scope system
**Description**: Create parallel `AgentScope` enum and separate resolution logic

**Pros**:
- Cleaner separation of concerns
- No risk of scope enum pollution
- Could use different hierarchy rules for agents

**Cons**:
- Massive code duplication (resolver, index, graph, all need agent-specific versions)
- Two separate memory systems to maintain
- Inconsistent user experience (different commands for agent operations)
- Violates DRY principle

**Why not chosen**: Complexity far outweighs benefits. The existing scope system is well-tested and handles exactly the use case we need (hierarchical storage with fallback). Creating a parallel system introduces maintenance burden and user confusion.

---

### Option B: Single `agent` scope with metadata
**Description**: Add single `agent` scope value, use frontmatter `agent` field to distinguish

**Pros**:
- Only one new enum value
- Simpler scope hierarchy

**Cons**:
- Cannot distinguish agent-project vs agent-global (breaks the "git-tracked knowledge" pattern)
- All agent memories would need to be global (not shareable with team)
- Path resolution becomes complex (need to inspect frontmatter to determine storage location)
- Index loading requires reading all files to determine agent (performance issue)

**Why not chosen**: Loses the valuable project/global distinction. Agent learnings about project-specific patterns should be git-tracked and shared with the team, whilst agent's personal cross-project knowledge should remain global.

---

## Decision 2: Agent Memory Storage Structure

**Chosen**: Mirror project scope structure under `.claude/memory/agents/{agent-name}/`

**Rationale**:
- Reuses all existing infrastructure without modification
- Each agent has its own index.json, graph.json, embeddings.json
- Directory structure self-documenting (clear what belongs to which agent)
- Allows agents to be easily archived or removed (delete directory)
- Git-friendly (can gitignore specific agents if needed)
- No risk of ID collisions between agents

**Storage Layout**:
```
.claude/memory/agents/
├── typescript-expert/
│   ├── permanent/
│   │   ├── learning-esm-imports.md
│   │   └── gotcha-type-only-imports.md
│   ├── temporary/ (optional)
│   ├── graph.json
│   ├── index.json
│   └── embeddings.json
└── rust-expert/
    ├── permanent/
    ├── graph.json
    └── index.json
```

**Alternatives Considered**:

### Option A: Flat structure with agent prefix
**Description**: All agent memories in `.claude/memory/permanent/` with filename prefix `agent-{name}-{id}.md`

**Pros**:
- Single index.json for all memories (faster cross-agent search)
- Single graph.json (easier cross-agent linking)
- Simpler directory structure

**Cons**:
- Agent memories mixed with project memories (clutter)
- Difficult to see which memories belong to which agent
- Cannot archive or remove an agent easily
- ID collisions possible (need complex prefixing scheme)
- No isolation (agent A can accidentally corrupt agent B's memories)
- Gitignore becomes complex (cannot ignore specific agents)

**Why not chosen**: Poor discoverability and maintainability. Mixing agent and project memories in the same directory makes it hard to understand what knowledge belongs where. The single-index "benefit" is actually a drawback (agent operations should be scoped, not global).

---

### Option B: Nested structure by type
**Description**: `.claude/memory/agents/{agent-name}/{type}/{id}.md`

**Pros**:
- Organised by memory type
- Easier to browse agent learnings vs gotchas

**Cons**:
- Index needs to scan multiple directories
- Inconsistent with existing project scope structure (breaks user expectations)
- More complex path resolution logic
- Unnecessary nesting (agents typically have <100 memories)

**Why not chosen**: Over-engineering. The existing `permanent/` directory with type-prefixed filenames is sufficient and familiar to users.

---

## Decision 3: Agent Name Sanitisation

**Chosen**: Lowercase alphanumeric and hyphens only, automatic sanitisation on input

**Rationale**:
- Filesystem-safe across all platforms (Windows, macOS, Linux)
- Consistent with existing memory ID slug generation
- Readable and user-friendly
- No escaping or encoding required
- Git-friendly (no special characters in paths)

**Sanitisation Algorithm**:
1. Convert to lowercase
2. Replace whitespace and underscores with hyphens
3. Remove non-alphanumeric characters except hyphens
4. Collapse multiple hyphens to single hyphen
5. Trim leading/trailing hyphens

**Examples**:
- `TypeScript Expert` → `typescript-expert`
- `API_Architect` → `api-architect`
- `Rust (Systems)` → `rust-systems`

**Alternatives Considered**:

### Option A: Allow any Unicode, use encoding
**Description**: Support full Unicode agent names, encode for filesystem

**Pros**:
- Support non-English agent names
- More expressive naming

**Cons**:
- Filesystem encoding complexity (different systems handle Unicode differently)
- Difficult to type in CLI
- Git diffs harder to read
- Potential encoding bugs

**Why not chosen**: English-centric CLI makes Unicode agent names impractical. Users can use full Unicode in memory titles, but agent identifiers should be simple ASCII slugs.

---

### Option B: Strict alphanumeric only (no hyphens)
**Description**: Only allow `[a-z0-9]+`, no separators

**Pros**:
- Maximum filesystem compatibility
- Simplest validation

**Cons**:
- Difficult to read multi-word agent names (`typescriptexpert` vs `typescript-expert`)
- Inconsistent with existing memory ID format

**Why not chosen**: Hyphens significantly improve readability with zero downside (all filesystems support hyphens in filenames).

---

## Decision 4: Cross-Scope Link Storage Strategy

**Chosen**: Bidirectional storage with scope metadata in both source and target graphs

**Rationale**:
- Enables proper cleanup when memories are deleted (no orphaned reverse edges)
- Impact analysis can traverse from either direction
- Each scope's graph is self-contained and queryable
- Scope metadata enables visual distinction in Mermaid diagrams
- Orphan detection works correctly across scopes

**Edge Format**:
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

**Alternatives Considered**:

### Option A: Store links only in source scope
**Description**: Cross-scope links stored only in the graph where they originate

**Pros**:
- Simpler write operation (only one graph updated)
- No risk of bidirectional sync issues
- Smaller graph files

**Cons**:
- Cannot find inbound links from other scopes without scanning ALL graphs
- Orphan detection requires loading all graphs
- Impact analysis must scan all scopes
- Deleting a memory requires scanning all graphs to find orphaned links
- `memory edges` must scan all scopes even for simple queries

**Why not chosen**: Performance and correctness. The "simpler write" is a false economy - every read operation becomes O(n) in number of scopes. Deleting a memory becomes dangerously complex (miss a graph, leave orphaned links).

---

### Option B: Global link registry
**Description**: Single `.claude/memory/cross-scope-links.json` file

**Pros**:
- Centralized link management
- Fast cross-scope link queries
- Single source of truth

**Cons**:
- Another file to manage and keep in sync
- Merge conflicts likely (high-traffic file)
- Race conditions on concurrent link operations
- Inconsistent with existing architecture (graphs are already decentralized)
- What scope should it be stored in? (project? global? creates dependency issues)

**Why not chosen**: Centralization creates more problems than it solves. Merge conflicts on a global link file would be frequent and painful. The bidirectional approach distributes the data where it logically belongs (with each scope).

---

### Option C: Scope metadata optional
**Description**: Add scope metadata only when needed, infer otherwise

**Pros**:
- Smaller graph files for same-scope links
- Backward compatible (existing edges have no metadata)

**Cons**:
- Ambiguity when edge crosses scopes (is lack of metadata intentional or data corruption?)
- Cannot distinguish "same-scope" from "metadata not migrated"
- Validation becomes complex (need to check if target exists in same scope to infer)

**Why not chosen**: The "Chosen" solution already handles this! Same-scope edges don't need metadata (it's optional). We only add metadata for cross-scope edges. This gives us the benefits of Option C whilst maintaining clarity.

---

## Decision 5: Default Scope for Agent Operations

**Chosen**: Agent-project when in git repository, agent-global otherwise

**Rationale**:
- Mirrors existing project/global default behaviour (users already understand this pattern)
- Git-tracked agent knowledge is valuable for team collaboration
- Agent learnings about project-specific patterns should be shared
- Cross-project agent knowledge (global) remains personal and portable
- Consistent with SDD principles (knowledge as code, version controlled)

**Behaviour**:
```bash
# In git repository
memory write "TypeScript pattern" --agent typescript-expert
# → Stored in .claude/memory/agents/typescript-expert/ (git-tracked)

# Outside git repository
memory write "General pattern" --agent typescript-expert
# → Stored in ~/.claude/memory/agents/typescript-expert/ (personal)
```

**Alternatives Considered**:

### Option A: Always agent-global
**Description**: Agent memories always stored in `~/.claude/memory/agents/` regardless of git context

**Pros**:
- Agent knowledge is portable across projects
- No git merge conflicts on agent memories
- Personal agent expertise remains private

**Cons**:
- Team cannot benefit from agent learnings
- Agent knowledge about project-specific patterns lost when switching machines
- Inconsistent with existing scope defaults
- No way to share agent expertise without manual export

**Why not chosen**: Defeats the purpose of git-tracked project knowledge. If an agent learns a valuable pattern specific to the project, the team should benefit. Users can always explicitly use `--scope global` if they want personal-only agent knowledge.

---

### Option B: Configurable default per project
**Description**: Add `agentMemoryDefault` to config.json

**Pros**:
- Project-level control over agent memory storage
- Can disable git-tracked agent memories if desired

**Cons**:
- More configuration complexity
- Non-obvious behaviour (need to check config to understand where memories are stored)
- YAGNI - no evidence users need this flexibility

**Why not chosen**: Premature configuration. The git-context-based default is sensible and mirrors existing behaviour. If users need project-level control, they can gitignore `.claude/memory/agents/` or use `--scope global` explicitly.

---

## Decision 6: Agent Identity Detection (Context Injection)

**Chosen**: Defer auto-detection to future feature, use `--agent` flag only for v1.3.0

**Rationale**:
- Agent identification infrastructure doesn't exist yet in Claude Code
- Manual `--agent` flag solves the core use case (agent memory CRUD)
- Auto-injection is valuable but not blocking (agents can manually query their memories)
- Simpler v1.3.0 implementation (no hook modifications required)
- Allows time to design agent identity system properly

**Options for Future Implementation**:

### Option A: Environment variable
**Description**: Agent sets `CLAUDE_AGENT_NAME=typescript-expert` before invocation

**Pros**:
- Simple to implement
- No Claude Code core changes required
- Agent frameworks can set this easily

**Cons**:
- Environment pollution
- Must be set correctly by caller (error-prone)
- No verification that correct agent is running

**Evaluation**: Viable for MVP but not robust long-term.

---

### Option B: Hook metadata
**Description**: Claude Code passes agent identity in hook invocation metadata

**Pros**:
- Trustworthy (set by Claude Code, not user)
- Available in all hooks
- No environment pollution

**Cons**:
- Requires Claude Code core changes
- Hook metadata format not yet defined
- Backward compatibility concerns

**Evaluation**: Best long-term solution but requires coordination with Claude Code team.

---

### Option C: Agent invocation marker
**Description**: Agent includes special comment in prompts: `<!-- agent:typescript-expert -->`

**Pros**:
- No environment variables
- No core changes required
- Self-documenting in prompt

**Cons**:
- Fragile (what if user removes comment?)
- Prompt parsing complexity
- Not available in all hooks (only UserPromptSubmit)

**Evaluation**: Clever but too fragile for production use.

---

**Recommendation for v1.3.0**: Document all three options in implementation plan as extension points. Proceed with `--agent` flag only. Revisit auto-detection in v1.4.0 after agent infrastructure matures.

---

## Open Questions (Resolved)

### Q1: Should agent names be namespaced by category?

**Example**: `lang:typescript-expert`, `domain:api-architect`

**Resolution**: No. Freeform agent names with sanitisation is sufficient. Users can adopt their own conventions (prefix with `lang-`, `domain-`, etc.) without enforced structure. YAGNI - add namespacing only if collision problems emerge.

---

### Q2: Should project members see agent memories by default?

**Resolution**: No. Agent memories hidden unless `--agent` specified (opt-in). Rationale:
- Avoids clutter in `memory list`
- Clear mental model (agent scope is separate)
- `--include-shared` flag allows agents to see project memories, not the reverse
- Explicit `memory agents` command shows all agents

---

### Q3: Should agents be able to link to other agents' memories?

**Resolution**: Yes, enabled by default. Rationale:
- Cross-agent collaboration is valuable (typescript-expert can reference rust-expert)
- Uses same cross-scope linking mechanism as agent→project links
- No technical complexity to disable it
- If isolation needed, users can manually avoid linking

---

### Q4: What happens when an agent memory and project memory have the same ID?

**Resolution**: IDs are scoped to their storage location. Same ID in different scopes is allowed and expected (e.g., `learning-api-patterns` can exist in both project scope and agent scope). References use full scope path when ambiguous:
- `learning-api-patterns` (in current scope)
- `project:learning-api-patterns` (explicit)
- `agent:typescript-expert:learning-api-patterns` (explicit)

---

## Technical Constraints

### Constraint 1: Backward Compatibility

**Requirement**: All existing memory operations must work unchanged without `--agent` flag

**Impact on Design**:
- Agent scopes are additive, not replacing existing scopes
- Scope resolution without agent context unchanged
- Graph and index schemas backward compatible
- Existing memory files readable without migration

**Validation**: Comprehensive backward compatibility test suite covering all commands without `--agent` flag.

---

### Constraint 2: TDD Workflow

**Requirement**: All tests written before implementation (Red-Green-Refactor)

**Impact on Design**:
- Data model defined upfront (enables test writing)
- API contracts specified before implementation
- Test data fixtures for agent-scoped memories
- Mock agent contexts for unit tests

**Validation**: Code review enforces test-first discipline. No implementation PR merged without corresponding tests written first.

---

### Constraint 3: Git Workflow Compatibility

**Requirement**: Agent memories in `.claude/memory/agents/` must work with git

**Impact on Design**:
- Agent directory structure mirrors project structure (familiar to git users)
- Each agent is independently .gitignore-able
- Graph files are text JSON (diff-friendly)
- Merge conflicts handled same as project scope

**Validation**: Integration tests with real git operations (commit, merge, conflict resolution).

---

## Performance Analysis

### Index Loading

**Current**: Single index.json per scope, O(1) lookup by ID

**With Agents**: One index.json per agent, O(1) lookup within agent scope

**Impact**: Minimal. Agent operations load only agent index, not all indexes.

**Worst Case**: `memory search "pattern" --all-agents` loads N agent indexes. Mitigated by:
- Most operations scoped to single agent
- Index files cached during operation
- Agent count typically <10 (reasonable to load all)

---

### Graph Traversal

**Current**: Single graph per scope, O(E) edge traversal where E = edges in scope

**With Agents**: Cross-scope traversal requires loading multiple graphs

**Impact**: Moderate for cross-scope operations (impact analysis, Mermaid with --include-shared)

**Mitigation**:
- Cache loaded graphs during single operation
- Lazy load (only load graphs when cross-scope edge encountered)
- Most operations are same-scope (fast path)

---

### Search Performance

**Current**: Semantic search loads single embeddings.json

**With Agents**: Agent-scoped search loads agent's embeddings.json

**Impact**: Positive! Agent embeddings.json is smaller than project embeddings.json (fewer memories to search).

**Worst Case**: `--all-agents` semantic search loads N embedding files. Acceptable for N<20.

---

## Security Considerations

### Agent Name Injection

**Risk**: Malicious agent name like `../../etc/passwd` could escape memory directory

**Mitigation**: Strict sanitisation removes all special characters except hyphens. Path traversal impossible with `[a-z0-9-]+` character set.

---

### Cross-Scope Link Manipulation

**Risk**: Corrupted graph.json could create links to non-existent memories

**Mitigation**: Link creation validates both source and target exist. Health checks detect orphaned cross-scope links.

---

### Agent Impersonation

**Risk**: User writes to agent scope they don't own

**Mitigation**: Out of scope for v1.3.0. No authentication/authorization for agent memories (same as project memories - any user can write). Add access control in future version if needed.

---

## Research Conclusion

All technical decisions documented with rationale and alternatives. Implementation can proceed with confidence that:

1. Architecture is sound (extends existing system cleanly)
2. Backward compatibility maintained
3. Performance acceptable
4. Security considerations addressed
5. Future extensibility preserved (agent identity detection deferred but planned)

**Ready for Phase 1: Design**

---

**Research Completed**: 2026-02-01
**Next Phase**: Data Model and Contract Generation
