---
id: learning-integration-test-import-paths-must-match-export-locations-verify-before-test-writing
title: Learning - Integration test import paths must match export locations; verify before test writing
type: learning
scope: project
created: "2026-02-05T16:12:10.568Z"
updated: "2026-02-05T16:12:10.568Z"
tags:
  - retrospective
  - process
  - integration-tests
  - imports
  - code-navigation
  - project
severity: medium
---

Mermaid integration tests (T107, T108) initially imported cmdMermaid from non-existent 'cli/commands/mermaid.js'. The command actually exists in 'cli/commands/graph.ts' alongside other graph operations (cmdLink, cmdUnlink, cmdEdges, cmdGraph, cmdMermaid, cmdRemoveNode). Lesson: For integration tests that call CLI commands, verify the actual export location in the command dispatcher before writing test imports. This prevents tests from failing on import before even running. Pattern: grep for 'export.*cmd<CommandName>' to find actual location.
