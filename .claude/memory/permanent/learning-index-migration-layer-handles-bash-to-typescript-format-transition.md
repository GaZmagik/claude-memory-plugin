---
id: learning-index-migration-layer-handles-bash-to-typescript-format-transition
title: Index Migration Layer Handles Bash-to-TypeScript Format Transition
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:40:14.596Z"
updated: "2026-01-12T22:02:47.178Z"
tags:
  - typescript
  - migration
  - index
  - backward-compatibility
  - memory-plugin
  - project
---

Added migration layer in loadIndex() that handles legacy bash index.json format (absolute file paths) converting to TypeScript format (relative relativePath). Prevents TypeError when bash-created indexes are loaded. Fallback constructs path from ID.
