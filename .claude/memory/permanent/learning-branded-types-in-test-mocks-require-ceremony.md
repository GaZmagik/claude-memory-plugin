---
id: learning-branded-types-in-test-mocks-require-ceremony
title: Branded types in test mocks require ceremony
type: learning
scope: project
project: claude-memory-plugin
created: "2026-03-08T00:35:15.151Z"
updated: "2026-03-08T00:35:38.155Z"
tags:
  - typescript
  - testing
  - branded-types
  - project
---

When working with branded types like MemoryId, every mock object ID must be wrapped with unsafeAsMemoryId(). This creates verbose test fixtures but is necessary for type safety. Multiple fix cycles were needed to address all instances.
