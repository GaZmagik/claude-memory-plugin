---
id: learning-typescript-nouncheckedindexedaccess-requires-defensive-coding-for-record-access
title: TypeScript noUncheckedIndexedAccess requires defensive coding for Record access
type: learning
scope: project
project: claude-memory-plugin
created: "2026-02-24T07:59:24.952Z"
updated: "2026-02-24T07:59:32.832Z"
tags:
  - typescript
  - strict-mode
  - testing
  - patterns
  - project
---

With noUncheckedIndexedAccess: true, Record<K, T>[key] returns T | undefined. Use non-null assertions (!), ?? fallbacks, or casts (as string) to narrow types in tests with typed expect() matchers.
