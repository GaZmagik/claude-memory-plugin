---
type: artifact
title: "Per-command help system: registry pattern with command-specific documentation"
created: "2026-01-12T20:03:10.869Z"
updated: "2026-01-12T20:03:10.869Z"
tags:
  - cli
  - help
  - design-pattern
  - project
scope: project
---

## Pattern

Created centralized help registry (`src/cli/command-help.ts`) with structured metadata for all 36 CLI commands. Each command entry contains: usage, description, arguments, flags, examples, subcommands, notes.

## Implementation

```typescript
interface CommandHelpEntry {
  usage: string;
  description: string;
  arguments?: string;
  flags?: string;
  examples?: string[];
  subcommands?: string;
  notes?: string;
}

const COMMAND_HELP: Record<string, CommandHelpEntry> = { ... };
export function getCommandHelp(command: string): string | undefined
```

## Integration

- `dispatch()` checks `--help` flag and routes to command-specific help
- `help <command>` subcommand queries registry
- Falls back to generic help for unknown commands
- 15 tests covering formatting, validation, completeness

## Scalability

Adding help for new commands requires only one entry in COMMAND_HELP registry. No router modifications. All 36 commands now have comprehensive, discoverable help.
