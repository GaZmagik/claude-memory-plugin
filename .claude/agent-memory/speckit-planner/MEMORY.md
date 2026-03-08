# Speckit Planner — Project Memory

## Project: claude-memory-plugin

### Test Mocking Pattern (CRITICAL)
All spec files in this project use `vi.spyOn(module, 'functionName')` — NOT `mock.module()` and NOT `vi.mock()`.
Confirmed in: `crud.spec.ts`, `suggest.spec.ts`, `query.spec.ts`.
The task generator must enforce this pattern for all new spec files.

### Test File Convention
- Spec files use `.spec.ts` suffix (NOT `.test.ts`)
- Located alongside source files (e.g., `summarize/summarize.ts` → `summarize/summarize.spec.ts`)
- Integration tests live in `skills/memory/tests/integration/`

### Content Truncation Gotcha (CRITICAL)
Always truncate memory content to 6,000 chars at word boundaries before sending to Ollama.
This applies to BOTH embedding generation AND `generate()` calls.
Failure to truncate causes context length errors in Ollama.
Pattern: find last space before 6,000, slice, append ` [...]`.

### Positional Arg Parsing in Tests
When `cmdSummarize` (or any command handler) is called, the CLI router has already stripped the command name.
So `memory summarize decision` results in `args.positional = ['decision']` NOT `['summarize', 'decision']`.
Test fixtures must reflect the post-routing positional array.

### Module Pattern: suggest/ ↔ suggest.ts
Business logic lives in `src/suggest/suggest-links.ts`.
CLI handler lives in `src/cli/commands/suggest.ts` (thin adapter).
New commands follow this pattern: `src/<feature>/<feature>.ts` + thin handler update.

### Security Comments Convention
Per gotcha `gotcha-retro-define-security-constraint-scope-before-implementation`:
Add a security comment block at the top of new modules documenting scope resolution safety,
path traversal protection, and input trust model BEFORE writing implementation.

### All-Agents Pattern
Uses `discoverAgents()` from `core/agent-discovery.ts`.
Requires `projectRoot: process.cwd()` and `globalRoot: getGlobalMemoryPath()`.
Deduplicate collected memory IDs via `Map<id, content>` before processing.

### Constitution (v1.0.0)
P1: Plugin arch compliance | P2: TDD non-negotiable | P3: GitHub flow
P4: Observability | P5: Simplicity/YAGNI | P6: SemVer
Key gate: P5 bans abstraction layers with single implementations.
