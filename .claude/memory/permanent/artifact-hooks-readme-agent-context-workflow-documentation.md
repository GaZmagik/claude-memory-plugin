---
id: artifact-hooks-readme-agent-context-workflow-documentation
title: "hooks/README.md: Agent context injection workflow documentation"
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-06T08:03:22.907Z"
updated: "2026-02-16T22:30:06.923Z"
tags:
  - phase-f
  - documentation
  - hooks
  - agent-context
  - developer-guide
  - project
---

Comprehensive hook developer guide covering: hook architecture overview, current hook events (PreToolUse, PostToolUse, PreCompact, SessionEnd), agent_context placeholder field, performance constraints (36ms budget within 50ms hook limit), hook event behaviour matrix for agent context, gotcha injection priority order, error handling strategy, future extension points. Serves as reference for Phase G integration work and future hook developers.
