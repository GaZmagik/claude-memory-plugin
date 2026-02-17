---
id: decision-copyagent-reuses-export-import-pipeline
title: copyAgent reuses export/import pipeline instead of direct copying
type: decision
scope: project
project: claude-memory-plugin
created: "2026-02-05T11:35:35.216Z"
updated: "2026-02-16T22:30:07.305Z"
tags:
  - architecture
  - agent-operations
  - code-reuse
  - project
---

Instead of implementing direct file copy logic, copyAgent delegates to the proven export/import infrastructure. This ensures graph relationships are preserved (includeGraph: true), metadata is maintained, and merge strategies are consistent. Reduces code duplication and leverages existing test coverage.
