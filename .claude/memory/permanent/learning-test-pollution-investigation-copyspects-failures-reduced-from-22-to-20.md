---
id: learning-test-pollution-investigation-copyspects-failures-reduced-from-22-to-20
title: "Test pollution investigation: copy.spec.ts failures reduced from 22 to 20"
type: learning
scope: project
created: "2026-02-04T23:28:44.981Z"
updated: "2026-02-04T23:28:44.981Z"
tags:
  - test-pollution
  - vitest
  - copy-spec
  - debugging
  - phase-f
  - project
severity: high
---

## Investigation Summary

**Problem**: 21-22 tests in copy.spec.ts fail in full suite but pass in isolation with error "Failed to export from source: undefined" or "memoriesCopied: 0".

## Root Cause

**Module-level vi.mock() creates global persistent pollution** that affects all subsequent test files:
- vi.mock() is hoisted to top of file before any imports
- Cannot be undone with vi.restoreAllMocks() or vi.doUnmock()
- Persists across all test files in the suite

## Fixes Applied

1. **Removed vi.mock() from boundary.spec.ts** (lines 16-26)
   - Was mocking '../core/export.js' with empty memories array
   - Replaced with comment explaining why removed
   - Result: **22 failures → 20 failures**

2. **Pollution source narrowed to src/cli directory**
   - Running src/core + copy.spec.ts: 0 failures
   - Running src/cli + copy.spec.ts: 10 failures
   - Specific file not yet identified (binary search inconclusive)

## Current Status

- **All copy.spec.ts tests (15/15) pass in isolation**
- **20 failures remain in full suite** (dry-run tests showing memoriesCopied: 0)
- **2 boundary.spec.ts failures** (cmdExport tests timeout with real exportMemories)

## Next Steps

**Option 1: Continue investigation**
- Identify remaining pollution source in src/cli
- Likely another vi.mock() or vi.spyOn() without proper cleanup

**Option 2: Pragmatic workaround**
- Add `.only` to copy.spec.ts for focused testing
- Run copy tests separately in CI/CD
- Document known pollution issue

**Option 3: Refactor to avoid pollution**
- Convert module-level mocks to inline vi.spyOn() calls
- Use vi.doMock() instead of vi.mock() (not hoisted)
- Isolate tests with proper beforeEach/afterEach cleanup

## Key Learnings

- **Never use module-level vi.mock()** - creates global pollution
- **Use vi.spyOn() with afterEach cleanup** for better isolation
- **Test files in src/cli are primary pollution source**
- **Vitest test order affects pollution propagation**
