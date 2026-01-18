---
id: retro-test-subprocess-hanging
title: "Retrospective: Full Test Suite Runs Hang Indefinitely"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-16"
updated: "2026-01-16T13:52:25.786Z"
tags:
  - retrospective
  - process
  - testing
  - subprocess
  - bun
  - dangling-process
severity: high
---

# Retrospective: Full Test Suite Runs Hang Indefinitely

## What Happened

During this session, a `bun test hooks/` command hung for ~1 hour before being manually killed. Investigation revealed:

- Tests in `hooks/post-tool-use/memory-context.spec.ts` spawn actual hook subprocess processes
- These subprocesses have 5-second timeouts but aren't properly cleaned up
- Without explicit timeout wrapper, main test process waits indefinitely for dangling children
- Full test suite run consumed 89.5% CPU with 60+ tests timing out

## Root Cause

Tests use `executeHook()` helper that spawns child processes via `execFile()`. When subprocess times out:
1. Child process killed, but test continues waiting
2. Dangling process remains until test timeout
3. Running `bun test` without `--timeout` flag = tests wait forever
4. No explicit cleanup of subprocess resources

## Prevention

**When running tests in future sessions:**

1. **Always use explicit path**: `bun test hooks/` not `bun test` (prevents pulling entire suite)
2. **Always add timeout flag**: `bun test --timeout 5000` (fails fast instead of hanging)
3. **Use timeout wrapper**: `timeout 60 bun test hooks/ --timeout 5000` (safety net)
4. **Log output to file**: `... 2>&1 | tee /tmp/test-output.log` (enables post-mortem if hangs)
5. **Check for dangling processes**: `ps aux | grep bun` after test runs

## Why This Matters

- Full test runs are untrustworthy without these safeguards
- CI/CD would timeout silently (hung process = 0 exit code often)
- Blocks iteration velocity - we lost ~1 hour this session

## Better Approach Going Forward

Run targeted test files instead of full suite:
```bash
bun test skills/memory/src/think/discovery.spec.ts --timeout 5000
bun test hooks/src/session/spawn-session.spec.ts --timeout 5000
```

Only run full suite when explicitly testing all targets with CI-style timeout wrapper.
