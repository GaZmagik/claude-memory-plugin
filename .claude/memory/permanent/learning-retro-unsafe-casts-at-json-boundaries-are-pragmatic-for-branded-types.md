---
id: learning-retro-unsafe-casts-at-json-boundaries-are-pragmatic-for-branded-types
title: Retro - Unsafe casts at JSON boundaries are pragmatic for branded types
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-18T04:25:29.940Z"
updated: "2026-02-01T22:38:06.321Z"
tags:
  - retrospective
  - process
  - typescript
  - project
severity: medium
---

When implementing branded types, the optimal strategy is concentrating unsafe casts at JSON parsing boundaries (frontmatter.ts, index.ts, sync.ts) where data comes from trusted internal sources. Use type-safe generators at creation points (generateId returns MemoryId directly). This pattern keeps the majority of the codebase type-safe while being pragmatic about deserialization boundaries.
