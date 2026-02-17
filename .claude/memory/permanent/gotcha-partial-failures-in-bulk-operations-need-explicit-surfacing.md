---
id: gotcha-partial-failures-in-bulk-operations-need-explicit-surfacing
title: Partial failures in bulk operations need explicit surfacing
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-02-07T18:33:43.032Z"
updated: "2026-02-16T22:30:07.480Z"
tags:
  - error-handling
  - testing
  - agent-operations
  - project
---

Delete operation was silently catching errors during memory file cleanup (console.error only). Extended DeleteAgentResponse type to include failures array. Now returns {status, deleted, failed} tuple so caller can distinguish success from partial failure - critical for observability.
