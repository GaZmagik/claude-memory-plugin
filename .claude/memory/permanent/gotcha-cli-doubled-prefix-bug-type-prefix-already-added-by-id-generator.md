---
id: gotcha-cli-doubled-prefix-bug-type-prefix-already-added-by-id-generator
title: "CLI doubled prefix bug: type prefix already added by ID generator"
type: gotcha
scope: project
project: claude-memory-plugin
created: "2026-01-12T20:02:50.449Z"
updated: "2026-01-12T22:02:47.193Z"
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

- `src/think/conclude.ts:250` - Changed from `\'${promote}\': ${topic}\'` to just `topic`
