---
id: learning-typescript-tdd-hook-naming-enforcement
title: typescript-tdd-hook-naming-enforcement
type: permanent
scope: local
project: claude-memory-plugin
created: "2026-01-11T17:55:27Z"
updated: "2026-01-12T22:02:47.187Z"
tags:
  - learning
  - tip
  - medium
  - tdd
  - naming
  - typescript
  - build
links:
  - learning-tdd-scope-resolution-module-structure
  - learning-test-naming-convention-spec-ts
---

# typescript-tdd-hook-naming-enforcement

**Category:** tip
**Severity:** medium
**Date:** 2026-01-11

## Context

TDD enforcement hook requires test file naming to match source file naming exactly

## Problem

Created tests/unit/search/semantic-search.spec.ts for skills/memory/src/search/semantic.ts. TDD hook rejected edit because test file name didn't match source file name. Required renaming test file from semantic-search.spec.ts to semantic.spec.ts.

## Solution

Test files MUST use EXACT source file name before .spec extension: source.ts -> source.spec.ts. Not source-different-name.spec.ts. Hook validates this before allowing test modifications.
