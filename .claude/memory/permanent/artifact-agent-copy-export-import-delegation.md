---
id: artifact-agent-copy-export-import-delegation
title: Agent copy via export-import delegation pattern
type: artifact
scope: project
project: claude-memory-plugin
created: "2026-02-04T19:59:08.407Z"
updated: "2026-02-16T22:30:07.541Z"
tags:
  - pattern
  - agent-operations
  - reuse
  - export-import
  - project
---

Agent copy operation delegates to existing export/import functions rather than reimplementing directory operations. Pattern: validate source exists → export all memories → create target directory → import memories. Reduces duplication and leverages tested code paths.
