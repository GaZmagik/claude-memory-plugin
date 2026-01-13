---
id: learning-scope-field-frontmatter-serialisation-gotcha-two
title: scope-field-frontmatter-serialisation-gotcha-two
type: gotcha
scope: local
project: claude-memory-plugin
created: "2026-01-10T19:58:35Z"
updated: "2026-01-13T13:24:16.496Z"
tags:
  - learning
  - gotcha
  - high
  - scope-resolution
  - serialisation
  - frontmatter
  - type-safety
---

# scope-field-frontmatter-serialisation-gotcha-two

**Category:** gotcha
**Severity:** high
**Date:** 2026-01-10

## Context

Phase 2 scope resolution implementation. Scope field added to MemoryFrontmatter type.

## Problem

Scope field passed through frontmatter.ts and write.ts but not included in API response. SearchMemoriesResponse missing scope in SearchResult items.

## Solution

Scope must be explicitly added at THREE locations: (1) MemoryFrontmatter type, (2) WriteMemoryResponse.memory property, (3) SearchResult type. Each module must pass it through without assuming it's inherited.

## Prevention

When adding fields to core types, trace them through ALL usages immediately. Create integration tests that verify field presence in responses.
