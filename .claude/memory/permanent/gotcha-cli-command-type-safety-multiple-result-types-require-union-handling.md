---
id: gotcha-cli-command-type-safety-multiple-result-types-require-union-handling
title: "CLI command type safety: multiple result types require union handling"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-21T12:23:20.135Z"
updated: "2026-02-21T12:24:05.794Z"
tags:
  - project
---

CLI commands (crud.ts, query.ts) use multiple result types (MemorySummary, SearchResult, SemanticSearchResultItem). Simple 'any[]' replacement requires union types or separate handlers per command. Skip quick fixes; design proper result interface hierarchy first.
