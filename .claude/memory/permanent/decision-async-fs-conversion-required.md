---
id: decision-async-fs-conversion-required
title: Async FS Conversion Required for Performance
type: decision
scope: project
created: "2026-01-18T11:35:37.043Z"
updated: "2026-01-18T11:35:37.043Z"
tags:
  - performance
  - async
  - fs-utils
  - hooks
  - follow-up
  - project
---

## Decision

The synchronous file I/O pattern in fs-utils.ts must be converted to async for performance.

## Context

The 2026-01-18 feature review identified that all file operations use synchronous APIs (readFileSync, writeFileSync, existsSync), blocking the event loop. This causes:

- Hooks to exceed 50ms budget with moderate memory counts
- CLI operations to block 20-100ms per file operation
- O(n) scaling issues as memory databases grow

## Affected Files

- skills/memory/src/core/fs-utils.ts (8 functions)
- hooks/pre-compact/memory-capture.ts (sync fs in hook)
- hooks/session-end/memory-cleanup.ts (sync fs in hook)

## Implementation Plan

1. Convert fs-utils.ts functions to async (use fs.promises)
2. Update all callsites to use await
3. Batch file operations where possible
4. Use existing index.json instead of directory scans

## Estimated Effort

4-6 hours

## Priority

Medium - acceptable for current scale (<200 memories), but required before scaling.
