---
id: learning-retro-restoring-original-implementation-pattern-when-changes-break-tests
title: Retro - Restoring original implementation pattern when changes break tests
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-04T22:43:19.379Z"
updated: "2026-02-16T22:30:07.510Z"
tags:
  - retrospective
  - process
  - design
  - implementation
  - project
severity: medium
---

When implementing a fix that breaks an existing test, check the original implementation in git history. My change to import.ts replaced linkMemories with direct graph manipulation—the test expected linkMemories calls. Restoring the original approach fixed it. Key insight: existing tests encode design contracts. If you break them with a 'better' approach, the original way likely had good reasons. Check git history before assuming your approach is superior.
