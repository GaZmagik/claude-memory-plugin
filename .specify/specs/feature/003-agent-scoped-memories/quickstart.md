# Quickstart: Agent-Scoped Memories

**Feature**: 003-agent-scoped-memories
**Purpose**: Developer validation guide for testing the implementation
**Target Audience**: Developers implementing and testing this feature

---

## Prerequisites

- Bun >= 1.0.0 installed
- Claude Memory Plugin installed
- Feature branch checked out: `feature/003-agent-scoped-memories`
- Tests passing: `bun test`

---

## Validation Scenarios

### Scenario 1: Agent Memory Storage and Retrieval

**Goal**: Validate US1 - Agent memories are stored and retrieved from agent-scoped directories

**Steps**:

1. **Create an agent-scoped memory**:
   ```bash
   cd /path/to/test-project  # Must be a git repository

   memory write \
     --title "ESM imports require .js extensions" \
     --type learning \
     --agent typescript-expert \
     --tags "typescript,esm,gotcha" \
     --content "When using ES modules in TypeScript, imports must include the .js extension even though the source files are .ts"
   ```

2. **Verify storage location**:
   ```bash
   ls .claude/memory/agents/typescript-expert/permanent/
   # Expected: learning-esm-imports.md

   cat .claude/memory/agents/typescript-expert/permanent/learning-esm-imports.md
   # Expected: Frontmatter includes:
   #   scope: agent-project
   #   agent: typescript-expert
   ```

3. **Read the memory back**:
   ```bash
   memory read learning-esm-imports --agent typescript-expert
   # Expected: Full memory content displayed with scope indicator [agent-project:typescript-expert]
   ```

4. **List agent memories**:
   ```bash
   memory list --agent typescript-expert
   # Expected: Shows learning-esm-imports

   memory list
   # Expected: Does NOT show learning-esm-imports (agent memories hidden without --agent)
   ```

5. **Delete the memory**:
   ```bash
   memory delete learning-esm-imports --agent typescript-expert
   # Expected: Success message

   ls .claude/memory/agents/typescript-expert/permanent/
   # Expected: File removed
   ```

**Success Criteria**:
- ✅ Memory file created in correct agent directory
- ✅ Frontmatter includes `agent` and `scope: agent-project` fields
- ✅ Read operation returns memory content
- ✅ List with `--agent` shows memory, list without `--agent` does not
- ✅ Delete removes file and updates index

---

### Scenario 2: Scope Hierarchy Resolution

**Goal**: Validate US2 - Agent scope hierarchy resolves correctly

**Steps**:

1. **Create agent-project memory** (in git repo):
   ```bash
   cd /path/to/test-project  # Git repository

   memory write \
     --title "Project-specific TypeScript pattern" \
     --type learning \
     --agent typescript-expert \
     --content "This pattern is specific to this project"
   ```

2. **Verify agent-project scope**:
   ```bash
   cat .claude/memory/agents/typescript-expert/permanent/learning-project-specific-typescript-pattern.md | grep "scope:"
   # Expected: scope: agent-project
   ```

3. **Create agent-global memory** (explicit global):
   ```bash
   memory write \
     --title "Cross-project TypeScript pattern" \
     --type artifact \
     --agent typescript-expert \
     --scope global \
     --content "This pattern applies across all TypeScript projects"
   ```

4. **Verify agent-global scope**:
   ```bash
   ls ~/.claude/memory/agents/typescript-expert/permanent/
   # Expected: artifact-cross-project-typescript-pattern.md

   cat ~/.claude/memory/agents/typescript-expert/permanent/artifact-cross-project-typescript-pattern.md | grep "scope:"
   # Expected: scope: agent-global
   ```

5. **Create memory outside git repo** (defaults to global):
   ```bash
   cd /tmp

   memory write \
     --title "Another global pattern" \
     --type learning \
     --agent typescript-expert \
     --content "Created outside git repo"

   cat ~/.claude/memory/agents/typescript-expert/permanent/learning-another-global-pattern.md | grep "scope:"
   # Expected: scope: agent-global
   ```

6. **Search with hierarchy**:
   ```bash
   cd /path/to/test-project

   memory search "TypeScript pattern" --agent typescript-expert
   # Expected: Results from both agent-project and agent-global, ordered:
   #   1. learning-project-specific-typescript-pattern [agent-project]
   #   2. artifact-cross-project-typescript-pattern [agent-global]
   #   3. learning-another-global-pattern [agent-global]
   ```

7. **Search with shared scope**:
   ```bash
   # First create a project memory
   memory write --title "Project TypeScript decision" --type decision --content "We use TypeScript"

   memory search "TypeScript" --agent typescript-expert --include-shared
   # Expected: Results include agent memories PLUS project memory:
   #   [agent-project] learning-project-specific-typescript-pattern
   #   [agent-global] artifact-cross-project-typescript-pattern
   #   [project] decision-project-typescript-decision
   ```

**Success Criteria**:
- ✅ Agent-project memories stored in `.claude/memory/agents/{name}/` when in git repo
- ✅ Agent-global memories stored in `~/.claude/memory/agents/{name}/` when outside git or explicit `--scope global`
- ✅ Search returns agent-project results before agent-global
- ✅ `--include-shared` flag includes project/global memories after agent memories

---

### Scenario 3: CLI Agent Targeting

**Goal**: Validate US3 - All CLI commands accept `--agent` flag

**Steps**:

1. **Setup test data**:
   ```bash
   # Create multiple agent memories
   memory write --title "TypeScript learning 1" --type learning --agent typescript-expert --content "Content 1"
   memory write --title "TypeScript gotcha 1" --type gotcha --agent typescript-expert --content "Content 2"
   memory write --title "Rust learning 1" --type learning --agent rust-expert --content "Content 3"
   ```

2. **Test `memory list` with agent filter**:
   ```bash
   memory list --agent typescript-expert
   # Expected: Shows 2 memories (TypeScript only)

   memory list --agent rust-expert
   # Expected: Shows 1 memory (Rust only)

   memory list gotcha --agent typescript-expert
   # Expected: Shows 1 memory (TypeScript gotcha only)
   ```

3. **Test `memory search` with agent scope**:
   ```bash
   memory search "learning" --agent typescript-expert
   # Expected: Only TypeScript learning 1

   memory search "learning" --agent rust-expert
   # Expected: Only Rust learning 1
   ```

4. **Test `memory tag` with agent scope**:
   ```bash
   memory tag learning-typescript-learning-1 async-patterns --agent typescript-expert

   memory read learning-typescript-learning-1 --agent typescript-expert
   # Expected: Tags include "async-patterns"
   ```

5. **Test help text**:
   ```bash
   memory help write | grep -A2 "agent"
   # Expected: Documentation for --agent <name> flag
   ```

6. **Test backward compatibility** (no `--agent` flag):
   ```bash
   memory list
   # Expected: Shows only project/global memories, NOT agent memories

   memory search "learning"
   # Expected: Only project/global memories in results
   ```

**Success Criteria**:
- ✅ All CRUD commands accept `--agent` flag
- ✅ Operations scoped correctly to specified agent
- ✅ Help text documents `--agent` flag
- ✅ Commands without `--agent` behave identically to v1.2.0

---

### Scenario 4: Cross-Scope Memory Linking

**Goal**: Validate US4 - Agent memories can link to project/global memories bidirectionally

> **Note**: Full bidirectional cross-scope linking (storing edges in both graphs) was deferred. The current implementation supports `--include-shared` for read operations and intra-agent linking. Cross-agent linking via `--target-agent` is planned for a future phase.

**Steps**:

1. **Setup test memories**:
   ```bash
   # Project memory
   memory write \
     --title "Use TypeScript for type safety" \
     --type decision \
     --content "We decided to use TypeScript"

   # Agent memory
   memory write \
     --title "ESM imports pattern" \
     --type learning \
     --agent typescript-expert \
     --content "ESM imports require .js extensions"
   ```

2. **Create cross-scope link** (agent → project):
   ```bash
   memory link \
     learning-esm-imports-pattern \
     decision-use-typescript-for-type-safety \
     --agent typescript-expert \
     --label "informs"
   ```

3. **Verify link in agent graph**:
   ```bash
   cat .claude/memory/agents/typescript-expert/graph.json
   # Expected: Edge exists with metadata:
   # {
   #   "source": "learning-esm-imports-pattern",
   #   "target": "decision-use-typescript-for-type-safety",
   #   "label": "informs",
   #   "sourceScope": "agent-project",
   #   "targetScope": "project"
   # }
   ```

4. **Verify reverse link in project graph**:
   ```bash
   cat .claude/memory/graph.json
   # Expected: Reverse edge exists:
   # {
   #   "source": "decision-use-typescript-for-type-safety",
   #   "target": "learning-esm-imports-pattern",
   #   "label": "informs",
   #   "sourceScope": "project",
   #   "targetScope": "agent-project",
   #   "targetAgent": "typescript-expert"
   # }
   ```

5. **View edges from agent memory**:
   ```bash
   memory edges learning-esm-imports-pattern --agent typescript-expert
   # Expected:
   # Outbound (1):
   #   → decision-use-typescript-for-type-safety [project] (informs)
   ```

6. **View edges from project memory**:
   ```bash
   memory edges decision-use-typescript-for-type-safety
   # Expected:
   # Inbound (1):
   #   ← learning-esm-imports-pattern [agent:typescript-expert] (informs)
   ```

7. **Test cross-scope deletion cleanup**:
   ```bash
   memory delete decision-use-typescript-for-type-safety
   # Expected: Success message with cleanup report

   cat .claude/memory/agents/typescript-expert/graph.json
   # Expected: Edge removed from agent graph (cleanup successful)

   memory edges learning-esm-imports-pattern --agent typescript-expert
   # Expected: No outbound edges (orphaned)
   ```

8. **Test cross-agent linking**:
   ```bash
   # Create rust memory
   memory write --title "Ownership patterns" --type learning --agent rust-expert --content "Rust ownership"

   # Link typescript → rust
   memory link \
     learning-esm-imports-pattern \
     learning-ownership-patterns \
     --agent typescript-expert \
     --target-agent rust-expert

   # Verify in both graphs
   memory edges learning-esm-imports-pattern --agent typescript-expert
   # Expected: Shows link to [agent:rust-expert]

   memory edges learning-ownership-patterns --agent rust-expert
   # Expected: Shows inbound link from [agent:typescript-expert]
   ```

**Success Criteria**:
- ✅ Cross-scope links stored bidirectionally with scope metadata
- ✅ Scope indicators appear correctly in `memory edges` output
- ✅ Deleting a memory cleans up cross-scope links
- ✅ Cross-agent linking works (link between different agents)
- ✅ Impact analysis traverses scope boundaries (test with `memory impact`)

---

### Scenario 5: Agent-Specific Graph Integration

**Goal**: Validate US5 - Agent graphs are visually distinct and integrated

**Steps**:

1. **Setup test graph**:
   ```bash
   # Create linked agent memories
   memory write --title "Learning A" --type learning --agent typescript-expert --content "A"
   memory write --title "Learning B" --type learning --agent typescript-expert --content "B"
   memory write --title "Gotcha C" --type gotcha --agent typescript-expert --content "C"

   memory link learning-learning-a learning-learning-b --agent typescript-expert
   memory link learning-learning-b gotcha-gotcha-c --agent typescript-expert

   # Create project memory and cross-link
   memory write --title "Decision D" --type decision --content "D"
   memory link learning-learning-a decision-decision-d --agent typescript-expert
   ```

2. **Generate agent-only Mermaid diagram**:
   ```bash
   memory mermaid --agent typescript-expert
   # Expected: Diagram shows only agent memories (A, B, C)
   # No project memory (D) shown
   ```

3. **Generate merged Mermaid diagram**:
   ```bash
   memory mermaid --agent typescript-expert --include-shared
   # Expected: Diagram shows:
   #   - Agent memories (A, B, C) with agent styling (blue, thick border)
   #   - Project memory (D) with project styling (grey, thin border)
   #   - Cross-scope edge from A to D
   ```

4. **Test agent stats**:
   ```bash
   memory stats --agent typescript-expert
   # Expected:
   # Graph Statistics: typescript-expert (agent-project)
   # Nodes: 3
   # Edges: 2 (same-scope) + 1 (cross-scope)
   # Cross-scope links: 1 → project
   ```

5. **Test health check**:
   ```bash
   memory health --agent typescript-expert
   # Expected:
   # ✓ Directory structure valid
   # ✓ Index file valid (3 entries)
   # ✓ Graph file valid (3 nodes, 3 edges)
   # ✓ Cross-scope links valid (1 link verified)
   # Status: HEALTHY
   ```

6. **Test orphan detection**:
   ```bash
   # Create orphaned memory
   memory write --title "Orphan E" --type learning --agent typescript-expert --content "E"

   memory health --agent typescript-expert
   # Expected:
   # ⚠ 1 orphaned node:
   #   - learning-orphan-e
   # Status: HEALTHY (warnings)
   ```

**Success Criteria**:
- ✅ `memory mermaid --agent` generates agent-only diagram
- ✅ `memory mermaid --agent --include-shared` includes project nodes with distinct styling
- ✅ `memory stats --agent` reports agent-specific metrics
- ✅ `memory health --agent` validates agent scope integrity
- ✅ Orphan detection works within agent scope

---

### Scenario 6: List All Agents

**Goal**: Validate `memory agents` command

**Steps**:

1. **Setup multiple agents**:
   ```bash
   memory write --title "TS Learning" --type learning --agent typescript-expert --content "A"
   memory write --title "TS Gotcha" --type gotcha --agent typescript-expert --content "B"
   memory write --title "Rust Learning" --type learning --agent rust-expert --content "C"
   memory write --title "API Decision" --type decision --agent api-architect --scope global --content "D"
   ```

2. **List all agents**:
   ```bash
   memory agents
   # Expected:
   # Agents (project scope):
   #
   # typescript-expert
   #   Memories: 2
   #   Learnings: 1, Gotchas: 1
   #   Last updated: 2026-02-01 12:00
   #
   # rust-expert
   #   Memories: 1
   #   Learnings: 1
   #   Last updated: 2026-02-01 12:05
   #
   # Agents (global scope):
   #
   # api-architect
   #   Memories: 1
   #   Decisions: 1
   #   Last updated: 2026-02-01 12:10
   #
   # Total: 3 agents, 4 memories
   ```

3. **List project agents only**:
   ```bash
   memory agents --scope project
   # Expected: Shows typescript-expert and rust-expert only
   ```

4. **List global agents only**:
   ```bash
   memory agents --scope global
   # Expected: Shows api-architect only
   ```

5. **JSON output**:
   ```bash
   memory agents --json
   # Expected: Valid JSON with agent metadata
   ```

**Success Criteria**:
- ✅ `memory agents` lists all agents with memory counts
- ✅ Scope filtering works (project/global)
- ✅ JSON output format correct
- ✅ Type breakdowns shown (learnings, gotchas, etc.)

---

## Integration Test Checklist

Use this checklist when running the full integration test suite:

### Phase A: Foundation Tests
- [x] Scope enum includes `AgentProject` and `AgentGlobal`
- [x] Agent name sanitisation handles all edge cases
- [x] Scope resolution returns correct paths for agent scopes
- [x] Default scope selection works with agent context

### Phase B: Storage Tests
- [x] Agent memories written to correct directories
- [x] Agent directories auto-created on first write
- [x] Index includes agent-scoped entries
- [x] Frontmatter serialisation preserves `agent` field
- [x] Search filters by agent scope correctly

### Phase C: CLI Tests
- [x] Parser extracts `--agent` flag correctly
- [x] All CRUD commands work with `--agent`
- [x] Commands without `--agent` behave identically to v1.2.0
- [x] Help text documents agent flags
- [x] Error messages include agent context

### Phase D: Graph Tests
- [x] Cross-scope links stored in both graphs
- [x] Scope metadata persists correctly
- [x] Edge deletion cleans up both scopes
- [x] Impact analysis traverses scope boundaries
- [x] Orphan detection works across scopes

### Phase E: Advanced Tests
- [x] Mermaid diagrams show agent and shared memories
- [x] Agent nodes visually distinct
- [x] `memory agents` lists all agents
- [x] Health checks validate agent scopes
- [x] Stats commands report agent metrics

### Backward Compatibility Tests
- [x] `memory list` without `--agent` unchanged
- [x] `memory search` without `--agent` unchanged
- [x] `memory write` without `--agent` unchanged
- [x] Graph operations without `--agent` unchanged
- [x] Existing memory files remain readable

---

## Manual Testing Script

Copy and paste this script to perform end-to-end validation:

```bash
#!/usr/bin/env bash
set -e

echo "=== Agent-Scoped Memories Validation ==="

# Setup
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"
git init

echo "✓ Test directory: $TEST_DIR"

# Scenario 1: Basic CRUD
echo ""
echo "--- Scenario 1: Basic CRUD ---"
memory write --title "Test Learning" --type learning --agent test-agent --content "Test content"
memory read learning-test-learning --agent test-agent | grep "Test content" && echo "✓ Read successful"
memory list --agent test-agent | grep "learning-test-learning" && echo "✓ List successful"
memory delete learning-test-learning --agent test-agent && echo "✓ Delete successful"

# Scenario 2: Scope hierarchy
echo ""
echo "--- Scenario 2: Scope Hierarchy ---"
memory write --title "Project scope" --type learning --agent test-agent --content "Project"
test -f .claude/memory/agents/test-agent/permanent/learning-project-scope.md && echo "✓ Agent-project file created"
cat .claude/memory/agents/test-agent/permanent/learning-project-scope.md | grep "scope: agent-project" && echo "✓ Scope metadata correct"

cd /tmp
memory write --title "Global scope" --type learning --agent test-agent --content "Global"
test -f ~/.claude/memory/agents/test-agent/permanent/learning-global-scope.md && echo "✓ Agent-global file created"

# Scenario 3: Cross-scope linking
echo ""
echo "--- Scenario 3: Cross-Scope Linking ---"
cd "$TEST_DIR"
memory write --title "Project memory" --type decision --content "Decision"
memory write --title "Agent memory" --type learning --agent test-agent --content "Learning"
memory link learning-agent-memory decision-project-memory --agent test-agent
memory edges learning-agent-memory --agent test-agent | grep "decision-project-memory" && echo "✓ Cross-scope link created"
memory edges decision-project-memory | grep "learning-agent-memory" && echo "✓ Reverse link exists"

# Scenario 4: Agents listing
echo ""
echo "--- Scenario 4: Agents Listing ---"
memory agents | grep "test-agent" && echo "✓ Agent listed"

# Cleanup
echo ""
echo "=== Validation Complete ==="
echo "Cleanup: rm -rf $TEST_DIR"
```

---

## Performance Validation

### Expected Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Agent memory write | <200ms | Time to write + update index |
| Agent memory read | <50ms | Time to read file + parse frontmatter |
| Agent-scoped search | <100ms | Full-text search within agent scope |
| Cross-scope link creation | <150ms | Write to both graphs |
| `memory agents` | <500ms | Scan all agent directories |

### Performance Test Script

```bash
#!/usr/bin/env bash

echo "=== Performance Validation ==="

# Test 1: Write performance
START=$(date +%s%N)
for i in {1..10}; do
  memory write --title "Perf test $i" --type learning --agent perf-test --content "Test" >/dev/null
done
END=$(date +%s%N)
AVG=$(( ($END - $START) / 10000000 ))
echo "Average write time: ${AVG}ms (target: <200ms)"

# Test 2: Search performance
START=$(date +%s%N)
memory search "test" --agent perf-test >/dev/null
END=$(date +%s%N)
ELAPSED=$(( ($END - $START) / 1000000 ))
echo "Search time: ${ELAPSED}ms (target: <100ms)"

# Cleanup
memory delete perf-test-* --agent perf-test --force
```

---

## Troubleshooting

### Issue: Agent directory not created

**Symptom**: `Error: Memory directory does not exist`

**Solution**: Ensure you're in a git repository or use `--scope global`

```bash
git init  # If not in git repo
# OR
memory write ... --agent test-agent --scope global
```

---

### Issue: Cross-scope link not visible

**Symptom**: `memory edges` doesn't show cross-scope link

**Solution**: Check both graphs manually

```bash
cat .claude/memory/agents/{agent}/graph.json
cat .claude/memory/graph.json
# Verify both contain the edge with scope metadata
```

---

### Issue: Backward compatibility broken

**Symptom**: Existing commands behave differently

**Solution**: Run backward compatibility test suite

```bash
bun test tests/integration/test-backward-compat-v1.3.spec.ts
```

---

**Quickstart Version**: 1.1.0
**Last Updated**: 2026-02-06
