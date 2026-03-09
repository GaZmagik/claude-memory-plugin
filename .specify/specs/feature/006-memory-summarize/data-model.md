# Data Model: Memory Summarize Command (v1.8.0)

**Feature**: 006-memory-summarize
**Branch**: `feature/006-memory-summarize`
**Date**: 2026-03-07

---

## Overview

The summarise feature introduces no persistent data types. All entities are ephemeral — they exist only within the lifetime of a single `memory summarize` invocation. No files are written to disk; no index or graph is modified.

---

## Entity: SummarizeRequest

**Description**: The resolved, validated input to a single summarisation run. Built by `cmdSummarize` from `ParsedArgs` after flag extraction, scope resolution, and availability checks. Passed to `summarize()` in `summarize.ts`.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `basePaths` | `string[]` | Yes | One or more resolved absolute paths to memory directories. Single-element for normal scoping; multiple for `--include-shared` or `--all-agents`. |
| `mode` | `SummarizeMode` | Yes | Output mode: `'per-type'` \| `'overview'` \| `'digest'`. |
| `typeFilter` | `MemoryType \| undefined` | No | When set, restricts collection to this type (from positional arg). Ignored in `digest` mode. |
| `digestId` | `string \| undefined` | No | Memory ID to summarise in `digest` mode. Required when `mode === 'digest'`. |
| `tags` | `string[]` | No | Tag filters (AND logic — all must match). Empty array means no tag filter. |
| `limit` | `number` | Yes | Maximum memories to collect before summarising. Default: 50. |
| `timeoutMs` | `number` | Yes | Per-`generate()` timeout in milliseconds. Default: 120,000. |
| `contextWindow` | `number` | Yes | Configured context window size in tokens (read from ollama.ts cache). Default: 16,384. |
| `agentName` | `string \| undefined` | No | Agent name, for context in error messages and index loading. |

**Derived constants** (computed from `contextWindow`, not stored as fields):

```typescript
const CHUNK_BUDGET_RATIO = 0.6;
const CHARS_PER_TOKEN = 4;
const MAX_MEMORY_CONTENT_CHARS = 6_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_LIMIT = 50;

// Derived:
const chunkBudgetChars = contextWindow * CHARS_PER_TOKEN * CHUNK_BUDGET_RATIO;
// e.g. 16384 * 4 * 0.6 = 39,321 characters per chunk
```

---

## Entity: SummarizeMode (enum)

**Description**: The three output modes supported by the `--mode` flag.

```typescript
type SummarizeMode = 'per-type' | 'overview' | 'digest';
```

| Value | CLI Flag | Behaviour |
|-------|----------|-----------|
| `'per-type'` | `--mode per-type` (default) | One summary block per `MemoryType` present in filtered set |
| `'overview'` | `--mode overview` | Single cross-type prose paragraph |
| `'digest'` | `--mode digest` | Focused summary of one memory identified by positional ID |

---

## Entity: MemoryContent

**Description**: The full content of a single memory as loaded by `readMemory()`, prepared for inclusion in a summarisation chunk. This is an intermediate representation used only within `summarize.ts`.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Memory ID (from `MemorySummary.id`) |
| `type` | `MemoryType` | Memory type (from `MemorySummary.type`) |
| `title` | `string` | Memory title (from `MemorySummary.title`) |
| `tags` | `string[]` | Memory tags (from `MemorySummary.tags`) |
| `content` | `string` | Full markdown body, truncated to 6,000 chars at word boundary if needed |

**Truncation rule**: If `content.length > MAX_MEMORY_CONTENT_CHARS`:
1. Find the last space before index 6,000.
2. Slice to that position.
3. Append `' [...]'`.
4. Log a warning to stderr: `[summarize] Content truncated for memory <id> (was <original_length> chars)`.

---

## Entity: SummaryChunk

**Description**: A subset of `MemoryContent` items whose accumulated character count fits within `chunkBudgetChars`. Used as the unit of work for the map phase of map-reduce chunking.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `memories` | `MemoryContent[]` | The memories in this chunk |
| `totalChars` | `number` | Sum of all `content.length` values in this chunk |

**Chunking invariant**: `totalChars <= chunkBudgetChars`. A single memory whose content alone exceeds the budget is placed in its own chunk (the truncation to 6,000 chars makes this scenario impossible in practice, since 6,000 < 39,321 for the default window).

---

## Entity: FallbackListing

**Description**: The structured representation returned when Ollama is unavailable. Emitted in `data.memories` of the `CliResponse`.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Memory ID |
| `type` | `MemoryType` | Memory type |
| `title` | `string` | Memory title |
| `tags` | `string[]` | Memory tags |

This is a subset of `MemorySummary` — no full content is loaded in the fallback path.

---

## Entity: SummarizeResult

**Description**: The return type of `summarize()` in `summarize.ts`. Shaped into a `CliResponse` by `cmdSummarize` in `suggest.ts`.

**Fields** (union based on mode and Ollama availability):

| Field | Type | Present when | Description |
|-------|------|-------------|-------------|
| `summaries` | `Record<string, string>` | Ollama available, mode `per-type` | Map of `MemoryType` → prose summary string |
| `summary` | `string` | Ollama available, mode `overview` or `digest` | Single prose summary |
| `memories` | `FallbackListing[]` | Ollama unavailable | Structured listing of collected memories |
| `memoriesIncluded` | `string[]` | Always | IDs of every memory that contributed to the output |
| `hint` | `string \| undefined` | Ollama unavailable | Explanation that LLM summarisation was skipped |

**TypeScript representation**:

```typescript
interface SummarizeResult {
  summaries?: Record<string, string>;   // per-type mode
  summary?: string;                     // overview or digest mode
  memories?: FallbackListing[];         // fallback path
  memoriesIncluded: string[];           // always present
  hint?: string;                        // fallback path
}
```

---

## Response Envelope (CliResponse)

The `cmdSummarize` handler wraps `SummarizeResult` in the standard `CliResponse<SummarizeResult>` envelope:

```typescript
// Success with LLM (per-type)
{
  "status": "success",
  "message": "Summarize complete",
  "data": {
    "summaries": {
      "decision": "The project has settled on...",
      "gotcha": "Key pitfalls include...",
      "learning": "Through implementation we found..."
    },
    "memoriesIncluded": ["decision-api-design-abc", "gotcha-async-cascade-def", ...]
  }
}

// Success with LLM (overview)
{
  "status": "success",
  "message": "Summarize complete",
  "data": {
    "summary": "This project has made several architectural decisions...",
    "memoriesIncluded": ["decision-api-design-abc", ...]
  }
}

// Fallback (Ollama unavailable)
{
  "status": "success",
  "message": "Summarize complete (LLM unavailable — structured listing returned)",
  "data": {
    "memories": [
      { "id": "decision-api-design-abc", "type": "decision", "title": "API Design", "tags": ["api"] }
    ],
    "memoriesIncluded": ["decision-api-design-abc"]
  },
  "hint": "Ollama is not available. Install and start Ollama to enable LLM-powered summaries."
}

// Error (digest mode, no ID)
{
  "status": "error",
  "error": "digest mode requires a memory ID as a positional argument"
}

// Empty corpus
{
  "status": "success",
  "message": "No memories found matching the given filters",
  "data": {
    "memoriesIncluded": []
  }
}
```

---

## State Transitions

No persistent state transitions. The summarise command is a pure read operation:

```
ParsedArgs
    |
    v
[Validate flags] ──error──> CliResponse(error)
    |
    v
[Resolve scope path(s)]
    |
    v
[listMemories()] ──empty──> CliResponse(success, empty memoriesIncluded)
    |
    v
[isAvailable()] ──false──> [Build FallbackListing] ──> CliResponse(success, hint)
    |
   true
    |
    v (per mode)
    |── digest ──> [readMemory(id)] ──> [generate()] ──> CliResponse(summary)
    |── overview ──> [readMemory() x N] ──> [chunk] ──> [map-reduce] ──> CliResponse(summary)
    └── per-type ──> [group by type] ──> [per-type map-reduce] ──> CliResponse(summaries)
```

---

## Constants Summary

All constants live at the top of `skills/memory/src/summarize/summarize.ts`:

```typescript
export const CHUNK_BUDGET_RATIO = 0.6;
export const CHARS_PER_TOKEN = 4;
export const MAX_MEMORY_CONTENT_CHARS = 6_000;
export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_LIMIT = 50;
```

`CHUNK_BUDGET_RATIO` and `MAX_MEMORY_CONTENT_CHARS` are exported for testability (tests can override via mock or direct reference).
