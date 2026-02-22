---
id: learning-type-safety-as-any-casts-hide-real-type-guard-opportunities
title: "Type safety: as any casts hide real type guard opportunities"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-21T08:57:39.155Z"
updated: "2026-02-21T08:58:05.178Z"
tags:
  - typescript
  - type-safety
  - type-guards
  - project
---

11 `as any` casts across external-file-indexer, sync.ts, and delete.ts were masking the need for proper `ExternalGraphNode` type guard. Adding interface and type guard eliminated all unsafe casts and improved maintainability.
