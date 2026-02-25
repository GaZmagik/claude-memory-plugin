---
id: gotcha-vitest-vihoisted-required-for-mock-fns-referenced-in-vimock-factories
title: vitest vi.hoisted() required for mock fns referenced in vi.mock() factories
type: gotcha
scope: project
agent: typescript-expert
created: "2026-02-25T21:26:44.813Z"
updated: "2026-02-25T21:26:44.813Z"
tags:
  - vitest
  - mocking
  - hoisting
  - bun-migration
  - project
---

## Problem
When converting from Bun's `mock.module()` to vitest's `vi.mock()`, mock functions declared at module scope cannot be referenced directly inside `vi.mock()` factory callbacks. vitest hoists `vi.mock()` calls to the top of the file before any variable declarations, so the variables are not yet initialised.

## Solution
Use `vi.hoisted()` to declare mock functions that need to be referenced inside `vi.mock()` factories:

```typescript
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn(),
}));

vi.mock('some-module', async (importOriginal) => ({
  ...(await importOriginal<typeof import('some-module')>()),
  someExport: mockFn,
}));

// Static imports work fine after vi.mock — they see the mocked module
import { something } from 'some-module';
```

## Bun → vitest conversion map
- `import { mock } from 'bun:test'` → `import { vi } from 'vitest'`
- `mock(() => value)` → `vi.fn(() => value)` (but use `vi.hoisted()` if referenced in `vi.mock()`)
- `mock.module('mod', () => ({ ... }))` → `vi.mock('mod', async (importOriginal) => ({ ...(await importOriginal()), ... }))`
- `mock.restore()` → `vi.restoreAllMocks()`
- `const mod = await import('module')` (after mock.module) → static `import * as mod from 'module'` at top
- `mock.module()` in beforeEach/test bodies (to swap behaviour) → `mockFn.mockImplementation(...)` on hoisted fns

## Key insight for mid-test mock changes
Bun's `mock.module()` can be called anywhere (beforeEach, inside tests) to swap module implementations, and `await import()` then gets the new version. In vitest, module mocks are set once. To vary behaviour per test, keep one `vi.mock()` at the top and use `mockImplementation()` to swap the behaviour of the hoisted `vi.fn()` references between tests.

## Files converted
- `hooks/src/session/fork-detection.spec.ts`
- `hooks/src/session/spawn-session.spec.ts`
- `skills/memory/src/think/thoughts-ai.spec.ts`
