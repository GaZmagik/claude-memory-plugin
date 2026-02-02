---
id: gotcha-retro-vitest-mockinstance-type-casting-requires-unknown-intermediate
title: Retro - Vitest MockInstance type casting requires unknown intermediate
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-17T06:54:14.248Z"
updated: "2026-02-01T22:38:06.235Z"
tags:
  - retrospective
  - typescript
  - vitest
  - test-patterns
  - project
severity: medium
---

console.log spyOn creates MockInstance with [message?: any] signature but test code expects MockInstance<unknown[], unknown>. TypeScript won't allow direct assignment even though functionally equivalent. Workaround: needs intermediate 'as unknown' cast. Document this pattern or create utility type wrapper.
