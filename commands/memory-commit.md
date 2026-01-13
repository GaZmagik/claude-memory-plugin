---
description: Capture memories from conversation context (forked session use)
version: "1.1.0"
allowed-tools: Bash(memory:*)
---

# Memory Commit

## Context

You are a **FORKED SESSION** running the PreCompact memory capture. The main session has **already compacted and moved on**. You cannot influence it.

**Token budget**: ~45k total, conversation already loaded. Be efficient.

## CRITICAL: Do Not Reason About Main Session State

You will see conversation context that may include incomplete work, mid-task states, or TODOs. **This is irrelevant to you.** Your job is to:

1. Extract memories from what was discussed
2. Store them using memory scripts
3. **Link them to relevant hubs**
4. Exit

You are NOT responsible for:
- Whether compaction should happen
- The state of any in-progress work
- What the main session should do next
- Whether the codebase is "ready" for anything

The main session handles its own concerns. You are a historian, not an advisor. Just document and exit.

---

## Instructions

### Step 1: Scan Conversation (Mental Only)

Review the conversation you have in context. Identify **3-5 high-signal items** max:

**Worth capturing:**
- Architectural decisions with rationale
- Gotchas/bugs that cost time to debug
- Patterns that should be reused
- Non-obvious insights or surprises

**Skip:**
- Routine refactoring
- Trivial fixes
- Things already in memory
- Obvious best practices

### Step 1.5: Detect Relevant Hubs

Before creating memories, identify which hubs to link to. Run this once at the start:

```bash
# Get current branch and detect hubs
branch=$(git branch --show-current 2>/dev/null || echo "")
feature_hub=""
core_hub=""
HAS_FEATURE_HUB=false
HAS_CORE_HUB=false

# Extract feature number (e.g., feature/008-outstanding-orders-report -> 008)
if [[ "$branch" =~ ^feature/([0-9]+)- ]]; then
  feature_num="${BASH_REMATCH[1]}"
  feature_hub="artifact-feature-${feature_num}-hub"
  # Verify hub exists
  if memory read "$feature_hub" >/dev/null 2>&1; then
    HAS_FEATURE_HUB=true
    echo "Feature hub detected: $feature_hub"
  fi
fi

# Extract feature name for core hub (e.g., outstanding-orders-report -> outstanding-orders)
if [[ "$branch" =~ ^feature/[0-9]+-(.+)$ ]]; then
  feature_name="${BASH_REMATCH[1]}"
  core_name=$(echo "$feature_name" | sed 's/-report$//' | sed 's/-integration$//')
  core_hub="artifact-core-${core_name}-hub"
  # Verify hub exists
  if memory read "$core_hub" >/dev/null 2>&1; then
    HAS_CORE_HUB=true
    echo "Core hub detected: $core_hub"
  fi
fi

# Report hub status
if [[ "$HAS_FEATURE_HUB" == "false" && "$HAS_CORE_HUB" == "false" ]]; then
  echo "No hubs detected - memories will be created without hub links"
fi
```

Store these variables for use in Step 2.

### Step 2: Write Memories with Hub Links

For each item, call the appropriate memory script via Bash, then **immediately link to detected hubs**.

**Learnings** (gotchas, tips, insights):
```bash
# Create the learning (--auto-link finds semantically similar memories)
memory write --type learning --title '<title>' --content '<1-2 sentence description>' --tags '<tag1>,<tag2>' --auto-link

# Link to hubs (replace <slug> with the slugified title, e.g., "my-learning-title")
[[ "$HAS_FEATURE_HUB" == "true" ]] && memory link "learning-<slug>" "$feature_hub" "discovered-in"
[[ "$HAS_CORE_HUB" == "true" ]] && memory link "learning-<slug>" "$core_hub" "relates-to"
```

**Decisions** (architectural choices):
```bash
# Create the decision (--auto-link finds semantically similar memories)
memory write --type decision --id '<decision-id>' --content '<1-2 sentence description>' --auto-link

# Link to hubs
[[ "$HAS_FEATURE_HUB" == "true" ]] && memory link "decision-<id>" "$feature_hub" "decided-in"
[[ "$HAS_CORE_HUB" == "true" ]] && memory link "decision-<id>" "$core_hub" "affects"
```

**Artifacts** (reusable patterns):
```bash
# Create the artifact (--auto-link finds semantically similar memories)
memory write --type artifact --id '<name>' --content '<1-2 sentence description>' --auto-link

# Link to hubs
[[ "$HAS_FEATURE_HUB" == "true" ]] && memory link "artifact-<name>" "$feature_hub" "created-in"
[[ "$HAS_CORE_HUB" == "true" ]] && memory link "artifact-<name>" "$core_hub" "implements"
```

**Relation types by memory type:**

| Memory Type | To Feature Hub | To Core Hub |
|-------------|----------------|-------------|
| Learning | `discovered-in` | `relates-to` |
| Decision | `decided-in` | `affects` |
| Artifact | `created-in` | `implements` |
| Gotcha | `discovered-in` | `warns-about` |

### Step 3: Report and Exit

Output a brief summary including hub links:

```
Memory capture complete:
- X learnings (linked to artifact-feature-NNN-hub)
- Y decisions (linked to artifact-feature-NNN-hub)
- Z artifacts

[or "Nothing significant to capture" if conversation was routine]
```

---

## Guidelines

- **Be selective**: 3-5 items max. Quality over quantity.
- **Be concise**: 1-2 sentences per memory. Details can be found in git history.
- **Be specific**: "Rate calculation polluted by mileage entries" not "Found a bug"
- **Always link**: Every memory should connect to at least one hub when available.
- **No tool calls for analysis**: You already have the context. Just think and write.
- **No sub-agents**: They don't inherit your context. Do the work yourself.
- **Exit cleanly**: Don't continue previous work. Report summary and stop.
