---
id: learning-retro-tmpdir-cleanup-permissions-fragile
title: retro-tmpdir-cleanup-permissions-fragile
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-11T22:41:57Z
updated: 2026-01-11T22:41:59Z
tags: ["learning","tip","medium","retrospective","process","testing","edge-cases"]
embedding: "d355fde1b2a2baca6b9559b7d0a02a69"
links: []
---

# retro-tmpdir-cleanup-permissions-fragile

**Category:** tip
**Severity:** medium
**Date:** 2026-01-11

## Context

After changing file/directory permissions during tests, cleanup attempted
to remove or restore permissions on /tmp directories. The /tmp filesystem
can have restrictions that prevent chmod operations even with proper ownership

## Problem

Test fixture cleanup with fs.rmSync on /tmp faced permission issues

Three test files had afterEach failures:
- filesystem-permissions.spec.ts: EACCES on chmod 0o755 restore
- scope-resolution-edge-cases.spec.ts: Permission denied removing /tmp dirs

These weren't functional issues - the tests worked, but cleanup failed

## Solution

For permission testing:
1. Use try/finally with explicit chmod restore (done in scope tests)
2. For rmSync failures, use {force: true} and catch errors
3. Consider using dedicated test dir with fewer permission restrictions

Or accept that some permission edge cases may leave cleanup artifacts
in /tmp (cleanup failures ≠ test failures)
