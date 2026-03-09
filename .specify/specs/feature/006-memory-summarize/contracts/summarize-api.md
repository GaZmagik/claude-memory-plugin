# Contract: memory summarize CLI Interface

**Feature**: 006-memory-summarize
**Version**: v1.8.0
**Date**: 2026-03-07

---

## CLI Invocation Contract

### Syntax

```
memory summarize [<type>] [--mode <mode>] [--scope <scope>] [--agent <name>]
                 [--include-shared] [--all-agents] [--tags <tags>]
                 [--limit <n>] [--timeout <ms>]
```

### Arguments

| Argument | Position | Type | Description |
|----------|----------|------|-------------|
| `<type>` | `positional[0]` | `string` (optional) | Filter by memory type. One of: `decision`, `learning`, `gotcha`, `artifact`, `breadcrumb`, `hub`, `rule`, `reminder`. Ignored when `--mode digest` is active. |
| `<id>` | `positional[0]` | `string` (optional) | Memory ID to summarise. Only used when `--mode digest` is active. Mutually exclusive with type filter semantics. |

**Disambiguation**: When `--mode digest` is set, `positional[0]` is the memory ID. When `--mode digest` is not set, `positional[0]` is the type filter. Both occupy the same position; the active mode determines interpretation.

### Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--mode <mode>` | `string` | `'per-type'` | Output mode. One of: `per-type`, `overview`, `digest`. |
| `--scope <scope>` | `string` | `'project'` | Memory scope. One of: `project`, `global`, `local`, `agent-project`, `agent-global`. |
| `--agent <name>` | `string` | — | Agent namespace to summarise from. |
| `--include-shared` | `boolean` | `false` | Include project/global memories alongside agent memories. Requires `--agent`. |
| `--all-agents` | `boolean` | `false` | Summarise across all registered agent namespaces. |
| `--tags <tags>` | `string` | — | Comma-separated tag filter. Memories must match ALL specified tags. |
| `--limit <n>` | `number` | `50` | Maximum memories to collect before summarising. `0` or negative is treated as no limit. |
| `--timeout <ms>` | `number` | `120000` | Per-`generate()` call timeout in milliseconds. |

### Flag Validation Rules

| Rule | Condition | Response |
|------|-----------|----------|
| `--include-shared` requires `--agent` | `includeShared && !agentName` | `error`: `'--include-shared requires --agent flag. Specify which agent scope to search from.'` |
| `--mode digest` requires positional ID | `mode === 'digest' && !positional[0]` | `error`: `'digest mode requires a memory ID as a positional argument'` |
| Invalid memory ID in digest mode | `readMemory()` returns `status: 'error'` | `error`: `'Memory not found: <id>'` |
| `--all-agents` takes precedence over `--agent` | `allAgents && agentName` | No error — `--all-agents` wins, `--agent` is silently ignored |

---

## TypeScript Function Contract

### `summarize.ts` — exported function

```typescript
// File: skills/memory/src/summarize/summarize.ts

export type SummarizeMode = 'per-type' | 'overview' | 'digest';

export interface FallbackListing {
  id: string;
  type: string;           // MemoryType value
  title: string;
  tags: string[];
}

export interface SummarizeResult {
  /** Per-type mode: map of type name → prose summary */
  summaries?: Record<string, string>;
  /** Overview or digest mode: single prose summary string */
  summary?: string;
  /** Fallback path (Ollama unavailable): structured listing */
  memories?: FallbackListing[];
  /** IDs of every memory that contributed to this result */
  memoriesIncluded: string[];
  /** Set when Ollama is unavailable; explains why LLM was skipped */
  hint?: string;
}

export interface SummarizeRequest {
  basePaths: string[];
  mode: SummarizeMode;
  typeFilter?: string;      // MemoryType string value
  digestId?: string;
  tags: string[];
  limit: number;
  timeoutMs: number;
  contextWindow: number;
  agentName?: string;
}

export async function summarize(request: SummarizeRequest): Promise<SummarizeResult>;
```

### `suggest.ts` — updated handler signature (unchanged externally)

```typescript
// File: skills/memory/src/cli/commands/suggest.ts

export async function cmdSummarize(args: ParsedArgs): Promise<CliResponse>;
```

The handler:
1. Extracts flags: `mode`, `scope`, `agent`, `include-shared`, `all-agents`, `tags`, `limit`, `timeout`.
2. Validates `--include-shared` via `validateIncludeShared()`.
3. Validates `--mode digest` requires a positional ID.
4. Resolves `basePaths` (one or more paths via helpers).
5. Calls `summarize(request)` from `summarize.ts`.
6. Wraps result in `success(result, 'Summarize complete')` or propagates `error()`.

---

## Internal Function Contracts (summarize.ts)

### `buildChunks(memories: MemoryContent[], chunkBudgetChars: number): SummaryChunk[]`

Splits a flat list of memory contents into chunks where each chunk's accumulated `content.length` stays at or below `chunkBudgetChars`. Greedy sequential packing (not bin-packing — simple and predictable).

**Invariants**:
- Each `SummaryChunk.memories` is non-empty.
- Each `SummaryChunk.totalChars <= chunkBudgetChars`.
- A single memory larger than `chunkBudgetChars` occupies its own chunk (cannot happen in practice after 6,000-char truncation).
- The order of memories across chunks is preserved (same order as input).

### `truncateContent(content: string, maxChars: number): string`

Truncates `content` to at most `maxChars` characters at a word boundary.

```
if content.length <= maxChars → return content unchanged
else → find last space before maxChars, slice, append ' [...]'
```

If no space exists before `maxChars` (pathological case), hard-slice at `maxChars`.

### `buildPrompt(memories: MemoryContent[], mode: SummarizeMode, typeLabel?: string): string`

Assembles the LLM prompt for a single `generate()` call.

**per-type prompt template**:
```
Summarise the following [typeLabel] memories into a concise paragraph for a developer agent.
Focus on key decisions, patterns, and actionable insights.

Memories:
[For each memory: "## <title>\n<content>\n"]

Write a single paragraph summary:
```

**overview prompt template**:
```
Summarise the following project memories into a single paragraph for a developer agent.
Cover all types: decisions made, lessons learned, and pitfalls to avoid.

Memories:
[For each memory: "## <title> [<type>]\n<content>\n"]

Write a single paragraph summary:
```

**digest prompt template**:
```
Provide a detailed summary of the following memory for a developer agent.
Include the key points, context, and any actionable implications.

Memory: <title>

<content>

Write a detailed summary:
```

**reduce prompt template** (used when multiple chunks exist):
```
Merge the following partial summaries into a single coherent paragraph.
Do not repeat information; synthesise where possible.

Partial summaries:
[For each chunk summary: "- <summary>\n"]

Write a single merged summary:
```

### `mapReduceSummarize(chunks: SummaryChunk[], mode, typeLabel, timeoutMs): Promise<string>`

1. For each chunk: call `generate(buildPrompt(chunk.memories, mode, typeLabel), undefined, timeoutMs)`.
2. If exactly one chunk: return that generate result directly.
3. If multiple chunks: call `generate(buildReducePrompt(chunkSummaries), undefined, timeoutMs)` and return the result.

---

## Response Data Contract

### Success — per-type mode (Ollama available)

```json
{
  "status": "success",
  "message": "Summarize complete",
  "data": {
    "summaries": {
      "decision": "<prose paragraph>",
      "gotcha": "<prose paragraph>",
      "learning": "<prose paragraph>"
    },
    "memoriesIncluded": ["<id1>", "<id2>", "..."]
  }
}
```

### Success — overview mode (Ollama available)

```json
{
  "status": "success",
  "message": "Summarize complete",
  "data": {
    "summary": "<single prose paragraph>",
    "memoriesIncluded": ["<id1>", "<id2>", "..."]
  }
}
```

### Success — digest mode (Ollama available)

```json
{
  "status": "success",
  "message": "Summarize complete",
  "data": {
    "summary": "<detailed prose summary>",
    "memoriesIncluded": ["<id>"]
  }
}
```

### Success — Ollama unavailable (any mode)

```json
{
  "status": "success",
  "message": "Summarize complete (LLM unavailable — structured listing returned)",
  "data": {
    "memories": [
      { "id": "<id>", "type": "<type>", "title": "<title>", "tags": ["<tag>"] }
    ],
    "memoriesIncluded": ["<id>"]
  },
  "hint": "Ollama is not available. Install and start Ollama to enable LLM-powered summaries."
}
```

### Success — no memories found

```json
{
  "status": "success",
  "message": "No memories found matching the given filters",
  "data": {
    "memoriesIncluded": []
  }
}
```

### Error — validation failure

```json
{
  "status": "error",
  "error": "<validation error message>"
}
```

---

## Invariants Enforced by Contract

1. `data.memoriesIncluded` is present in every non-error response (may be empty array).
2. `hint` is only set when Ollama is unavailable; never set in the LLM-success path.
3. `data.summaries` and `data.summary` are mutually exclusive (only one is ever present).
4. `data.memories` (fallback listing) is only present when `hint` is also present.
5. Skipped memories (failed `readMemory()` calls) are absent from `memoriesIncluded`.
6. Empty LLM responses produce an absent or empty summary block; the overall response is still `status: 'success'`.

---

## Help Entry Contract

**File**: `skills/memory/src/cli/command-help/entries/analysis.ts`

The `summarize` entry in `ANALYSIS_HELP` must be updated from its current stub to:

```typescript
summarize: {
  usage: 'memory summarize [type] [options]',
  description: 'Generate LLM-powered summary rollups of memories',
  arguments: `  [type]    Filter by memory type (decision, learning, gotcha, artifact, etc.)`,
  flags: `  --mode <mode>       Output mode: per-type (default), overview, digest
  --scope <scope>     Target scope (default: project)
  --agent <name>      Summarise agent-scoped memories
  --include-shared    Include shared scopes (requires --agent)
  --all-agents        Summarise across all agent namespaces
  --tags <tags>       Comma-separated tag filter (AND logic)
  --limit <n>         Max memories to summarise (default: 50)
  --timeout <ms>      LLM timeout per call in ms (default: 120000)`,
  examples: [
    'memory summarize',
    'memory summarize decision',
    'memory summarize --mode overview',
    'memory summarize --mode digest my-memory-id',
    'memory summarize --agent typescript-expert --include-shared',
    'memory summarize --all-agents --limit 100',
    'memory summarize gotcha --tags important --limit 10',
  ],
  notes: `  Requires Ollama running locally (uses chat model from memory.local.md).
  Falls back to structured listing when Ollama is unavailable.
  Large corpora are chunked automatically (map-reduce) to fit the context window.
  Content per memory is truncated at 6000 chars to prevent context length errors.`,
},
```
