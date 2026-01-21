---
id: gotcha-cli-doubled-prefix-bug-type-prefix-already-added-by-id-generator
title: "CLI doubled prefix bug: type prefix already added by ID generator"
type: gotcha
scope: project
created: "2026-01-21T20:14:13.550Z"
updated: "2026-01-21T20:14:13.550Z"
tags:
  - cli
  - think-promotion
  - id-generation
  - project
---

## The Bug

When promoting think documents to permanent memories, `conclude.ts` was prepending the type to the title (e.g., 'Decision: My Topic'). However, `generateId()` in `slug.ts` already adds the type prefix to the ID. Result: `decision-decision-my-topic` instead of `decision-my-topic`.

## Root Cause

Line 250 in `conclude.ts` passed title with type prefix, then `writeMemory` called `generateUniqueId(type, title, ...)` which prepended type again.

## Fix

Remove the type prefix from title - pass just `parsed.frontmatter.topic` directly. The ID generator handles the prefix.

## Files

- `src/think/conclude.ts:250` - Changed from `'${promote}': ${topic}'` to just `topic`

## Status: RESOLVED (v1.0.3)

The original fix addressed the think promotion path but didn't fix the root cause in ID generation. In v1.0.3, we added proper sanitization at the ID generation layer (`stripTypePrefix()`) to handle all code paths.

**Fix locations:**
- `skills/memory/src/core/slug.ts` - Added `stripTypePrefix()` function and updated `generateId()`
- `skills/memory/src/think/conclude.ts` - Updated `generateMemoryId()` to use sanitization

The fix now defensively strips any existing type prefix before generating IDs, preventing duplication regardless of input source (CLI, API, or programmatic usage).
