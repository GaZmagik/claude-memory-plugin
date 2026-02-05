---
id: learning-retro-mock-replacement-pattern-inline-spyon-with-aftereach-cleanup
title: "Retro - Mock replacement pattern: inline spyOn with afterEach cleanup"
type: learning
scope: project
created: "2026-02-05T11:34:46.527Z"
updated: "2026-02-05T11:34:46.527Z"
tags:
  - retrospective
  - process
  - testing
  - vitest
  - refactoring
  - project
severity: medium
---

When refactoring module-level vi.mock() to fix test pollution:

Before (broken):
```typescript
vi.mock('node:fs', () => ({ writeFileSync: mockFn }));
```

After (working):
```typescript
it('test', async () => {
  const fs = await import('node:fs');
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  // test code
});

afterEach(() => vi.restoreAllMocks());
```

Key insight: Inline spyOn() combined with afterEach cleanup ensures tests are isolated. The vi.restoreAllMocks() automatically cleans up each spy after the test.

This pattern is reusable across all Vitest test files and prevents global pollution.
