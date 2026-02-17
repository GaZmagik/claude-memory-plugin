---
id: learning-agent-path-structure-consistency-across-tests-and-implementation
title: Agent path structure consistency across tests and implementation
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T19:58:28.974Z"
updated: "2026-02-16T22:30:07.574Z"
tags:
  - testing
  - path-resolution
  - agent-operations
  - gotcha
  - project
---

Tests must match implementation path expectations: agent directories live at projectRoot/.claude/memory/agents/[name]/ not projectRoot/agents/. Mismatch causes silent test failures when checking directory existence and file creation.
