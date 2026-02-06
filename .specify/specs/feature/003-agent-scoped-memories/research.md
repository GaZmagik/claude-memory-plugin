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

## Agent Identity Detection Options (T127)

**Context**: FR-035 requires the system to inject agent-scoped gotchas "when agent is identified in current context". This section documents the available mechanisms for detecting which agent is active, their trade-offs, and the recommended implementation path.

**Current State (v1.3.0)**: Agent identity is provided exclusively via the `--agent <name>` CLI flag. No automatic detection exists.

### Option A: Environment Variable (`CLAUDE_AGENT_NAME`)

**Mechanism**: The agent framework or plugin sets an environment variable before invoking memory commands.

```bash
# Set by agent framework before invocation
export CLAUDE_AGENT_NAME="typescript-expert"

# Memory hooks detect this automatically
memory write "Pattern observed" --type learning
# → Automatically scoped to typescript-expert agent
```

**Propagation Path**:
1. Agent framework sets `CLAUDE_AGENT_NAME` in process environment
2. Hook reads `process.env.CLAUDE_AGENT_NAME` during `parseHookInput()`
3. If present, hook resolves agent scope path via `resolveAgentScopePath()`
4. Memory operations target agent scope without explicit `--agent` flag

**Pros**:
- Zero changes to Claude Code core
- Agent frameworks can set this trivially
- Works across all hook events (PreToolUse, PostToolUse, SessionStart, etc.)
- Environment inheritance means child processes also receive the value

**Cons**:
- Environment pollution (persists after agent session ends unless explicitly unset)
- User-settable (not trustworthy for access control — any user can set `CLAUDE_AGENT_NAME`)
- No verification that the named agent actually exists
- Conflicts possible if multiple agents share a process tree

**Security Considerations**:
- Path traversal: Agent name from env var MUST pass through `sanitiseAgentName()` before use in file paths. See `gotcha-path-traversal-validation-required-for-user-supplied-agentstyle-names`.
- Impersonation: Not mitigated — env vars are user-controllable. Acceptable for v1.3.0 (no access control on agent memories).

**Implementation Complexity**: Low (~20 lines in hook input parsing)

**Verdict**: Viable for MVP. Best short-term option requiring no external coordination.

---

### Option B: Hook Metadata from Claude Code

**Mechanism**: Claude Code includes agent identity in the JSON payload sent to hooks via stdin.

```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "session_id": "abc-123",
  "agent_context": {
    "agent_name": "typescript-expert",
    "agent_type": "claude-memory-plugin:recall",
    "parent_session_id": "def-456"
  }
}
```

**Propagation Path**:
1. Claude Code resolves agent identity from its internal state (Task tool invocation, agent config)
2. Claude Code includes `agent_context` field in hook stdin JSON
3. Hook reads `hookInput.agent_context.agent_name` during processing
4. Memory operations target agent scope automatically

**Pros**:
- Trustworthy source (set by Claude Code runtime, not user)
- Available in all hook events without extra configuration
- No environment pollution
- Could include rich metadata (agent type, parent session, permissions)
- Backward compatible (old hooks ignore unknown fields)

**Cons**:
- Requires Claude Code core changes (new field in hook stdin schema)
- Timeline dependent on Claude Code release cycle
- Hook metadata schema not yet formally versioned
- Backward compatibility testing needed across all hook events

**Security Considerations**:
- Trustworthy by default (Claude Code controls the stdin payload)
- Agent name still needs sanitisation for filesystem operations
- Could support future access control (Claude Code verifies agent has permission)

**Implementation Complexity**: Medium (requires Claude Code PR + hook parsing update)

**Verdict**: Best long-term solution. Requires coordination with Claude Code team. Target for v1.4.0+.

---

### Option C: Agent Invocation Marker in Prompts

**Mechanism**: Agent includes a special marker comment in its system prompt or tool invocations that hooks can detect.

```markdown
<!-- agent:typescript-expert -->
Please write a memory about TypeScript ESM imports...
```

**Propagation Path**:
1. Agent's system prompt includes `<!-- agent:{name} -->` marker
2. `UserPromptSubmit` hook receives prompt text via `hookInput.prompt`
3. Hook parses marker using regex: `/<!-- agent:([a-z0-9-]+) -->/`
4. Extracted agent name cached in session state for subsequent hook events

**Pros**:
- No environment variables needed
- No Claude Code core changes needed
- Self-documenting in prompt (visible in transcripts)
- Agent plugin can embed this in agent system prompts automatically

**Cons**:
- Only available in `UserPromptSubmit` hook event (not PreToolUse, PostToolUse, etc.)
- Requires session-level caching to propagate to other hook events
- Fragile: user could edit prompt and remove marker
- Prompt parsing adds latency to every UserPromptSubmit event
- Multiple markers in a single prompt could cause ambiguity

**Security Considerations**:
- User-modifiable (same trust level as Option A)
- Marker format must be strictly validated to prevent injection
- Session cache poisoning possible if marker is spoofed

**Implementation Complexity**: Medium (marker parsing + session cache infrastructure)

**Verdict**: Clever but fragile. Not recommended as primary mechanism. Could serve as fallback.

---

### Option D: Plugin Configuration (`plugin.json` agent mapping)

**Mechanism**: Plugin configuration maps agent types to agent names, resolved at hook initialisation.

```json
{
  "name": "claude-memory-plugin",
  "agents": {
    "claude-memory-plugin:recall": {
      "memory_agent": "memory-recall-agent"
    },
    "claude-memory-plugin:curator": {
      "memory_agent": "memory-curator-agent"
    }
  }
}
```

**Propagation Path**:
1. Plugin `plugin.json` defines agent type → memory agent name mapping
2. Hook reads `CLAUDE_AGENT_TYPE` (if available) or detects agent from context
3. Hook looks up memory agent name from plugin configuration
4. Memory operations target mapped agent scope

**Pros**:
- Declarative configuration (no runtime detection needed)
- Plugin authors control the mapping
- Versioned alongside plugin code
- Works without Claude Code changes

**Cons**:
- Static mapping — cannot handle dynamic agent names
- Requires `CLAUDE_AGENT_TYPE` or similar identifier to be available
- Plugin.json schema extension needed
- Doesn't cover user-created agents (only plugin-defined agents)

**Implementation Complexity**: Low-Medium (~40 lines configuration parsing)

**Verdict**: Good complement to Options A or B. Handles the plugin-internal case well but insufficient as sole mechanism.

---

### Recommended Implementation Path

**Phase 1 (v1.3.0 — Current)**:
- `--agent` flag only (manual, explicit)
- No automatic detection
- All agent operations require user to specify agent name

**Phase 2 (v1.3.x — Near-term)**:
- Add Option A: `CLAUDE_AGENT_NAME` environment variable detection
- Add Option D: Plugin configuration mapping as fallback
- Priority order: `--agent` flag > `CLAUDE_AGENT_NAME` env var > plugin config > no agent

**Phase 3 (v1.4.0 — When Claude Code supports it)**:
- Add Option B: Hook metadata from Claude Code
- Priority order: `--agent` flag > hook metadata > env var > plugin config > no agent
- Deprecate env var once hook metadata is stable

**Priority Resolution Algorithm**:
```typescript
function resolveAgentIdentity(hookInput: HookInput, flags: ParsedFlags): string | undefined {
  // 1. Explicit flag always wins
  if (flags['agent']) return sanitiseAgentName(flags['agent']);

  // 2. Hook metadata (Phase 3)
  if (hookInput.agent_context?.agent_name) {
    return sanitiseAgentName(hookInput.agent_context.agent_name);
  }

  // 3. Environment variable (Phase 2)
  if (process.env.CLAUDE_AGENT_NAME) {
    return sanitiseAgentName(process.env.CLAUDE_AGENT_NAME);
  }

  // 4. Plugin configuration (Phase 2)
  const pluginAgent = resolvePluginAgentMapping(hookInput);
  if (pluginAgent) return sanitiseAgentName(pluginAgent);

  // 5. No agent context — use default (non-agent) scope
  return undefined;
}
```

**Critical Requirement**: ALL paths MUST pass through `sanitiseAgentName()` before filesystem operations. See `gotcha-path-traversal-validation-required-for-user-supplied-agentstyle-names`.

---

## Agent Invocation Marker Format (T128)

**Context**: If Option C (agent invocation markers) is adopted as a fallback mechanism, the marker format must be precisely specified. This section defines the canonical format, placement rules, and parsing requirements.

### Marker Syntax

**Canonical Format**:
```
<!-- agent:{agent-name} -->
```

**Grammar** (ABNF-like):
```
agent-marker   = "<!-- agent:" agent-name " -->"
agent-name     = 1*( ALPHA / DIGIT / "-" )
                 ; lowercase alphanumeric and hyphens
                 ; matches sanitiseAgentName() output
                 ; max 64 characters
```

**Valid Examples**:
```
<!-- agent:typescript-expert -->
<!-- agent:rust-pro -->
<!-- agent:api-architect -->
<!-- agent:memory-curator -->
```

**Invalid Examples**:
```
<!-- agent:TypeScript Expert -->    (spaces, uppercase)
<!-- agent:../../etc/passwd -->     (path traversal characters)
<!-- agent: -->                     (empty name)
<!--agent:foo-->                    (missing spaces)
<!-- agent:foo bar -->              (spaces in name)
```

### Placement Rules

**Rule 1: Single marker per prompt**
Only the first marker in a prompt is recognised. Subsequent markers are ignored to prevent ambiguity.

**Rule 2: Position-independent**
The marker can appear anywhere in the prompt text — beginning, middle, or end. The parsing regex scans the entire prompt.

**Rule 3: System prompt preferred**
For agent plugins, the marker SHOULD be placed in the agent's system prompt (defined in agent frontmatter) rather than in individual user prompts. This ensures consistent agent identification across all interactions.

```yaml
# In agent definition (agents/typescript-expert.md)
---
name: typescript-expert
description: TypeScript language expert
---

<!-- agent:typescript-expert -->

You are a TypeScript expert agent...
```

**Rule 4: Invisible to LLM**
HTML comments are not rendered in most contexts. The marker should not affect the LLM's behaviour or response quality.

### Parsing Requirements

**Regex Pattern**:
```typescript
const AGENT_MARKER_REGEX = /<!-- agent:([a-z0-9][a-z0-9-]{0,62}[a-z0-9]) -->/;
```

**Parsing Algorithm**:
```typescript
function extractAgentFromMarker(prompt: string): string | undefined {
  const match = prompt.match(AGENT_MARKER_REGEX);
  if (!match) return undefined;

  const agentName = match[1];

  // Validate against sanitisation (defence in depth)
  const sanitised = sanitiseAgentName(agentName);
  if (sanitised !== agentName) {
    // Marker contains unsanitary name — reject
    return undefined;
  }

  return agentName;
}
```

**Performance Constraint**: Regex matching on prompt text adds negligible latency (<1ms for prompts up to 100KB). No performance concern.

### Session Caching

Since markers are only available in `UserPromptSubmit` events, the extracted agent name must be cached for use in subsequent `PreToolUse` and `PostToolUse` events within the same session.

**Cache Strategy**:
```typescript
// File-based session cache (already exists: hooks/src/session/session-cache.ts)
interface SessionCache {
  sessionId: string;
  agentName?: string;     // Extracted from marker or env var
  agentSource?: 'marker' | 'env' | 'flag' | 'hook-metadata';
  lastUpdated: string;    // ISO timestamp
}
```

**Cache Lifecycle**:
1. `UserPromptSubmit`: Extract marker, write to session cache
2. `PreToolUse`/`PostToolUse`: Read agent name from session cache
3. `SessionEnd`: Clear session cache

**Cache Location**: `.claude/cache/session-{sessionId}.json` (ephemeral, gitignored)

**Stale Cache Handling**: If session cache is older than 1 hour, ignore it. Agent context should be re-established via fresh marker or env var.

### Integration with GraphNode Enrichment

When agent identity is detected via marker, the `GraphNode` enrichment pipeline must include the agent field. See `gotcha-graphnode-enrichment-critical-for-agent-scoped-mermaid-generation`.

All memories written during an agent session MUST have:
- `frontmatter.agent` set to the detected agent name
- `frontmatter.scope` set to `agent-project` or `agent-global`
- `GraphNode.agent` set during graph node creation
- `GraphNode.scope` set to the resolved scope string
- `GraphNode.title` set for display in filtered views

Failure to enrich any of these fields results in agent-filtered operations (mermaid, stats, health) producing empty or incorrect results.

---

## Hook Integration Requirements for Agent Context (T129)

**Context**: FR-035 through FR-039 require hooks to be aware of agent context for automatic gotcha injection. This section documents the specific requirements for integrating agent identity into the hook system.

### HookInput Extension

The existing `HookInput` interface (defined in `hooks/src/core/types.ts`) must be extended to support agent context. This is a non-breaking addition (new optional field).

**Current Interface**:
```typescript
export interface HookInput {
  hook_event_name: string;
  tool_name?: string;
  tool_input?: { ... };
  prompt?: string;
  tool_use_id?: string;
  session_id?: string;
  cwd?: string;
  permission_mode?: 'default' | 'bypassPermissions';
  transcript_path?: string;
  trigger?: string;
  reason?: string;
}
```

**Proposed Extension** (T130 will implement this):
```typescript
export interface HookInput {
  // ... existing fields unchanged ...

  /**
   * Agent context for agent-scoped operations.
   * Present when Claude Code identifies an active agent.
   * Added in v1.4.0 — hooks MUST handle absence gracefully.
   */
  agent_context?: {
    /** Sanitised agent name (lowercase alphanumeric + hyphens) */
    agent_name: string;
    /** How the agent was identified */
    source: 'flag' | 'hook-metadata' | 'env' | 'marker' | 'plugin-config';
    /** Agent type identifier (e.g., 'claude-memory-plugin:recall') */
    agent_type?: string;
    /** Parent session ID if agent is a sub-agent */
    parent_session_id?: string;
  };
}
```

**Backward Compatibility**: The `agent_context` field is optional. Hooks that do not understand it will ignore it. Existing hooks continue to function without modification (FR-039, FR-043).

### Agent Context Propagation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Context Flow                            │
│                                                                  │
│  1. Identity Source                                              │
│     ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│     │ --agent   │  │ Hook     │  │ Env var   │  │ Marker     │  │
│     │ CLI flag  │  │ metadata │  │ CLAUDE_   │  │ <!-- -->   │  │
│     └────┬─────┘  └────┬─────┘  │ AGENT_    │  └────┬───────┘  │
│          │              │        │ NAME      │       │           │
│          │              │        └────┬──────┘       │           │
│          ▼              ▼             ▼              ▼           │
│     ┌──────────────────────────────────────────────────┐        │
│     │        resolveAgentIdentity()                     │        │
│     │  Priority: flag > metadata > env > marker > none  │        │
│     └────────────────────┬─────────────────────────────┘        │
│                          │                                       │
│  2. Sanitisation         ▼                                       │
│     ┌──────────────────────────────────────────────────┐        │
│     │        sanitiseAgentName()                        │        │
│     │  Lowercase, alphanumeric + hyphens, max 64 chars  │        │
│     └────────────────────┬─────────────────────────────┘        │
│                          │                                       │
│  3. Scope Resolution     ▼                                       │
│     ┌──────────────────────────────────────────────────┐        │
│     │        resolveAgentScopePath()                    │        │
│     │  In git repo: .claude/memory/agents/{name}/       │        │
│     │  No git repo: ~/.claude/memory/agents/{name}/     │        │
│     └────────────────────┬─────────────────────────────┘        │
│                          │                                       │
│  4. Hook Operations      ▼                                       │
│     ┌──────────────────────────────────────────────────┐        │
│     │  Gotcha injection: Load agent gotchas first       │        │
│     │  Memory context: Scope to agent memories          │        │
│     │  Session state: Cache agent identity               │        │
│     └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Performance Constraints

**Critical Gotcha**: All hook I/O MUST be asynchronous. Synchronous file operations break the 50ms hook budget. See `gotcha-retro-sessionstart-hook-message-visibility-requires-exit-code-2-not-0-or-1` and the general performance requirement.

**Budget Allocation for Agent Context**:

| Operation | Budget | Notes |
|-----------|--------|-------|
| Agent identity resolution | <5ms | Env var read or field access |
| Agent name sanitisation | <1ms | Pure string transform |
| Agent scope path resolution | <5ms | Path join + git detection (cached) |
| Agent gotcha loading | <20ms | Async file read from agent scope |
| Session cache read/write | <5ms | Small JSON file, async I/O |
| **Total agent overhead** | **<36ms** | **Within 50ms budget** |

**Optimisation Strategies**:
1. **Lazy resolution**: Only resolve agent scope when a hook actually needs agent context (not on every hook invocation)
2. **Session-level caching**: Resolve agent identity once per session, cache in memory and session file
3. **Parallel loading**: Load agent gotchas in parallel with project gotchas (Promise.all)
4. **Early exit**: If no agent context detected, skip all agent-related operations immediately

### Hook Event Behaviour Matrix

| Hook Event | Agent Context Available? | Agent-Specific Behaviour |
|------------|------------------------|--------------------------|
| `SessionStart` | Via env var or plugin config | Load agent gotchas for initial injection |
| `UserPromptSubmit` | Via marker parsing or env var | Cache agent identity; inject agent context |
| `PreToolUse` | Via session cache or env var | Validate agent scope for write operations |
| `PostToolUse` | Via session cache or env var | Enrich memory context with agent gotchas |
| `PreCompact` | Via session cache | Include agent context in preservation |
| `SessionEnd` | Via session cache | Clear agent session cache |
| `SubagentStop` | Limited (see note below) | Agent type available but not memory agent name |
| `Notification` | Via session cache or env var | Scope notification content to agent |

**SubagentStop Note**: The `SubagentStop` hook receives limited context. See `decision-subagentstop-hook-receives-insufficient-context-use-posttooluse-instead`. For agent context, prefer `PostToolUse` events instead.

### Gotcha Injection Priority Order

When agent context is active, the gotcha injection system (FR-035, FR-036) must prioritise agent-scoped gotchas:

```
Injection Order (highest priority first):
1. Agent-scoped gotchas (from .claude/memory/agents/{name}/permanent/gotcha-*.md)
2. Project-scoped gotchas (from .claude/memory/permanent/gotcha-*.md)
3. Local-scoped gotchas (from .claude/memory/local/permanent/gotcha-*.md)
4. Global-scoped gotchas (from ~/.claude/memory/permanent/gotcha-*.md)
```

**Deduplication (FR-037)**: If the same gotcha ID exists in both agent and project scope, only the agent-scoped version is injected. Agent-scoped gotchas override project-scoped gotchas for the active agent.

**No Agent Context (FR-039)**: When no agent is identified, the injection system MUST behave identically to pre-agent behaviour — only project, local, and global gotchas are injected. No agent directories are scanned.

### Backward Compatibility Guarantees

1. **FR-040**: Hooks without `agent_context` field behave identically to v1.2.x
2. **FR-043**: Agent scope MUST NOT interfere with existing hooks unless agent context is present
3. **Schema versioning**: The `HookInput` type uses optional fields — no breaking changes
4. **Graceful degradation**: If agent scope directory does not exist, skip agent operations silently
5. **Plugin namespace**: Hook invocations MUST use correct plugin namespace (e.g., `claude-memory-plugin:commit` not `memory:commit`). See `gotcha-agents-should-be-copies-not-rewrites`.

### Error Handling Strategy

| Error Scenario | Behaviour | Rationale |
|---------------|-----------|-----------|
| Agent name fails sanitisation | Log warning, proceed without agent context | Don't block operations for bad input |
| Agent directory doesn't exist | Skip agent operations, proceed with default scope | Auto-creation is a write-time concern |
| Agent gotcha file is malformed | Skip that gotcha, log warning | Partial results better than crash |
| Session cache is corrupted | Re-resolve agent identity from source | Self-healing on next hook event |
| Agent scope path resolution fails | Fall back to default scope | Graceful degradation |
| Hook budget exceeded (>50ms) | Return partial results | Performance > completeness |

### Future Extension Points

These are documented for future implementers but NOT implemented in Phase F:

1. **Agent permission model**: Hook metadata could include agent permissions (read-only, read-write, admin)
2. **Agent memory quotas**: Limit number of memories per agent (prevent runaway agents)
3. **Agent audit trail**: Log which agent wrote which memories (forensics)
4. **Cross-agent gotcha sharing**: Agent A's gotchas visible to Agent B if configured
5. **Agent lifecycle hooks**: `AgentStart`, `AgentStop` events for agent-specific initialisation/cleanup

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
