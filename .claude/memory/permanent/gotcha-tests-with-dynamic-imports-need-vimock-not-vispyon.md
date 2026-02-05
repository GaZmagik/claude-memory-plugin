---
id: gotcha-tests-with-dynamic-imports-need-vimock-not-vispyon
title: Tests with dynamic imports need vi.mock not vi.spyOn (OUTDATED)
type: gotcha
scope: project
created: "2026-02-05T11:44:20.189Z"
updated: "2026-02-05T11:44:20.189Z"
tags:
  - testing
  - vitest
  - dynamic-import
  - mocking
  - project
  - outdated
---

**STATUS: SUPERSEDED by Phase F findings (2026-02-05)**

## Original Finding (INCOMPLETE)

When code uses dynamic imports like `await import('node:fs')`, static `vi.spyOn(fs, 'method')` won't work because it's a different module instance. Use `vi.mock('node:fs', () => ({ ... }))` at module level instead.

## Phase F Resolution (Proven)

This understanding was based on incomplete testing. Module-level vi.mock() DOES technically work for dynamic imports but **creates catastrophic global test pollution** that affects all subsequent test files in the suite.

**The correct solution** (proven by eliminating 22 test failures):

```typescript
it('test', async () => {
  const fs = await import('node:fs');
  vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  // test code
});

afterEach(() => vi.restoreAllMocks());
```

vi.spyOn() with afterEach cleanup works perfectly for dynamic imports and avoids global pollution.

## Why This Matters

Using module-level vi.mock() to fix a perceived vi.spyOn() limitation causes a much worse problem: global state that persists across all test files, making 20+ tests fail mysteriously in full suite while passing in isolation.

## Related

- learning-fixed-all-test-pollution-20-failures-eliminated-by-removing-fs-mock
- learning-retro-mock-replacement-pattern-inline-spyon-with-aftereach-cleanup
- gotcha-retro-module-level-vimock-creates-unfixable-global-test-pollution
