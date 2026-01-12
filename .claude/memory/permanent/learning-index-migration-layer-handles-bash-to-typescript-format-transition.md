---
type: learning
title: Index Migration Layer Handles Bash-to-TypeScript Format Transition
created: "2026-01-12T20:40:14.596Z"
updated: "2026-01-12T20:40:14.596Z"
tags:
  - typescript
  - migration
  - index
  - backward-compatibility
  - memory-plugin
  - project
scope: project
---

Added migration layer in loadIndex() that handles legacy bash index.json format (absolute file paths) converting to TypeScript format (relative relativePath). Prevents TypeError when bash-created indexes are loaded. Fallback constructs path from ID.
