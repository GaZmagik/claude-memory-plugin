---
id: learning-orphaned-test-files-are-legitimate-integration-specs
title: orphaned-test-files-are-legitimate-integration-specs
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-23T12:16:41.901Z"
updated: "2026-02-23T12:16:50.920Z"
tags:
  - project
---

Many 'orphaned' test files in TypeScript projects aren't actually orphaned - they're legitimate cross-scope integration specs (e.g., guard-validation, include-shared, cross-scope-edges). They test feature behaviour across multiple source modules. Don't assume file-level parity failure means the tests should be deleted.
