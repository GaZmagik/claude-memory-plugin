# Research: Memory Summarize Command (v1.8.0)

**Feature**: 006-memory-summarize
**Branch**: `feature/006-memory-summarize`
**Date**: 2026-03-07
**Status**: Complete — all decisions resolved in exploration phase

---

## Decision 1: LLM Integration — Use Existing Ollama Service Directly

**Chosen**: `generate()` and `isAvailable()` from `skills/memory/src/services/ollama.ts`, called directly with no wrapper.

**Rationale**: The constitution (P5: Simplicity & YAGNI) explicitly bans abstraction layers with only one implementation. `ollama.ts` already exposes the exact surface needed: `generate(prompt, model?, timeoutMs?)` with graceful error returns (empty string, stderr log), and `isAvailable()` for pre-flight availability checks. Creating a summarise-specific LLM interface would be premature abstraction.

**Alternatives Considered**:

### Option A — Custom LLM abstraction / SummariseClient
- **Pros**: Testable in isolation; swappable backend.
- **Cons**: Abstraction with a single implementation violates P5. The existing `generate()` is already mockable via `vi.spyOn`. Rejected.

### Option B — HTTP fetch to Ollama directly (bypass service layer)
- **Pros**: None.
- **Cons**: Duplicates the timeout handling, error handling, and model resolution already in `ollama.ts`. Rejected.

---

## Decision 2: Module Boundary — New `summarize/` Directory

**Chosen**: Implement business logic in `skills/memory/src/summarize/summarize.ts`. The CLI handler `cmdSummarize` in `suggest.ts` delegates to this module, following the exact same pattern as `suggest/suggest-links.ts` ↔ `cmdSuggestLinks`.

**Rationale**: `suggest.ts` currently houses two unrelated commands. Growing it further by inlining the summarise logic would push it past the 500-line threshold and violate single-responsibility. The `suggest/` directory provides a clean precedent: business logic lives there, the CLI handler is a thin adapter. A `summarize/` directory mirrors this cleanly.

**Alternatives Considered**:

### Option A — Inline logic in suggest.ts
- **Pros**: No new files.
- **Cons**: `suggest.ts` would become a multi-responsibility monolith. Rejected.

### Option B — Add to an existing `analysis/` or `core/` directory
- **Pros**: Fewer directories.
- **Cons**: `core/` is for CRUD primitives (read, write, list, delete). Summarisation is a higher-level operation. `analysis/` does not exist. Rejected.

---

## Decision 3: Token Estimation — Character-Count Heuristic

**Chosen**: `Math.floor(charCount / 4)` as the token estimate. The chunk budget is `contextWindow * 4 * CHUNK_BUDGET_RATIO` characters, where `CHUNK_BUDGET_RATIO = 0.6`.

**Rationale**: The default `context_window` is 16,384 tokens. At 4 chars/token the budget is ~39,321 chars per chunk — enough to hold 30–50 average memories (~800 chars each) in a single chunk. For the vast majority of real-world invocations, no chunking will be needed at all. The ±20% inaccuracy of the heuristic at this scale is absorbed by the 40% headroom reserved for the prompt template and model output.

**Alternatives Considered**:

### Option A — `tiktoken` (OpenAI tokeniser)
- **Pros**: More accurate for English text.
- **Cons**: Wrong model family (Llama/Gemma use different BPE vocabulary). Adds an npm dependency. Rejected.

### Option B — `llama-tokenizer-js`
- **Pros**: Closer to the actual tokeniser.
- **Cons**: npm dependency; overkill at 16k token scale; would require bundling. Rejected.

---

## Decision 4: Chunking Strategy — Map-Reduce

**Chosen**: Two-phase map-reduce:
- **Phase 1 (map)**: Split memory content into chunks capped at `contextWindow * 4 * 0.6` characters. Summarise each chunk independently via `generate()`.
- **Phase 2 (reduce)**: If more than one chunk was produced, call `generate()` once more with all chunk summaries concatenated, to produce the final merged summary. Single-chunk corpora skip Phase 2 entirely (one `generate()` call total).

**Rationale**: The reduce pass ensures coherent output regardless of corpus size, without requiring large-context models. Each chunk summary is 200–400 tokens at most; even 20 chunk summaries fit comfortably in a single reduce call. This pattern is proven by `suggest-links --llm-type` in the same codebase.

**Chunking applies per summary block**, not globally:
- In `per-type` mode: each type's memories are chunked and map-reduced independently.
- In `overview` mode: all memories are chunked and map-reduced together.
- In `digest` mode: single-memory content is sent directly (no chunking needed).

---

## Decision 5: Content Truncation — 6,000 Character Limit Per Memory

**Chosen**: Truncate each individual memory's content to 6,000 characters at word boundaries before including it in a chunk, consistent with the existing `truncateForEmbedding()` pattern used throughout the codebase.

**Rationale**: The injected gotcha from the memory system explicitly flags this: "Memory content exceeded the embedding model context length (6000 chars) causing failures. Truncate content to 6000 chars at word boundaries before sending to Ollama." This constraint applies equally to the generate API. The 6,000-char limit is already established and avoids the known failure mode.

**Implementation note**: Truncate at a word boundary (last space before 6,000 chars), append `[...]` when truncated. This differs from the chunk budget which operates on the accumulated total of all (already-truncated) memory contents in a chunk.

---

## Decision 6: Output Modes

**Chosen**: Three modes controlled by `--mode` flag:

| Mode | Default | Behaviour |
|------|---------|-----------|
| `per-type` | Yes | One summary block per MemoryType present in filtered set |
| `overview` | No | Single cross-type prose paragraph |
| `digest` | No | Detailed summary of one memory by ID |

**Rationale**: These modes cover the three core use cases identified in the spec (orientation, MEMORY.md drafting, and deep-dive on a single memory) without over-engineering. The `--mode` flag name is consistent with other tools' conventions.

**Digest mode ID resolution**: Positional argument — `memory summarize --mode digest <id>`. Matches the `memory read <id>` convention. When `--mode digest` is active, `positional[0]` is treated as the memory ID, not a type filter, even if it looks like a type name.

---

## Decision 7: Default Limit — 50

**Chosen**: `--limit 50` as the default, applied to `listMemories()` before content reading.

**Rationale**: 50 memories at ~800 chars each = ~40,000 chars, which fits within a single 60%-budget chunk for the default 16,384-token context window. The default thus makes single-chunk operation the common case, keeping latency predictable. Users who override the limit accept the consequence of chunked (multi-call) summarisation.

---

## Decision 8: LLM Timeout — 120,000ms Per Call

**Chosen**: 120,000ms per `generate()` call, overridable via `--timeout <ms>`.

**Rationale**: Positioned between the `quality --deep` command (60,000ms for single-memory assessment) and `suggest-links --llm-type` (300,000ms for bulk edge processing). Summarisation is a medium-complexity LLM operation — more content than quality assessment, less concurrency than bulk edge processing.

---

## Decision 9: Fallback Behaviour — Structured Listing With Hint

**Chosen**: When `isAvailable()` returns `false`, return `{ id, type, title, tags }` per memory in `data.memories`, with no `data.summaries`, and a non-empty `hint` field on the `CliResponse` envelope explaining that LLM summarisation was skipped.

**Rationale**: Matches the plugin's contract that read operations never fail due to Ollama absence. The hint mechanism is already defined in `CliResponse` (`hint?: string`). The structured listing provides useful information even without LLM processing.

---

## Decision 10: Scope and Agent Flag Handling

**Chosen**: Mirror `cmdQuery` and `cmdSuggestLinks` exactly:
- `validateIncludeShared()` → return error if `--include-shared` is used without `--agent`
- Single-scope: `resolveAgentScopePath()` if `--agent`, else `getResolvedScopePath(parseScope(scopeStr))`
- Multi-scope with `--include-shared`: `resolveSharedScopePaths(agentName, scopeStr)` — collect and deduplicate memories across all paths
- `--all-agents`: Use `discoverAgents()` from `core/agent-discovery.ts` to enumerate agent directories, then collect from each

**Rationale**: Consistency with every other read command. No new scope resolution logic needed.

---

## Open Questions

None. All design questions resolved during exploration (see exploration file).

---

## Key Risk: Positional Argument Parsing in Tests

The gotcha from the exploration file is critical: **`positional` arrays in CLI tests must reflect the actual parsed structure from `parseArgs`**.

When the CLI router dispatches `cmdSummarize`, it strips the command name. So `memory summarize decision` results in `args.positional = ['decision']` (not `['summarize', 'decision']`). Test fixtures must use `positional: ['decision']` for the type argument, and `positional: []` for no type filter.

For `--mode digest <id>`, the positional is `['<id>']` — the mode flag is a flag, not a positional.

---

## Key Risk: Security Constraints for Scope Resolution

Per the gotcha `gotcha-retro-define-security-constraint-scope-before-implementation`: security constraints for scope resolution must be documented in comments before implementation, not discovered after.

In `summarize.ts`:
- `basePath` is always resolved via `resolveAgentScopePath()` or `getResolvedScopePath()`, never from user-supplied strings directly
- `readMemory()` already validates path traversal — no additional validation needed in the summarise module
- `listMemories()` is index-backed — the index is already path-validated on write
- Content sent to `generate()` is user-authored memory content, not shell commands — no injection risk
- Memory IDs in digest mode are validated by `readMemory()` returning `status: 'error'` for invalid/missing IDs
