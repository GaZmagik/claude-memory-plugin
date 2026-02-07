---
id: artifact-phase-f-agent-operations-module
title: "Phase F: Agent Operations Module - Create, Delete, Copy, Rename"
type: artifact
scope: project
created: "2026-02-05T11:35:40.873Z"
updated: "2026-02-05T11:35:40.873Z"
tags:
  - phase-f
  - agent-operations
  - architecture
  - project
---

Complete agent lifecycle management implementation with confirmation utilities, dry-run support, and force flags. 18 new files (9 implementation + 9 tests), 88 new tests, all passing. Key pattern: operations validate → check existence → dry-run check → execute. Reuses export/import for copy operation.
