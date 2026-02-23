---
description: Guided workflow for agents to capture learnings in agent-scoped memory
version: "1.5.0"
allowed-tools: Bash(memory:*), Bash(mkdir:*), Write
---

# Agent Memory Commit

## Context

You are an **agent** that has completed meaningful work. This workflow guides you through capturing high-signal learnings in your **agent-scoped memory namespace**.

**Why agent-scoped memory?**
- Isolated knowledge base specific to your expertise
- Prevents polluting project/global scopes with agent-specific patterns
- Enables cross-scope linking for shared insights
- Persistent across sessions

## CRITICAL: Dual-Save Pattern

You **MUST** save memories using **BOTH** methods:

### A. Memory Plugin (Primary - Structured Storage)
```bash
echo '{"type":"learning","title":"Brief title","content":"Description","tags":"tag1,tag2"}' | memory write --agent $AGENT_NAME --auto-link
```

### B. Agent Memory Files (Backup - Session Persistence)

Two sub-approaches — use both for maximum redundancy:

**B1. Native memory tags** (Claude's built-in memory, brief learnings):
```
<save_memory>
Agent: {agent-name}
Topic: {brief-topic}
Learning: {summary}
</save_memory>
```

**B2. Agent memory directory** (file-based, for detailed or structured notes):

Create or append to files under `.claude/agent-memory/{agent-name}/`:

```bash
# Ensure directory exists
mkdir -p .claude/agent-memory/$AGENT_NAME
```

- **`MEMORY.md`** — primary memory file, brief session summaries:
  ```
  # Example path: .claude/agent-memory/speckit-explorer/MEMORY.md
  ```
- **Topical files** — detailed notes by subject area:
  ```
  # Examples:
  # .claude/agent-memory/speckit-explorer/researching-ideas.md
  # .claude/agent-memory/speckit-explorer/patterns.md
  # .claude/agent-memory/typescript-expert/type-system-notes.md
  ```

Use the **Write tool** to create/update these files. Keep `MEMORY.md` under 200 lines — move detail into topical files.

**Why both methods?**
- Memory plugin (A): Semantic search, graph relationships, structured queries
- Native tags (B1): Survives plugin changes, loads into system prompt automatically
- Directory files (B2): Human-readable, git-tracked, organise by topic, persist across plugin updates
- Redundancy ensures critical knowledge isn't lost

---

## Step 1: Identify Your Agent Name

Check in priority order:

1. **Invocation argument** — the prompt may contain `agent-name={name}`:
   ```
   # Example invocation: /claude-memory-plugin:agent-commit agent-name=speckit-explorer
   AGENT_NAME="speckit-explorer"   # extracted from agent-name= arg
   ```

2. **Environment variable** — `CLAUDE_AGENT_NAME` if set:
   ```bash
   AGENT_NAME="${CLAUDE_AGENT_NAME:-}"
   ```

3. **Infer from context** — if neither is present, use a descriptive name based on your role
   (e.g., `typescript-expert`, `security-reviewer`, `speckit-explorer`).

```bash
echo "Agent: $AGENT_NAME"
```

---

## Step 2: Review Your Work (Mental Filter)

Identify **1-3 high-signal items** worth capturing:

**Worth Capturing:**
- Non-obvious gotchas that cost time to discover
- Patterns that should be reused in similar contexts
- Decisions with clear rationale
- Performance insights or optimisation techniques
- Security vulnerabilities and their fixes

**Skip:**
- Obvious best practices already well-documented
- Trivial syntax fixes
- Things already in memory (check first)
- Routine refactoring without novel insights

---

## Step 3: Dual-Save Each Memory

For each item, save using **BOTH** methods:

### Learnings (Gotchas, Tips, Insights)

**A. Memory Plugin:**
```bash
echo '{
  "type": "learning",
  "title": "TypeScript generic constraints with keyof",
  "content": "When using keyof with generics, TypeScript requires explicit constraint syntax: <K extends keyof T> not just <K>. Without extends, TypeScript cant infer the key relationship.",
  "tags": "typescript,generics,type-constraints"
}' | memory write --agent $AGENT_NAME --auto-link
```

**B. MEMORY.md:**
```
<save_memory>
Agent: typescript-expert
Topic: Generic constraints
Learning: TypeScript keyof with generics requires explicit extends keyword for proper type inference
</save_memory>
```

### Decisions (Architectural Choices)

**A. Memory Plugin:**
```bash
echo '{
  "type": "decision",
  "title": "Use storeCrossScopeEdge for cross-scope links",
  "content": "Decided to route cross-scope link suggestions through storeCrossScopeEdge() instead of linkMemories() to ensure bidirectional graph writes and proper metadata tracking.",
  "tags": "architecture,cross-scope,graph-design"
}' | memory write --agent $AGENT_NAME --auto-link
```

**B. MEMORY.md:**
```
<save_memory>
Agent: memory-architect
Topic: Cross-scope linking
Learning: Always use storeCrossScopeEdge() for cross-scope links to maintain graph consistency
</save_memory>
```

### Gotchas (Bugs, Edge Cases, Warnings)

**A. Memory Plugin:**
```bash
echo '{
  "type": "gotcha",
  "title": "Bun test mocking requires mockModule not vi.mock",
  "content": "Bun test framework uses different mocking API than Vitest. Must use mock.module() instead of vi.mock() for module-level mocks. vi.mock() causes global pollution in Bun.",
  "tags": "bun,testing,mocking,vitest-migration"
}' | memory write --agent $AGENT_NAME --auto-link
```

**B. MEMORY.md:**
```
<save_memory>
Agent: test-expert
Topic: Bun test mocking
Learning: Use mock.module() not vi.mock() in Bun - different API prevents global pollution
</save_memory>
```

### Artifacts (Reusable Patterns, Code Snippets)

**A. Memory Plugin:**
```bash
echo '{
  "type": "artifact",
  "title": "Cross-scope metadata tracking pattern",
  "content": "Pattern for tracking metadata during multi-scope operations: Create metadataMap, populate during loading, use for cross-scope detection. Enables intelligent routing without tight coupling.",
  "tags": "pattern,architecture,metadata,scope-handling"
}' | memory write --agent $AGENT_NAME --auto-link
```

**B. MEMORY.md:**
```
<save_memory>
Agent: architecture-expert
Topic: Multi-scope metadata
Learning: Metadata map pattern enables cross-scope detection without coupling
</save_memory>
```

---

## Step 4: Optional - Save to Project Scope (Team-Relevant)

If a learning is valuable for the **entire team**, save it to **project scope** (omit `--agent` flag):

```bash
echo '{
  "type": "decision",
  "title": "Always use Bash for git operations, not Write",
  "content": "Project convention: Use Bash tool for git commands (commit, push, etc.) rather than Write with heredocs. Maintains clean git history and enables proper hook execution.",
  "tags": "git,project-convention,tooling"
}' | memory write --auto-link

<save_memory>
Topic: Git tool convention
Learning: Use Bash for git operations to maintain clean history and hook execution
</save_memory>
```

---

## Step 5: Generate Embeddings & Auto-Link (v1.4.0+)

After saving memories, generate embeddings and create cross-scope links:

```bash
# Generate embeddings for semantic search
memory refresh --embeddings --agent $AGENT_NAME

# Auto-link within agent scope AND to shared scopes
memory suggest-links --agent $AGENT_NAME --include-shared --auto-link
```

**What this does:**
- `refresh --embeddings`: Enables semantic search on your memories
- `suggest-links --include-shared --auto-link`: Creates links between your agent memories AND discovers/creates links to relevant project/global memories

---

## Step 6: Verify & Report

```bash
# Verify memories were created
memory list --agent $AGENT_NAME | tail -5

# Report summary
echo "
Agent memory commit complete:
- Agent: $AGENT_NAME
- Memories saved: [count]
- Embeddings generated: ✓
- Cross-scope links created: ✓
"
```

---

## Guidelines

- **Be selective**: 1-3 high-signal items max. Quality over quantity.
- **Be concise**: 1-2 sentences per memory. Details can be reconstructed from git history.
- **Be specific**: "TypeScript keyof needs extends" not "Found a type issue"
- **Always dual-save**: Memory plugin (A) + native tags (B1) + agent directory files (B2)
- **Use --agent flag**: Keeps your knowledge in your namespace
- **Generate embeddings**: Enables semantic search and auto-linking
- **Auto-link with --include-shared**: Discovers connections to project knowledge
- **Agent name priority**: `agent-name=` arg > `CLAUDE_AGENT_NAME` env var > infer from context
- **Keep MEMORY.md concise**: Under 200 lines — move detailed notes to topical files

---

## Example Full Workflow

```bash
# Step 1: Identify agent (check invocation arg, then env var, then infer)
# If invoked as: /claude-memory-plugin:agent-commit agent-name=typescript-expert
AGENT_NAME="typescript-expert"

# Step 2: Save learning (dual-save: A + B1 + B2)

# A. Memory plugin (structured storage)
echo '{
  "type": "learning",
  "title": "Readonly tuple types prevent mutation",
  "content": "TypeScript readonly tuple types [readonly [string, number]] prevent both element reassignment and array mutation methods. More restrictive than ReadonlyArray.",
  "tags": "typescript,tuples,immutability"
}' | memory write --agent $AGENT_NAME --auto-link

# B1. Native memory tag (session persistence)
<save_memory>
Agent: typescript-expert
Topic: Readonly tuples
Learning: Readonly tuple types more restrictive than ReadonlyArray - prevent all mutations
</save_memory>

# B2. Agent memory directory (file-based, git-tracked)
mkdir -p .claude/agent-memory/$AGENT_NAME
# Use Write tool to update MEMORY.md and topical files, e.g.:
# .claude/agent-memory/typescript-expert/MEMORY.md
# .claude/agent-memory/typescript-expert/type-system-notes.md

# Step 3: Generate embeddings
memory refresh --embeddings --agent $AGENT_NAME

# Step 4: Auto-link across scopes
memory suggest-links --agent $AGENT_NAME --include-shared --auto-link

# Step 5: Verify
memory list --agent $AGENT_NAME | tail -3

echo "✓ Agent memory commit complete"
```

---

## When NOT to Use This

- Trivial read-only work (searches, status checks)
- Information already captured in previous memories
- Obvious best practices with extensive documentation
- Work still in progress (wait until complete)
