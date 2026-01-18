---
id: gotcha-test-missing-savegraph-mock-corrupted-production-graph
title: Test missing saveGraph mock corrupted production graph
type: gotcha
scope: project
created: "2026-01-18T03:07:00.851Z"
updated: "2026-01-18T03:07:00.851Z"
tags:
  - gotcha
  - testing
  - mock-isolation
  - data-corruption
  - cli-tests
  - critical
  - project
severity: critical
---

# Test Missing saveGraph Mock Corrupted Production Graph

## The Bug

`src/cli/commands/graph.spec.ts` test 'removes node from graph and returns stats' mocked `loadGraph` and `removeNode` but NOT `saveGraph`. When the test ran:

1. `loadGraph` returned mocked test data
2. `removeNode` returned `{ version: 1, nodes: ['other'], edges: [] }`
3. `saveGraph` was NOT mocked - called real implementation
4. Real `saveGraph` wrote test garbage to production `graph.json`

## Impact

- 302 edges wiped
- 219 nodes replaced with `['other']`
- Every test run corrupted production data
- Silently destroyed graph connectivity

## Root Cause

CLI command tests that modify state need ALL I/O mocked, not just reads. The pattern is insidious because:
- Test passes (mock returns expected shape)
- No error messages
- Corruption happens silently in background
- Only discovered when graph commands fail or curator reports 0 edges

## Fix

Added `vi.spyOn(structureModule, 'saveGraph').mockResolvedValue(undefined)` to the test.

## Prevention

1. Review all CLI command tests for unmocked I/O operations
2. Consider adding CI check that graph.json hasn't changed after test runs
3. Tests modifying persistent state should use temp directories, not mocks of path resolution
4. Add assertion that saveGraph was called to catch missing mocks earlier
