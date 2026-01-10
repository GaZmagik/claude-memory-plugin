---
id: learning-scope-field-frontmatter-serialisation-gotcha
title: scope-field-frontmatter-serialisation-gotcha
type: permanent
scope: local
project: claude-memory-plugin
created: 2026-01-10T18:12:16Z
updated: 2026-01-10T18:12:18Z
tags: ["learning","gotcha","medium","phase-2","scope-resolution","frontmatter","serialisation"]
embedding: "66d40e1f4be2886cd9a7335c40937bbe"
links: []
---

# scope-field-frontmatter-serialisation-gotcha

**Category:** gotcha
**Severity:** medium
**Date:** 2026-01-10

## Context

Phase 2 scope resolution implementation - updating CRUD operations to accept scope parameter

## Problem

Added scope field to WriteMemoryRequest but forgot to pass it through to createFrontmatter(). Scope was stored in IndexEntry but not serialised to YAML frontmatter. Required updates in three places: types/api.ts, core/write.ts, and core/frontmatter.ts. Would have been caught earlier with explicit frontmatter tests.

## Solution

Always serialise all frontmatter fields explicitly in serialiseFrontmatter(). Add scope to createFrontmatter() params. Update write.ts to pass scope to createFrontmatter(). Update types to include scope in all relevant interfaces.

## Example

```
Missing from serialiseFrontmatter: if(frontmatter.scope) clean.scope = frontmatter.scope; Added to createFrontmatter params: scope?: MemoryFrontmatter['scope'];
```

## Prevention

Test that saved memory files contain all expected fields in YAML. Read a memory back and verify all fields round-trip correctly.
