---
id: learning-help-system-design-centralized-registry-more-maintainable-than-scattered-help-strings
title: "Help system design: centralized registry more maintainable than scattered help strings"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:02:54.349Z"
updated: "2026-01-12T22:02:47.196Z"
tags:
  - cli
  - documentation
  - architecture
  - retro
  - project
---

## Learning: Centralized Help Registry Pattern

Implemented per-command help for 36 CLI commands using a single `COMMAND_HELP` registry object with structured metadata.

### Approach Taken
- Single file (command-help.ts) with 627 lines
- Registry maps command → {usage, description, arguments, flags, examples, notes}
- Formatter turns registry entries into readable text
- Router checks registry before falling back to generic help

### Why It Works
- Help stays synchronized with commands (single source of truth)
- Easy to audit coverage (iterate registry keys)
- Adding new command help = add one object entry
- Removing command help = delete one entry

### Trade-offs
- Large initial file, but solves DRY principle
- Alternative: scatter help strings in each command handler (increases maintenance burden)

### Takeaway
For CLI tools with many commands, centralized help registry outweighs size concerns. Keeps help in sync and auditable.
