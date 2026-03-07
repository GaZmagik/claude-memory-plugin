# Feature Specification: Memory Summarize Command

**Feature Branch**: `feature/006-memory-summarize`
**Feature ID**: 006
**Version**: v1.8.0
**Created**: 2026-03-07
**Status**: Draft

---

## Overview

The `memory summarize` command transforms the existing stub in `suggest.ts` into a fully working
LLM-powered summarisation tool. It digests stored memories — filtered by type, scope, agent, and
tags — into human-readable prose rollups via the existing Ollama service.

The primary use case is rapid orientation: a Claude agent or human operator needs to understand what
decisions have been made, what has been learned, and what pitfalls exist in a project or agent
memory corpus — without reading every individual memory file. A secondary use case is MEMORY.md
drafting: producing concise prose that can be injected into an agent's system prompt.

The command must degrade gracefully when Ollama is unavailable, returning a structured listing of
memory titles and types with a clear hint that LLM summarisation was skipped. It must respect the
configured `context_window` setting and support the same scope and agent flags used by every other
read command in the system.

---

## User Scenarios & Testing

### User Story 1 — LLM Summary Grouped by Memory Type (Priority: P1)

A Claude agent invokes `memory summarize` against the current project scope. The command collects
all memories, groups them by type (decision, learning, gotcha, artifact, etc.), and calls the
Ollama service to produce one prose paragraph per type present. The response is a JSON envelope
containing a summary per type and a list of all memory IDs that were included.

**Why this priority**: This is the core capability the feature exists to deliver. All other stories
extend or constrain this baseline. Without it, there is no useful feature.

**Independent Test**: Can be fully tested by mocking `listMemories()`, `readMemory()`, and
`generate()` — confirming that one summary block is produced per type in the collected set, and
that `memoriesIncluded` lists the IDs of every memory read.

**Acceptance Scenarios**:

1. **Given** a project scope containing decision, learning, and gotcha memories, **When** the
   operator runs `memory summarize`, **Then** the response contains three summary blocks — one per
   type — each with at least one prose paragraph, and `memoriesIncluded` lists all memory IDs that
   were read.
2. **Given** a project scope containing only learning memories, **When** the operator runs
   `memory summarize`, **Then** the response contains exactly one summary block (for `learning`)
   and `memoriesIncluded` lists only learning memory IDs.
3. **Given** an empty memory scope, **When** the operator runs `memory summarize`, **Then** the
   response status is `success`, the message indicates no memories were found, and
   `memoriesIncluded` is an empty array.
4. **Given** a type argument is provided (`memory summarize decision`), **When** the command runs,
   **Then** only decision-type memories are collected, summarised, and included in
   `memoriesIncluded`.

---

### User Story 2 — Graceful Degradation When Ollama is Unavailable (Priority: P1)

When the Ollama service cannot be reached, the command must not fail. It returns a structured
listing of `{ id, type, title, tags }` for each collected memory, along with a `hint` field on the
`CliResponse` envelope explaining that LLM summarisation was skipped.

**Why this priority**: The plugin's contract is that core read operations never fail due to Ollama
absence. Summarise must honour this contract — otherwise it becomes unreliable in air-gapped or
unconfigured environments.

**Independent Test**: Can be fully tested by mocking `isAvailable()` to return `false` —
confirming that the response contains the structured listing and a non-empty `hint` field, with no
call to `generate()`.

**Acceptance Scenarios**:

1. **Given** Ollama is unavailable, **When** the operator runs `memory summarize`, **Then** the
   response status is `success`, `data.summaries` is absent (or empty), `data.memories` contains a
   structured listing of `{ id, type, title, tags }` for each collected memory, and `hint` is set
   to a message explaining that LLM is unavailable.
2. **Given** Ollama is unavailable and the `--limit` flag is applied, **When** the command runs,
   **Then** the fallback listing respects the limit and `memoriesIncluded` reflects only the
   memories in the listing.
3. **Given** Ollama becomes available between invocations, **When** the operator re-runs
   `memory summarize`, **Then** the LLM summary is produced normally (no stale degradation state).

---

### User Story 3 — Overview Mode: Single Cross-Type Summary (Priority: P2)

The operator passes `--mode overview`. The command collects all memories (subject to filters),
flattens them across types, and produces a single prose paragraph summarising the entire corpus.

**Why this priority**: Useful for MEMORY.md generation and executive orientation, but not the
primary interaction pattern. Can be deferred without losing core value.

**Independent Test**: Can be tested independently by confirming the response contains exactly one
`summary` string (not a per-type map) when `--mode overview` is supplied.

**Acceptance Scenarios**:

1. **Given** a project scope with memories of multiple types, **When** the operator runs
   `memory summarize --mode overview`, **Then** the response contains a single prose summary string
   spanning all types, and `memoriesIncluded` lists all contributing memory IDs.
2. **Given** `--mode overview` is combined with a type positional argument
   (`memory summarize decision --mode overview`), **When** the command runs,
   **Then** the single summary covers only decision memories.

---

### User Story 4 — Digest Mode: Focused Single-Memory Summary (Priority: P2)

The operator passes `--mode digest <id>`. The command reads the single memory identified by `<id>`,
sends its full content to Ollama, and returns a detailed prose summary of that memory alone.

**Why this priority**: Useful for understanding a long or dense memory in detail. Lower priority
because `memory read <id>` already surfaces raw content — digest is a convenience enhancement.

**Independent Test**: Can be tested independently by mocking `readMemory()` for a specific ID and
confirming the response summary describes that memory's content, with `memoriesIncluded` containing
exactly that one ID.

**Acceptance Scenarios**:

1. **Given** a valid memory ID, **When** the operator runs `memory summarize --mode digest <id>`,
   **Then** the response contains a detailed prose summary of that memory's content and
   `memoriesIncluded` contains only `<id>`.
2. **Given** an invalid or non-existent memory ID, **When** the operator runs
   `memory summarize --mode digest <id>`, **Then** the response status is `error` with a clear
   message that the memory was not found.
3. **Given** `--mode digest` is used without a positional ID argument, **When** the command runs,
   **Then** the response status is `error` with a message explaining that an ID is required for
   digest mode.

---

### User Story 5 — Agent-Scoped Summarisation (Priority: P2)

The operator passes `--agent <name>` to summarise memories from a specific agent namespace. With
`--all-agents`, the command summarises across all registered agent namespaces.

**Why this priority**: Consistent with the agent-scope model used by list, query, search, and
suggest-links. Required for agent-centric workflows but not the default invocation.

**Independent Test**: Can be tested independently by mocking `resolveAgentScopePath()` and
confirming the correct base path is used for the `listMemories()` call.

**Acceptance Scenarios**:

1. **Given** an agent `typescript-expert` with decision and gotcha memories, **When** the operator
   runs `memory summarize --agent typescript-expert`, **Then** only memories from that agent's
   namespace are collected and summarised.
2. **Given** multiple registered agents each with memories, **When** the operator runs
   `memory summarize --all-agents`, **Then** memories from all agent namespaces are collected,
   summarised across the combined corpus, and `memoriesIncluded` lists all contributing IDs.
3. **Given** `--agent <name>` and `--include-shared`, **When** the command runs, **Then** the
   agent's namespace memories and the shared project/global memories are both included in the
   collected set.
4. **Given** `--include-shared` is used without `--agent`, **When** the command runs, **Then** the
   response status is `error` with the standard validation message used by other commands.

---

### User Story 6 — Context Window Chunking (Priority: P2)

When the total character count of collected memory content exceeds 60% of the configured
`context_window` (estimated at 4 characters per token), the command splits the corpus into chunks,
summarises each chunk independently (map phase), then merges the chunk summaries in a second
generate call (reduce phase).

**Why this priority**: Prevents silent truncation or Ollama errors for large corpora. Important for
correctness but only visible in edge cases with many or long memories.

**Independent Test**: Can be tested independently by constructing a synthetic memory corpus that
exceeds the character budget and confirming that `generate()` is called more than once (once per
chunk, plus one for the reduce pass if multiple chunks exist).

**Acceptance Scenarios**:

1. **Given** a corpus whose total content exceeds the context window budget, **When** summarise
   runs, **Then** the corpus is split into chunks each fitting within the budget, each chunk is
   summarised independently, and the chunk summaries are merged in a final generate call.
2. **Given** a corpus that fits within a single chunk, **When** summarise runs, **Then** exactly
   one generate call is made (no reduce pass).
3. **Given** a readMemory() call fails for one memory (e.g. file deleted since indexing), **When**
   the command runs, **Then** that memory is skipped with a warning to stderr, the remaining
   memories are summarised normally, and the skipped ID is absent from `memoriesIncluded`.

---

### User Story 7 — Limit and Tag Filtering (Priority: P3)

The operator uses `--limit <n>` to cap the number of memories before summarising, and `--tags
<tag1,tag2>` to filter by tags. The default limit is 50.

**Why this priority**: Filtering options that improve usability for large corpora but not required
for the core summarisation function to deliver value.

**Independent Test**: Can be tested independently by confirming `listMemories()` is called with the
correct `limit` and `tags` parameters derived from the CLI flags.

**Acceptance Scenarios**:

1. **Given** 100 memories exist and `--limit 10` is passed, **When** the command runs, **Then**
   only 10 memories are collected and summarised, and `memoriesIncluded` contains at most 10 IDs.
2. **Given** memories with mixed tags, **When** `--tags important,architecture` is passed,
   **Then** only memories matching those tags are collected and summarised.
3. **Given** no `--limit` flag, **When** the command runs, **Then** a default limit of 50 is
   applied to protect against unbounded I/O on large corpora.

---

### User Story 8 — Configurable LLM Timeout (Priority: P3)

The operator may pass `--timeout <ms>` to override the default per-generate-call timeout of
120,000 ms.

**Why this priority**: A convenience escape hatch for slow models or very large chunk sets. Low
priority because the default is generous and most invocations will complete well within it.

**Independent Test**: Can be tested by confirming the resolved timeout value is passed to each
`generate()` call.

**Acceptance Scenarios**:

1. **Given** `--timeout 60000` is passed, **When** the command runs, **Then** each `generate()`
   call receives `60000` as its timeout.
2. **Given** no `--timeout` flag, **When** the command runs, **Then** each `generate()` call
   receives `120000` as its default timeout.

---

### Edge Cases

- What happens when `readMemory()` fails for one memory mid-run? The failed memory is skipped
  silently (warning to stderr); the remaining memories are summarised. The skipped ID does not
  appear in `memoriesIncluded`.
- What happens when the LLM returns an empty string? The corresponding summary block is marked as
  empty or absent; the command still returns `success` with whatever partial content was produced.
- What happens when `--mode digest` is used without a positional ID? The command returns an
  `error` response immediately, before any I/O.
- What happens when `--limit 0` or a negative limit is passed? Treated as "no limit" (pass-through
  to `listMemories()` which ignores zero/negative limits), so the full corpus is collected. This
  matches existing behaviour in other commands.
- What happens when `--all-agents` is combined with `--include-shared`? The union of all agent
  namespaces and shared scopes is collected. Duplicate memory IDs (if any) are de-duplicated before
  summarisation.
- What happens when `--all-agents` is combined with `--agent`? `--all-agents` takes precedence;
  the `--agent` value is ignored. No error is raised.
- What happens when the positional arg is both a type and `--mode digest` is set? `--mode digest`
  takes precedence; the positional arg is treated as the memory ID, not a type filter.

---

## Requirements

### Functional Requirements

**Collection and Filtering**

- **FR-001**: The command MUST collect memories using `listMemories()`, applying filters for type
  (positional argument), scope (`--scope`), agent (`--agent`), and tags (`--tags`, AND logic — all
  specified tags must match).
- **FR-002**: The command MUST apply a default limit of 50 memories when no `--limit` flag is
  provided.
- **FR-003**: The command MUST read the full content of each collected memory using `readMemory()`
  before passing content to the LLM.
- **FR-004**: If `readMemory()` fails for an individual memory, the command MUST skip that memory,
  emit a warning to stderr, and continue processing the remainder.

**Output Modes**

- **FR-005**: The command MUST support three output modes via a `--mode` flag:
  - `per-type` (default): one summary block per memory type present in the filtered set.
  - `overview`: a single cross-type executive summary paragraph.
  - `digest`: a detailed summary of the single memory identified by the positional ID argument.
- **FR-006**: In `digest` mode, the command MUST return an `error` response if no positional ID
  argument is provided.
- **FR-007**: In `digest` mode, the command MUST return an `error` response if the specified
  memory ID does not exist.

**LLM Integration**

- **FR-008**: The command MUST call `isAvailable()` before any `generate()` call. If Ollama is
  unavailable, the command MUST take the fallback path (FR-012) without calling `generate()`.
- **FR-009**: The command MUST use a default per-generate-call timeout of 120,000 ms, overridable
  via `--timeout <ms>`.
- **FR-010**: When the total character count of memory content exceeds 60% of the configured
  `context_window` (estimated at 4 characters per token), the command MUST split the corpus into
  chunks and apply a map-reduce strategy:
  - Map phase: each chunk is summarised independently via `generate()`.
  - Reduce phase: chunk summaries are merged in a single final `generate()` call.
- **FR-011**: When the corpus fits within one chunk budget, the command MUST make exactly one
  `generate()` call per summary block (no unnecessary reduce pass).

**Fallback Behaviour**

- **FR-012**: When Ollama is unavailable, the command MUST return a structured listing of
  `{ id, type, title, tags }` for each collected memory, plus a `hint` field on the `CliResponse`
  envelope explaining that LLM summarisation was skipped.

**Response Format**

- **FR-013**: The command MUST emit a `CliResponse` JSON envelope with `status`, `message`, and
  `data` fields, matching the contract used by all other commands.
- **FR-014**: The `data` field MUST include a `memoriesIncluded` array listing the IDs of every
  memory that contributed to the summary (or fallback listing).
- **FR-015**: The `CliResponse` envelope MUST include a `hint` field when Ollama is unavailable
  (FR-012), and MAY omit it otherwise.

**Scope and Agent Flags**

- **FR-016**: The command MUST support `--scope`, `--agent`, `--include-shared`, and `--all-agents`
  flags, following the same resolution logic used by `cmdQuery`, `cmdSuggestLinks`, and related
  commands.
- **FR-017**: The `--include-shared` flag MUST return an `error` response when used without
  `--agent`, consistent with validation in other commands.

**Stub Replacement**

- **FR-018**: The existing stub in `cmdSummarize` (suggest.ts) MUST be replaced. No "not yet
  implemented" text must remain in the command's output.

**Help Documentation**

- **FR-019**: The help entry for `summarize` in the CLI command-help entries MUST be expanded to
  include all supported flags and at least two usage examples.

---

### Key Entities

- **SummarizeRequest**: Encapsulates the inputs to a summarisation run — filtered memory list,
  output mode, chunking budget, timeout, and agent/scope context.
- **SummarizeResult**: The output of a summarisation run — one or more summary blocks (keyed by
  type in `per-type` mode, a single string in `overview` and `digest` modes), plus
  `memoriesIncluded` array and optional `hint`.
- **SummaryChunk**: An intermediate unit of work during map-reduce — a subset of memory content
  that fits within the character budget for a single `generate()` call.
- **FallbackListing**: The structured representation returned when Ollama is unavailable —
  `{ id, type, title, tags }` per memory.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: `memory summarize` with Ollama available returns at least one prose paragraph per
  memory type present in the filtered set (per-type mode).
- **SC-002**: `memory summarize` without Ollama returns a fallback listing with a non-empty `hint`
  field; no `generate()` call is made.
- **SC-003**: `memory summarize decision` collects and summarises only decision-type memories;
  `memoriesIncluded` contains only decision memory IDs.
- **SC-004**: `memory summarize --mode overview` returns exactly one prose summary string covering
  all types in the filtered set.
- **SC-005**: `memory summarize --mode digest <id>` returns a focused prose summary of that single
  memory; `memoriesIncluded` contains exactly that one ID.
- **SC-006**: `memory summarize --agent <name>` summarises only memories from that agent's
  namespace.
- **SC-007**: `memory summarize --all-agents` summarises memories across all registered agent
  namespaces.
- **SC-008**: Every response `data` object includes a `memoriesIncluded` array (may be empty if
  no memories were found).
- **SC-009**: Memory content that exceeds the context window budget is chunked; `generate()` is
  called once per chunk in the map phase and once more in the reduce phase when multiple chunks
  exist.
- **SC-010**: All existing tests continue to pass after the stub is replaced.
- **SC-011**: The word "stub" and the phrase "not yet implemented" are absent from the
  `cmdSummarize` function and its call chain.
- **SC-012**: `memory summarize --timeout 60000` passes 60,000 ms to each `generate()` call;
  omitting `--timeout` defaults to 120,000 ms.

---

## Assumptions

- The character-count heuristic of 4 characters per token is sufficient for chunking decisions at
  the 4k–16k token scale. A dedicated tokeniser library is not required.
- The chunk budget ratio of 60% of the estimated context window capacity is a named, tunable
  constant (`CHUNK_BUDGET_RATIO = 0.6`), not a magic number.
- Summaries are ephemeral CLI output and are not persisted to disk. Caching or writing summaries as
  a new memory type is out of scope for v1.8.0.
- The default LLM timeout of 120,000 ms per `generate()` call is appropriate for summarisation
  workloads, based on comparison with the 300,000 ms used by `suggest-links --llm-type` and the
  60,000 ms used by `quality --deep`.
- Memory content sent to Ollama should be truncated at a safe character limit (consistent with the
  existing 6,000-character truncation applied in other Ollama integrations) to avoid context length
  errors per the known gotcha on embedding context length.
- The `suggest.ts` file houses both `cmdSuggestLinks` and `cmdSummarize`. The summarise logic
  itself lives in a new `skills/memory/src/summarize/summarize.ts` module, keeping the CLI handler
  thin (matching the `suggest-links.ts` pattern).
- Positional argument parsing follows the established convention: `args.positional[0]` for the
  type filter (or digest ID), `args.positional[1]` is unused. Test fixtures must use
  `positional: ['summarize']` (not `positional: ['summarize', 'decision']`) for the command
  invocation — the type argument appears as `positional[0]` of the sub-command, not at index 1 of
  the full positional array.

---

## Out of Scope

- Streaming output — the existing `CliResponse` JSON envelope does not support streaming. Streaming
  summarisation is deferred to a future version.
- Persisting summaries to disk as a new memory type — premature abstraction; adds write complexity
  and cache invalidation problems.
- A dedicated token-counting library — the character-count heuristic is sufficient.
- A hard upper limit or `--force` flag for large corpora — the `--limit 50` default is the soft
  guard; users who override it accept the consequences.
- Streaming progress indicators during long LLM calls.
- Multi-language or non-Latin text optimisation for the character-count heuristic.

---

## Dependencies

- `skills/memory/src/services/ollama.ts` — `generate()` and `isAvailable()`. No new wrapper layer
  around these functions.
- `skills/memory/src/core/list.ts` — `listMemories()` for index-based memory collection.
- `skills/memory/src/core/read.ts` — `readMemory()` for full memory content.
- `skills/memory/src/cli/helpers.ts` — `resolveAgentScopePath()`, `getResolvedScopePath()`,
  `parseScope()`, `validateIncludeShared()`, `resolveSharedScopePaths()` for scope resolution.
- `skills/memory/src/cli/response.ts` — `CliResponse`, `success()`, `error()`, `wrapOperation()`.
- `skills/memory/src/cli/command-help/entries/analysis.ts` — help entry to be expanded.

---

## Open Questions

None. All design questions from the exploration phase have been resolved:

- Digest mode ID: positional argument (`memory summarize --mode digest <id>`).
- `memoriesIncluded` array: included in every response.
- `--all-agents`: included in v1.8.0.
- Safety limit: soft limit only (`--limit 50` default, no hard cap or `--force` flag).
