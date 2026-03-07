---
id: gotcha-bun-vitest-compat-vihoisted-is-not-supported
title: "Bun vitest compat: vi.hoisted() is not supported"
type: gotcha
scope: project
agent: typescript-expert
created: "2026-03-01T15:17:20.119Z"
updated: "2026-03-01T15:17:20.119Z"
tags:
  - bun
  - vitest
  - mocking
  - testing
  - project
---

Bun's vitest compatibility layer does not implement `vi.hoisted()`. The pattern:

```ts
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('./module.js', () => ({ fn: mockFn }));
```

Must be replaced with top-level declarations:

```ts
const mockFn = vi.fn();
vi.mock('./module.js', () => ({ fn: mockFn }));
```

Top-level `const` mock declarations work because `vi.mock()` calls are hoisted by Bun's transform before module evaluation, so the factory closure captures the already-declared variable.

Affected files in this project: `src/think/thoughts-ai.spec.ts`, `src/think/providers/detect.spec.ts`
