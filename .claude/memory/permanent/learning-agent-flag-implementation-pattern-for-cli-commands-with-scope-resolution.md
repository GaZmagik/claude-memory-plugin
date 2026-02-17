---
id: learning-agent-flag-implementation-pattern-for-cli-commands-with-scope-resolution
title: Agent flag implementation pattern for CLI commands with scope resolution
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-05T16:55:05.531Z"
updated: "2026-02-16T22:30:07.149Z"
tags:
  - phase-e
  - cli-implementation
  - agent-scoping
  - project
---

Implement --agent flag support by parsing with getFlagString, then use resolveAgentScopePath helper to get the correct agent-scoped memory path. Pass agent name and optional scope to generateMermaid via options.agent. Include --include-shared flag to control whether non-agent memories are included in filtered diagrams.
