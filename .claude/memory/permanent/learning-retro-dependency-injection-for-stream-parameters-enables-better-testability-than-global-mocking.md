---
id: learning-retro-dependency-injection-for-stream-parameters-enables-better-testability-than-global-mocking
title: Retro - Dependency injection for stream parameters enables better testability than global mocking
type: learning
scope: project
created: "2026-01-17T10:26:50.501Z"
updated: "2026-01-17T10:26:50.501Z"
tags:
  - retrospective
  - process
  - testing
  - architecture
  - project
severity: medium
---

Instead of trying to mock read-only process.stdin, refactored readStdin() and parseHookInput() to accept optional AsyncIterable input parameter. This approach: (1) avoids read-only global issues, (2) makes the dependency explicit in function signatures, (3) is cleaner in tests, and (4) improves code clarity. Pattern: prefer parameters over global mocking for testability.
