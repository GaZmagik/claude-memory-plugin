---
id: learning-recursive-agent-discovery
title: Recursive agent and style discovery beats hardcoded paths
type: learning
project: claude-memory-plugin
created: "2026-01-12T10:45:00.000Z"
updated: "2026-01-12T22:02:47.190Z"
tags:
  - think
  - discovery
  - architecture
  - feature-001
  - typescript
severity: medium
---

Use recursive glob pattern `**/*.md` for agent and style discovery instead of hardcoding subdirectory names.

Avoids fragility of hardcoded paths like `~/.claude/agents/specialist/` and `~/.claude/agents/speckit/`. Recursive discovery automatically finds agents in any subdirectory structure (custom folders supported).

Search priority order:
1. Local scope: `{cwd}/.claude/agents/**/*.md`
2. Global scope: `~/.claude/agents/**/*.md`
3. Enterprise scope: `{enterprisePath}/agents/**/*.md`

First match wins when same filename exists at multiple levels. Matches by basename (without .md extension).
