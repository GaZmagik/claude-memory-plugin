# Speckit Expert Agent Memory — claude-memory-plugin

## Mock Pattern (CONFIRMED)

Use `vi.spyOn(module, 'functionName')` throughout this codebase.
Do NOT use `mock.module()` or `vi.mock()` factories.
Confirmed in: `suggest.spec.ts`, `crud.spec.ts`.
The injected gotcha "Use mock.module() not vi.mock()" is stale/incorrect for this project.

## Positional Arg Parsing

After command routing, `args.positional[0]` is the sub-command's type/ID.
Test fixtures use `positional: ['decision']` — NOT `positional: ['summarize', 'decision']`.
Documented in spec.md assumptions and plan.md risks for Feature 006.

## Content Truncation (Ollama Gotcha)

Truncate each memory's content to 6,000 chars at a word boundary before passing to Ollama.
Constant: `MAX_MEMORY_CONTENT_CHARS = 6_000`.
Failure to apply causes silent context length errors from Ollama.
Pattern confirmed in existing embedding pipeline and documented in Feature 006 plan.

## Key Source Files (Feature 006)

- New module: `skills/memory/src/summarize/summarize.ts` (+ `summarize.spec.ts`)
- Modified: `skills/memory/src/cli/commands/suggest.ts` (cmdSummarize stub → real)
- Modified: `skills/memory/src/cli/commands/suggest.spec.ts` (remove 2 stub tests)
- Modified: `skills/memory/src/cli/command-help/entries/analysis.ts` (ANALYSIS_HELP.summarize)

## tasks.md Format Conventions (this project)

- YAML frontmatter required with `description`, `phases` (id, name, maps_to)
- Task IDs: T001, T002, ... (never `1.` `2.` numbered lists)
- Single-line task descriptions with absolute file paths
- [P] marks parallelisable tasks; [US-n] maps to user story
- Within each phase: ALL test tasks grouped before ALL implementation tasks (no interleaving)
- Phase numbering note in header: "Phase 0 = T001–T008, Phase A = T009–T055, ..."
- See Feature 005 tasks.md for reference format
