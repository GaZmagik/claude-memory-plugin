---
id: gotcha-async-function-declarations-with-only-sync-operations-mislead-callers
title: Async function declarations with only sync operations mislead callers
type: gotcha
scope: project
created: "2026-01-25T20:51:29.469Z"
updated: "2026-01-25T20:51:29.469Z"
tags:
  - typescript
  - async
  - providers
  - gotcha
  - v1.1.0
  - project
---

During v1.1.0 provider implementation, marking functions as async when they perform no actual async operations (no await, no Promise returns) creates confusion for callers who expect async behaviour. Removes timeout protection and makes error handling unintuitive. Always match function signature to actual operation: sync functions for sync work, async only when genuinely awaiting operations.
