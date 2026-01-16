---
id: learning-retro-silent-error-handlers-hide-type-errors-from-typescript
title: "retro: Silent error handlers hide type errors from TypeScript"
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-13T22:26:46.311Z"
updated: "2026-01-16T13:44:26.637Z"
tags:
  - retrospective
  - process
  - type-safety
  - project
---

The EmbeddingProvider type mismatch went undetected because errors were caught in try-catch blocks with graceful degradation. Type safety is only effective if errors propagate or are logged explicitly. Review all error handlers for silent suppression—use fail-fast for type-related errors.
