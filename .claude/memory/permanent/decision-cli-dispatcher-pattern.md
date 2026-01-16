---
id: decision-cli-dispatcher-pattern
title: CLI Dispatcher Architecture Pattern
type: permanent
scope: project
project: claude-memory-plugin
created: "2026-01-12T15:46:00Z"
updated: "2026-01-16T23:10:44.609Z"
tags:
  - architecture
  - decision
  - cli
  - design
---

# Decision: CLI Dispatcher Pattern for Memory Skill

## Pattern

Mirror the shell `memory.sh` dispatcher architecture:

1. **Single Entry Point** (`src/cli.ts`) with shebang: `#!/usr/bin/env bun`
2. **Command Registry** (`src/cli/index.ts`): Record<string, CommandHandler> mapping command names to handlers
3. **Argument Parser** (`src/cli/parser.ts`): Handles `--flag value`, `--boolean`, positional args, stdin JSON
4. **Response Envelope** (`src/cli/response.ts`): Consistent JSON output `{status, message, data}`
5. **Command Handlers** (`src/cli/commands/*.ts`): Parse args, call library functions, return CliResponse

## Benefits

- Mirrors existing shell patterns → familiar to users
- Testable: Each handler is a pure function(ParsedArgs) → Promise<CliResponse>
- Extensible: New commands = new handler function + registry entry
- Consistent: All commands follow same request/response patterns

## Implementation Notes

- Help text moved to `src/cli/help.ts` (not inline)
- Each command handler uses common `parseScope()` and `getResolvedScopePath()` utilities
- Handlers delegate to library functions, don't duplicate logic
- Two-level commands (e.g., `think create`) handled by subcommand dispatcher in handler

## Rationale

The shell implementation proved this pattern works at scale (36+ commands). Replicating it in TypeScript ensures:
- Predictable behavior across implementations
- Users can use same syntax whether shell or TypeScript
- Easier to port remaining shell commands
