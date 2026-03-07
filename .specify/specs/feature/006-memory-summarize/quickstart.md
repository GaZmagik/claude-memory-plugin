# Quickstart: Memory Summarize Command (v1.8.0)

**Feature**: 006-memory-summarize
**Branch**: `feature/006-memory-summarize`
**Date**: 2026-03-07
**Purpose**: Validate the implementation against the success criteria in the spec.

---

## Prerequisites

- Bun installed and `memory` linked globally (`bun link` from plugin root)
- Ollama running locally (`ollama serve`) with `gemma3:4b` (or configured `chat_model`)
- Project memory directory initialised (`.claude/memory/index.json` exists)

---

## Scenario 1: Default Per-Type Summary (SC-001)

**User Story**: US-1 — LLM Summary Grouped by Memory Type
**Success Criterion**: Returns at least one prose paragraph per memory type present.

**Setup**: Ensure the project scope has at least one `decision` and one `gotcha` memory.

**Steps**:

```bash
# 1. Verify memories exist
memory list

# 2. Run default summarise
memory summarize

# 3. Inspect response
```

**Expected outcome**:
```json
{
  "status": "success",
  "message": "Summarize complete",
  "data": {
    "summaries": {
      "decision": "<non-empty prose paragraph>",
      "gotcha": "<non-empty prose paragraph>"
    },
    "memoriesIncluded": ["<id1>", "<id2>", "..."]
  }
}
```

**Checks**:
- `status` is `"success"`
- `data.summaries` has one key per type present in the memory store
- Each value is a non-empty string
- `data.memoriesIncluded` is a non-empty array of memory IDs
- No `hint` field is present

---

## Scenario 2: Type-Filtered Summary (SC-003)

**User Story**: US-1 — Type positional argument
**Success Criterion**: Only decision-type memories are collected and summarised.

**Steps**:

```bash
memory summarize decision
```

**Expected outcome**:
- `data.summaries` has exactly one key: `"decision"`
- `data.memoriesIncluded` contains only IDs of decision-type memories
- No learning, gotcha, or other type summaries appear

---

## Scenario 3: Ollama Unavailable — Fallback Listing (SC-002)

**User Story**: US-2 — Graceful Degradation
**Success Criterion**: Returns structured listing with `hint`; no LLM call made.

**Setup**: Stop Ollama (`pkill ollama` or `systemctl stop ollama`).

**Steps**:

```bash
memory summarize
```

**Expected outcome**:
```json
{
  "status": "success",
  "data": {
    "memories": [
      { "id": "decision-abc", "type": "decision", "title": "...", "tags": [...] }
    ],
    "memoriesIncluded": ["decision-abc"]
  },
  "hint": "Ollama is not available. Install and start Ollama to enable LLM-powered summaries."
}
```

**Checks**:
- `status` is `"success"` (not `"error"`)
- `data.memories` is a non-empty array of `{ id, type, title, tags }` objects
- `hint` is a non-empty string
- `data.summaries` and `data.summary` are absent
- Restart Ollama and re-run to confirm LLM path resumes normally

---

## Scenario 4: Overview Mode (SC-004)

**User Story**: US-3 — Single Cross-Type Summary
**Success Criterion**: Returns exactly one prose summary string.

**Steps**:

```bash
memory summarize --mode overview
```

**Expected outcome**:
```json
{
  "status": "success",
  "data": {
    "summary": "<single prose paragraph covering all types>",
    "memoriesIncluded": ["<all contributing ids>"]
  }
}
```

**Checks**:
- `data.summary` is present and non-empty
- `data.summaries` is absent
- `data.memoriesIncluded` lists all memories regardless of type

---

## Scenario 5: Digest Mode — Single Memory (SC-005)

**User Story**: US-4 — Focused Single-Memory Summary
**Success Criterion**: Returns detailed prose summary of that one memory; `memoriesIncluded` contains exactly that ID.

**Setup**: Have a known memory ID (run `memory list` to find one).

**Steps**:

```bash
# Replace with a real ID from your memory store
memory summarize --mode digest decision-core-architecture-abc123
```

**Expected outcome**:
```json
{
  "status": "success",
  "data": {
    "summary": "<detailed prose summary of that memory>",
    "memoriesIncluded": ["decision-core-architecture-abc123"]
  }
}
```

**Checks**:
- `data.memoriesIncluded` contains exactly one ID matching the argument
- `data.summary` is a detailed paragraph about that specific memory
- No other memories are referenced

**Error validation** — missing ID:
```bash
memory summarize --mode digest
```
Expected: `status: "error"` with message about digest requiring an ID.

**Error validation** — invalid ID:
```bash
memory summarize --mode digest this-id-does-not-exist
```
Expected: `status: "error"` with message `"Memory not found: this-id-does-not-exist"`.

---

## Scenario 6: Agent-Scoped Summary (SC-006)

**User Story**: US-5 — Agent-Scoped Summarisation
**Success Criterion**: Only memories from the specified agent namespace are summarised.

**Setup**: Have an agent with memories (e.g., `typescript-expert`). Run `memory agents` to verify.

**Steps**:

```bash
memory summarize --agent typescript-expert
```

**Expected outcome**:
- `data.memoriesIncluded` contains only IDs from the `typescript-expert` agent scope
- No project-scope memories appear unless `--include-shared` is also passed

**With --include-shared**:
```bash
memory summarize --agent typescript-expert --include-shared
```
Expected: memories from both the agent namespace and the shared project scope are included.

**Validation error**:
```bash
memory summarize --include-shared
```
Expected: `status: "error"` — `"--include-shared requires --agent flag"`.

---

## Scenario 7: All-Agents Summary (SC-007)

**User Story**: US-5 — All-Agents Summarisation
**Success Criterion**: Memories from all registered agent namespaces are included.

**Setup**: Multiple agents with memories exist. Run `memory agents` to verify.

**Steps**:

```bash
memory summarize --all-agents
```

**Expected outcome**:
- `data.memoriesIncluded` contains IDs from multiple agent namespaces
- Summary prose covers content from multiple agents

---

## Scenario 8: Limit Flag (SC-008 / US-7)

**User Story**: US-7 — Limit and Tag Filtering
**Success Criterion**: `memoriesIncluded` contains at most N IDs when `--limit N` is applied.

**Steps**:

```bash
# First check total memory count
memory list | grep '"count"'

# Then limit to 5
memory summarize --limit 5
```

**Expected outcome**:
- `data.memoriesIncluded.length <= 5`

**Default limit check**:
```bash
# With 100+ memories, default should cap at 50
memory summarize
```
Expected: `data.memoriesIncluded.length <= 50`.

---

## Scenario 9: Tag Filtering (US-7)

**Steps**:

```bash
memory summarize --tags important
```

**Expected outcome**:
- `data.memoriesIncluded` contains only IDs of memories tagged with `"important"`
- If no memories have that tag: `data.memoriesIncluded` is `[]` and message indicates no memories found

---

## Scenario 10: Context Window Chunking (SC-009)

**User Story**: US-6 — Context Window Chunking
**Success Criterion**: `generate()` called more than once when corpus exceeds budget.

This scenario requires observation via test mocks (not easily observable via CLI alone), but a manual approximation:

**Steps**:

```bash
# With a large corpus (override limit to include many long memories)
memory summarize --limit 200 --timeout 300000
```

**Expected outcome**:
- Command completes without error
- `data.memoriesIncluded` may list up to 200 IDs
- Response time will be longer than a single-chunk run (multiple LLM calls)

**Unit test validation** (in `summarize.spec.ts`):
- Construct a corpus where accumulated content > `contextWindow * 4 * 0.6` characters
- Assert `generate()` is called more than once

---

## Scenario 11: Stub Replacement (SC-010, SC-011)

**Success Criterion**: No "not yet implemented" text remains; existing tests pass.

**Steps**:

```bash
# Run the full test suite
cd /home/gareth/.vs/claude-memory-plugin && bun test

# Specifically check the suggest command tests
bun test skills/memory/src/cli/commands/suggest.spec.ts
```

**Expected outcome**:
- All tests pass
- `suggest.spec.ts` stub tests for `cmdSummarize` are updated or replaced with real tests
- `grep "not yet implemented" skills/memory/src/cli/commands/suggest.ts` returns no output
- `grep "stub" skills/memory/src/cli/commands/suggest.ts` returns no output (in function body)

---

## Scenario 12: Custom Timeout (US-8)

**Steps**:

```bash
memory summarize --timeout 60000
```

**Expected outcome**:
- Command completes (or times out after 60s if Ollama is slow)
- No error about invalid timeout value

---

## Common Failure Modes

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| `error: "--include-shared requires --agent flag"` | Used `--include-shared` without `--agent` | Add `--agent <name>` |
| `error: "digest mode requires a memory ID"` | Forgot to pass ID with `--mode digest` | `memory summarize --mode digest <id>` |
| `error: "Memory not found: <id>"` | Invalid or missing memory ID in digest mode | Verify ID with `memory list` |
| `hint` in response | Ollama is not running | Start Ollama: `ollama serve` |
| Slow response | Large corpus with chunking | Reduce with `--limit` or increase `--timeout` |
| Empty `memoriesIncluded` | No memories match the filters | Check type/tags/scope filters |
