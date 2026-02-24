---
id: gotcha-syncmemories-projectroot-path-mismatch-in-integration-tests
title: syncMemories projectRoot path mismatch in integration tests
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-24T07:59:24.445Z"
updated: "2026-02-24T07:59:32.838Z"
tags:
  - testing
  - path-resolution
  - integration-tests
  - t147
  - project
---

syncMemories(basePath) sets projectRoot: basePath, so rule/reminder discovery files must live under basePath, not in a parent temp directory. Validation errors mask the deeper path discovery issue.
