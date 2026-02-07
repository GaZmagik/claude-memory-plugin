---
id: learning-agent-path-structure-consistency-across-tests-and-implementation
title: Agent path structure consistency across tests and implementation
type: learning
scope: project
created: "2026-02-04T19:58:28.974Z"
updated: "2026-02-04T19:58:28.974Z"
tags:
  - testing
  - path-resolution
  - agent-operations
  - gotcha
  - project
---

Tests must match implementation path expectations: agent directories live at projectRoot/.claude/memory/agents/[name]/ not projectRoot/agents/. Mismatch causes silent test failures when checking directory existence and file creation.
