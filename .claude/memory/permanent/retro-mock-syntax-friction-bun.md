---
id: retro-mock-syntax-friction-bun
title: Bun vi.mock requires factory functions - causes friction with auto-generated tests
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-11T19:16:09Z"
updated: "2026-01-12T22:02:47.184Z"
tags:
  - retrospective
  - process
  - testing
  - bun
links:
  - learning-test-isolation-bun-mock-module
  - retro-duplicate-test-discovery
---

When generating test files for TypeScript/Bun projects, the mock syntax differs from expectations. Bun's vi.mock() requires factory functions, not just module paths. Sub-agent generated broken mocks that needed manual sed cleanup. Future: clarify mock requirements upfront or detect Bun vs Vitest differences, or accept that placeholder tests use expect(true).toBe(true) without mocks.
