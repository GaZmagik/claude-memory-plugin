---
id: learning-fixed-all-test-pollution-20-failures-eliminated-by-removing-fs-mock
title: "Fixed all test pollution: 20 failures eliminated by removing fs mock"
type: learning
scope: project
created: "2026-02-05T08:51:24.010Z"
updated: "2026-02-05T08:51:24.010Z"
tags:
  - test-pollution
  - vitest
  - resolved
  - phase-f
  - fs-mock
  - project
severity: high
---

## Problem Solved

**All 2,380 tests now pass** - eliminated 20 test failures caused by module-level fs mock pollution.

## Root Cause Identified

**File:** `src/cli/commands/graph.spec.ts` (lines 15-18)

**Polluting code:**
```typescript
const mockWriteFileSync = vi.fn();
vi.mock('node:fs', () => ({
  default: { writeFileSync: mockWriteFileSync },
  writeFileSync: mockWriteFileSync,
}));
```

**Impact:**
- Module-level `vi.mock()` is hoisted and affects ALL subsequent test files
- Mock only provided `writeFileSync`, leaving all other fs functions undefined
- When copy.spec.ts tried to use `readFileSync`, `mkdirSync`, `existsSync` → undefined
- Result: 20 test failures in copy.spec.ts (ENOENT errors, memoriesCopied: 0)

## Solution Applied

1. **Removed module-level vi.mock('node:fs')** entirely
2. **Replaced with inline spies** in the 2 tests that needed it:
   ```typescript
   const fs = await import('node:fs');
   const writeFileSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
   ```
3. Inline spies are automatically cleaned up by `afterEach(() => vi.restoreAllMocks())`

## Investigation Process

1. Started with 22 failures
2. Removed `vi.mock('../core/export.js')` from boundary.spec.ts → 20 failures
3. Binary search through 26 CLI test files
4. Identified graph.spec.ts as source
5. Fixed inline → **0 failures**

## Test Results

**Before:**
- 2,360 pass, 22 fail

**After:**
- 2,380 pass, 0 fail

## Key Learnings

1. **NEVER use module-level vi.mock()** - creates unfixable global pollution
2. **Always use inline vi.spyOn()** with proper cleanup in afterEach
3. **Mocking node:fs is especially dangerous** - breaks all filesystem operations globally
4. **Test failures in full suite but not isolation = pollution**
5. **Binary search through test files** is effective for finding pollution sources

## Related Gotchas

- gotcha-vi-mock-global-pollution-details
- learning-test-pollution-investigation-copyspects-failures-reduced-from-22-to-20
