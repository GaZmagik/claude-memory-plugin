---
id: learning-tdd-typescript-hook-bidirectional-enforcement
title: "TDD TypeScript hook: bidirectional stub-test-implementation enforcement"
type: learning
scope: local
project: claude-memory-plugin
created: "2026-01-11T13:58:25Z"
updated: "2026-01-13T22:47:21.033Z"
tags:
  - plugin
  - tdd
  - typescript
  - hook
  - user-level
links:
  - learning-memory-context-hook-graceful-search-degradation
  - learning-memory-context-hook-graceful-search-degradation
  - learning-hook-protection-can-block-legitimate-git-operations---requires-careful-pattern-matching
  - artifact-tdd-testing-patterns-catalogue
---

## Purpose

Created user-level TDD hook at `~/.claude/hooks/ts/pre-tool-use/tdd-typescript.ts` (not plugin-scoped) to enforce Test-Driven Development workflow for TypeScript projects with `tests/unit/` directory structure.

## Workflow Enforced

1. **Create source stub** (intent declaration): `touch skills/memory/src/core/file.ts`
2. **Write test file** (now allowed - source exists): `Write tests/unit/core/file.spec.ts`
3. **Implement source** (now allowed - test exists with assertions): `Write skills/memory/src/core/file.ts`

## Bidirectional Checks

**When writing test file**:
- Detect split test patterns (code smell): `-coverage`, `-extended`, `-part1` suffixes blocked
- Require source stub to exist at corresponding path
- Provide helpful error with mkdir + touch commands

**When writing source file**:
- Require test file to exist
- Verify test file contains actual test assertions (describe/it/test + expect calls)
- Block empty test files

## Project Detection

Only activates for projects with:
- `tests/unit/` directory present
- Source in: `skills/*/src/`, `hooks/src/`, or `src/`

Multiple source patterns supported via SOURCE_MAPPINGS and TEST_MAPPINGS arrays (extensible).

## Note

Hook placed at user level (`~/.claude/hooks/`) not plugin repo, as it's a workflow tool applicable to any TypeScript project.
