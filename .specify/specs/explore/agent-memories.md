# Exploration: Agent-Scoped Memory System

**Created**: 2026-02-01
**Explorer**: Claude Sonnet 4.5
**Status**: Initial Exploration
**Related**: meeting-command.md (v1.3.0)

---

## Feature Intent

Enable agents to maintain their own persistent memory, separate from user memories, allowing agents to learn from past interactions, accumulate expertise, and maintain collaboration history.

**User Story**: As a developer using specialized agents (e.g., typescript-expert, security-auditor), I want agents to remember their past recommendations and learnings so that they provide increasingly refined and contextual advice over time.

**Core Value Proposition**:
- **Agent expertise accumulation**: Agents learn from past interactions and build domain knowledge
- **Collaboration history**: Agents can reference what they've worked on before
- **Specialized gotchas**: Agents maintain their own gotcha libraries based on errors they've helped fix
- **Meeting integration**: Meeting participants can contribute to their own memory banks

**Success Criteria**:
- Agents can write/read their own memories without polluting user memory space
- Agent memories are queryable and searchable (semantic search within agent scope)
- Integration with meeting command (agents add meeting insights to their memory)
- Clear separation between agent memories and user memories

---

## Problem Statement

**Current Limitation**: All memories are user-scoped (project/local/global). When agents participate in meetings or deliberations, their contributions are ephemeral or saved to user memory space.

**What We Need**:
1. **Agent-scoped storage**: Each agent has its own memory namespace
2. **Agent-driven writes**: Agents can self-reflect and save their own learnings
3. **Cross-agent collaboration**: Agents can optionally read other agents' memories (with permissions)
4. **Meeting integration**: Meeting participants automatically contribute key insights to their agent memories

**Example Flow**:
```
User: /meeting architecture-review
  → typescript-expert participates
  → Provides TypeScript best practices feedback
  → After meeting, typescript-expert saves:
     - "Learning: Project uses strict null checks - always account for undefined"
     - "Gotcha: Team prefers type guards over type assertions"
     - Links back to meeting minutes for context

Next session with typescript-expert:
  → Agent recalls project-specific preferences
  → Provides contextual advice aligned with past decisions
```

---

## Proposed Architecture

### Storage Structure

```
.claude/memory/
├── agents/                    # Agent-scoped memories (new)
│   ├── typescript-expert/
│   │   ├── index.json
│   │   ├── graph.json
│   │   ├── embeddings.json
│   │   ├── permanent/
│   │   │   ├── learning-strict-null-checks.md
│   │   │   ├── gotcha-type-assertion-preference.md
│   │   │   └── decision-use-zod-for-validation.md
│   │   └── temporary/
│   │       └── thought-*.md
│   ├── security-auditor/
│   │   └── ...
│   └── architect/
│       └── ...
├── permanent/                 # User memories (existing)
├── temporary/
└── ...
```

**Alternative Considered**: Add `agent` field to existing scope system
**Rejected Because**: Mixing agent and user memories in same index creates confusion, makes queries complex

### Scope Hierarchy (Extended)

Current: `agent > project > local > global`

**New with agent memories**:
```
Resolution order for agent context injection:
1. agent-project (agent's project-specific memories)
2. agent-global (agent's cross-project memories)
3. project (user's project memories)
4. local (user's local memories)
5. global (user's global memories)
```

**Rationale**: Agent-specific context takes precedence (most specialized), falls back to user context

### Agent Memory Types

Same as user memories (reuse existing types):
- **Decision**: Agent's past architectural/technical decisions
- **Learning**: Agent's accumulated knowledge from sessions
- **Gotcha**: Agent's library of pitfalls encountered
- **Breadcrumb**: Agent's temporary working context
- **Artifact**: Agent-maintained templates, checklists, references

**Example Agent Memories**:

```yaml
# .claude/memory/agents/typescript-expert/permanent/learning-project-prefers-functional.md
---
id: learning-project-prefers-functional
type: learning
title: Project Prefers Functional Programming Patterns
created: 2026-01-15T10:30:00Z
updated: 2026-01-28T14:20:00Z
tags: [typescript-expert, coding-style, functional-programming]
scope: agent-project
agent: typescript-expert
severity: medium
links:
  - meeting-architecture-review-2026-01-15
---

This project consistently chooses functional patterns over OOP:
- Pure functions preferred over classes
- Immutable data structures (Immer for state updates)
- Composition over inheritance
- Higher-order functions over method chaining

When providing TypeScript advice, suggest functional patterns first.
```

---

## CLI Interface Design

### New Commands

```bash
# Agent writes to its own memory
memory write --agent typescript-expert <<EOF
{
  "title": "Project Uses Strict Null Checks",
  "content": "Always account for undefined...",
  "type": "learning"
}
EOF

# Agent reads from its own memory
memory search "null checks" --agent typescript-expert

# Agent semantic search within its memory
memory semantic "type safety patterns" --agent typescript-expert

# Agent thinks (creates agent-scoped thinking document)
memory think create "Should we use Zod or io-ts?" --agent typescript-expert

# List agent's memories
memory list --agent typescript-expert --scope agent-project
```

### Meta Flag for Agent Management

```bash
# Meta mode: Managing agent resources (agent definitions, not memories)
# These interact with .claude/agents/accord/ (agent configs)
accord agent list --meta
accord agent create my-reviewer --meta
accord agent edit typescript-expert --meta

# Working mode: Agent executing tasks (writes to agent memories)
# These interact with .claude/memory/agents/ (agent memories)
accord agent typescript-expert "Review this code"
  → Agent runs, saves learnings to its memory

# Think mode: Agent deliberation (agent-scoped thinking)
accord think typescript-expert "Is this type-safe?"
  → Creates thinking document in .claude/memory/agents/typescript-expert/temporary/
```

**Distinction**:
- `--meta`: Managing agents themselves (configs in `.claude/agents/accord/`)
- Without `--meta`: Agent working (memories in `.claude/memory/agents/{name}/`)

---

## Meeting Integration

### Automatic Agent Memory Contribution

After a meeting concludes, each participant agent can optionally save key insights:

```yaml
# meeting-template.yaml
participants:
  - agent: typescript-expert
    role: "TypeScript patterns"
    auto_save_learnings: true  # NEW: Opt-in agent memory contribution

  - style: Architect
    role: "System design"
    auto_save_learnings: false  # Styles don't have memory (they're stateless)
```

**Flow**:
1. Meeting runs, agents contribute
2. Meeting concludes with minutes
3. For each participant with `auto_save_learnings: true`:
   - Extract agent's key contributions
   - Prompt agent: "What should you remember from this meeting?"
   - Agent responds with learnings/decisions
   - Save to agent's memory with link to meeting minutes

**Example Post-Meeting Memory**:
```yaml
---
id: learning-meeting-architecture-review-insights
type: learning
title: Architecture Review Meeting Insights
created: 2026-01-31T16:00:00Z
tags: [typescript-expert, meeting-insights, architecture]
scope: agent-project
agent: typescript-expert
links:
  - thought-meeting-architecture-review-2026-01-31
---

Key learnings from architecture review meeting:
1. Team decided to use Zod for schema validation
2. Prefer type guards over type assertions
3. Project uses strict null checks - always account for undefined

These preferences should guide future TypeScript recommendations.
```

---

## Agent Discovery & Invocation

### Agent Definition Location

Agents live in:
- **Global**: `~/.claude/agents/accord/` (user-level agents)
- **Project**: `.claude/agents/accord/` (project-specific agents)

**Agent Definition Format** (YAML frontmatter + markdown):
```yaml
# ~/.claude/agents/accord/typescript-expert.md
---
name: typescript-expert
description: TypeScript expert providing type safety and best practices advice
model: sonnet  # or haiku, opus
output_style: Architect  # Optional: Append this style to system prompt
memory_enabled: true  # NEW: Can this agent write to its own memory?
memory_scope: agent-project  # or agent-global
---

You are a TypeScript expert specializing in type safety, generics, and modern TypeScript patterns.

Your responsibilities:
- Review code for type safety issues
- Suggest improvements using advanced TypeScript features
- Maintain project-specific TypeScript conventions in your memory
- Reference past decisions when providing recommendations

When you learn something important about this project's TypeScript usage, save it to your memory.
```

### CLI Invocation

```bash
# Invoke agent with model/style override
accord agent typescript-expert "Review this code" \
  --model haiku \
  --style Architect

# Agent automatically has access to:
# 1. Its own memories (agent-project + agent-global)
# 2. User memories (project + local + global)
# 3. Current context (files, conversation)
```

---

## Technical Implementation

### Memory Write API Extension

```typescript
// Existing: writeMemory(request: WriteMemoryRequest)
interface WriteMemoryRequest {
  title: string;
  content: string;
  type: MemoryType;
  scope: Scope;  // existing: project | local | global
  agent?: string;  // NEW: Agent name (optional)
  // ... existing fields
}

// Derived scope logic:
function resolveMemoryPath(request: WriteMemoryRequest): string {
  if (request.agent) {
    // Agent memory path
    const agentScope = request.scope === Scope.Project ? 'agent-project' : 'agent-global';
    return `.claude/memory/agents/${request.agent}/`;
  }
  // User memory path (existing logic)
  return getScopePath(request.scope);
}
```

### Search API Extension

```typescript
interface SearchRequest {
  query: string;
  scope?: Scope;
  agent?: string;  // NEW: Search within agent's memories
  include_user_memories?: boolean;  // NEW: Also search user memories (default: true)
}

// Example:
searchMemories({
  query: "type safety",
  agent: "typescript-expert",
  include_user_memories: true  // Search agent + user memories
});
```

### Context Injection Priority

When agent is invoked, memories are injected in order:
1. Agent-project memories (most specific)
2. Agent-global memories
3. Project memories
4. Local memories
5. Global memories

**Token Budget Management**:
- Agent memories: Up to 30% of context budget
- User memories: Up to 50% of context budget
- Current context: Remaining 20%

---

## Security & Permissions

### Agent Memory Isolation

**Question**: Can agents read other agents' memories?

**Recommendation**: No by default, opt-in via configuration

```yaml
# ~/.claude/agents/accord/typescript-expert.md
---
memory_enabled: true
memory_scope: agent-project
can_read_agent_memories:  # NEW: Cross-agent memory access
  - security-auditor  # Can read security-auditor's memories
  - architect         # Can read architect's memories
---
```

**Rationale**:
- Privacy: Agents shouldn't see all other agents' memories by default
- Performance: Reading all agent memories would explode context size
- Collaboration: Opt-in allows related agents to share knowledge

### User Memory Access

**Question**: Can agents write to user memory space?

**Recommendation**: No. Agents write to `agent-*` scope only.

**Rationale**:
- Clear ownership: User memories are user-created
- Agent memories are agent-created
- Meeting minutes (user-created) can link to agent memories

**Exception**: Meeting command creates user memory (meeting minutes) but agents contribute to their own memory separately

---

## Open Questions

### 1. Agent Memory Lifecycle

**Question**: When should agent memories be cleaned up?

**Options**:
- **Manual cleanup**: User runs `memory prune --agent typescript-expert`
- **Auto-expire breadcrumbs**: Same as user breadcrumbs (time-based expiry)
- **Never auto-delete**: Agent memories persist indefinitely (user explicit delete only)

**Recommendation**: Same lifecycle as user memories (breadcrumbs expire, permanent memories persist)

### 2. Agent Memory Migration

**Question**: If an agent is renamed, what happens to its memories?

**Options**:
- **Lose access**: Memories orphaned (but preserved on disk)
- **Migration command**: `memory migrate-agent old-name new-name`
- **Symlink support**: Agent config can reference `memory_path` override

**Recommendation**: Start with option 1 (simple), add migration command if needed

### 3. Agent Memory Synchronization

**Question**: In a team setting, should agent memories sync across machines?

**Options**:
- **Git-tracked**: Check agent memories into `.claude/memory/agents/` (same as user memories)
- **Local only**: Agent memories are machine-specific
- **Hybrid**: Agent-global syncs, agent-project is git-tracked

**Recommendation**: Hybrid approach (agent-global in `~/.claude/memory/agents/` local, agent-project in `.claude/memory/agents/` git-tracked)

### 4. Agent Memory vs Agent Configuration

**Question**: What's the relationship between agent config (`.claude/agents/accord/`) and agent memory (`.claude/memory/agents/`)?

**Clarification**:
- **Agent config** (`~/.claude/agents/accord/typescript-expert.md`):
  - Agent definition (system prompt, model, capabilities)
  - Immutable during execution (defines WHO the agent is)

- **Agent memory** (`.claude/memory/agents/typescript-expert/`):
  - Agent's accumulated knowledge
  - Mutable during execution (WHAT the agent has learned)

### 5. Meeting Agent Contributions

**Question**: Should meeting command automatically extract agent learnings, or require explicit post-meeting step?

**Options**:
- **Automatic**: After meeting, each agent auto-prompted "What did you learn?"
- **Manual**: User runs `memory extract-learnings <meeting-id> --agent typescript-expert`
- **Template-driven**: Meeting template specifies `auto_save_learnings: true/false` per agent

**Recommendation**: Template-driven (option 3) - gives user control, no surprise memory writes

---

## Integration with Existing Features

### Memory Think System

Agent-scoped thinking:
```bash
# Create agent-scoped thinking document
memory think create "Type safety strategy" --agent typescript-expert

# Agent's thoughts go to: .claude/memory/agents/typescript-expert/temporary/
# Can be promoted to agent-project permanent memory
```

### Semantic Search

```bash
# Search across agent + user memories
memory semantic "null safety" --agent typescript-expert

# Behind the scenes:
# 1. Search agent-project embeddings
# 2. Search agent-global embeddings
# 3. Search user project/local/global embeddings (if include_user_memories=true)
# 4. Merge and rank results
```

### Graph Linking

```yaml
# Agent memory can link to user memories and vice versa
---
id: learning-typescript-patterns
agent: typescript-expert
scope: agent-project
links:
  - decision-use-zod-validation  # Links to user memory
  - meeting-architecture-review  # Links to meeting minutes
---
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (v1.3.0)
- [ ] Extend `WriteMemoryRequest` with `agent` field
- [ ] Implement `resolveMemoryPath()` for agent scope
- [ ] Update index/graph/embeddings to support agent namespaces
- [ ] Add agent memory CLI commands (`memory write --agent`, `memory search --agent`)
- [ ] Update scope resolution to include agent-project/agent-global

### Phase 2: Meeting Integration (v1.3.0)
- [ ] Add `auto_save_learnings` to meeting template schema
- [ ] Implement post-meeting agent memory extraction
- [ ] Link meeting minutes to agent memories

### Phase 3: Advanced Features (v1.4.0+)
- [ ] Cross-agent memory access (opt-in)
- [ ] Agent memory migration tools
- [ ] Agent memory health checks (curator support)
- [ ] Agent memory analytics (which agents learn most?)

---

## Risk Mitigation

### Storage Explosion

**Risk**: Each agent accumulates memories indefinitely, disk usage explodes

**Mitigation**:
- Breadcrumb expiry (same as user memories)
- Agent memory size limits (warn if >100 memories per agent)
- Prune command: `memory prune --agent typescript-expert --older-than 90d`

### Context Pollution

**Risk**: Agent memories consume too much context, reducing space for current task

**Mitigation**:
- Agent memory budget: Max 30% of context window
- Relevance scoring: Only inject high-relevance agent memories
- User override: `--no-agent-context` flag to disable agent memory injection

### Agent Impersonation

**Risk**: User writes to agent memory pretending to be agent

**Mitigation**:
- Agent field in memory metadata is informational only (not access control)
- Clear UI distinction: "Agent Memory" vs "User Memory" in listings
- Agent memory writes require `--agent` flag (explicit intent)

---

## Success Metrics

### Adoption Metrics
- % of agents with memory enabled
- Average memories per agent
- Agent memory read rate (how often agents access their own memory)

### Quality Metrics
- Agent recommendation improvement over time (subjective user feedback)
- Agent memory relevance score (semantic search hit rate)
- Cross-session context retention (agents remember past decisions)

### Performance Metrics
- Agent memory injection latency (<200ms)
- Storage overhead (agent memories vs user memories ratio)
- Context budget usage (agent memories % of total context)

---

## Next Steps

1. **Validate concept** with user feedback
2. **Refine schema** for agent memory metadata (need `agent` field in frontmatter?)
3. **Prototype** basic agent write/read flow
4. **Integrate** with meeting command (Phase 2 dependency)
5. **Document** agent memory usage patterns in README

---

## Related Documents

- [meeting-command.md](./meeting-command.md) - Multi-agent deliberation (v1.3.0)
- Decision: Embedding Generation Should Be Default (v1.2.1)
- Learning: Memory Think System Architecture

---

## References

### Agent Memory Systems
- [LangChain Agent Memory](https://python.langchain.com/docs/modules/memory/)
- [AutoGen Conversational Memory](https://microsoft.github.io/autogen/docs/topics/memory)
- [Anthropic Extended Context Windows](https://docs.anthropic.com/en/docs/build-with-claude/extended-context)

### Multi-Agent Knowledge Sharing
- [Cooperative AI: Agents Sharing Knowledge](https://arxiv.org/abs/2006.14372)
- [Multi-Agent Systems: Learning and Memory](https://dl.acm.org/doi/10.1145/3580305.3599913)

### Scope Resolution Patterns
- [UNIX File System Hierarchy](https://en.wikipedia.org/wiki/Filesystem_Hierarchy_Standard)
- [Git Configuration Scopes](https://git-scm.com/docs/git-config#_configuration_file)
