---
id: retro-mock-syntax-friction-bun
title: Bun vi.mock requires factory functions - causes friction with auto-generated tests
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T19:16:09Z
updated: 2026-01-11T19:16:11Z
tags: ["retrospective","process","testing","bun"]
embedding: "c65b16dba543f2b1c8241a9cbc3f8ad6"
links: []
---

When generating test files for TypeScript/Bun projects, the mock syntax differs from expectations. Bun's vi.mock() requires factory functions, not just module paths. Sub-agent generated broken mocks that needed manual sed cleanup. Future: clarify mock requirements upfront or detect Bun vs Vitest differences, or accept that placeholder tests use expect(true).toBe(true) without mocks.
