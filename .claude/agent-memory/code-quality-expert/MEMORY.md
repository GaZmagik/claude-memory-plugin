# Code Quality Expert - Memory

## Project: claude-memory-plugin
- TypeScript plugin for Claude Code memory management
- Runtime: Bun
- Test framework: Bun test (vitest-compatible API)
- Core modules: skills/memory/src/ (CLI, core, graph, think, bulk, search, maintenance, scope, quality)
- Hook modules: hooks/ (session-start, session-end, pre-tool-use, post-tool-use, user-prompt-submit)
- Uses branded types for MemoryId, ThinkId, SessionId (zero-runtime-cost nominal typing)
- Uses `interface` throughout despite CLAUDE.md saying "Always use TypeScript" (project standard seems to be interface-based)
- Enums are used for MemoryType, Scope, Severity, ThinkStatus, ThoughtType, EdgeType
- Error handling pattern: never-throw functions returning {status, error} response objects
- Logging: custom prefixed logger (logger.ts) writing to stderr
- File I/O: atomic writes via temp file + rename pattern

## Key Patterns Observed
- Agent scope resolution is duplicated across write.ts, read.ts, search.ts, delete.ts, semantic-search.ts
- stdin reading has duplicated cleanup/timeout logic in parser.ts (readStdinJson vs readStdinRaw)
- CI environment detection is duplicated between hint-output.ts and interactive-prompt.ts
- `pathExists` helper is duplicated between hooks (memory-context.ts and user-prompt-submit/memory-context.ts)
- Graph is loaded twice in write.ts (line 408 and line 471)
