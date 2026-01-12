---
id: learning-tdd-enforcement-requires-test-files-before-source-edits-creates-friction-with-simple-fixes
title: TDD enforcement requires test files before source edits - creates friction with simple fixes
type: learning
scope: project
project: claude-memory-plugin
created: "2026-01-12T21:05:30.797Z"
updated: "2026-01-12T22:02:47.191Z"
tags:
  - tdd
  - workflow
  - retro
  - project
---

# TDD Enforcement and Simple Fixes Friction

## Insight
The TDD enforcement hook blocks edits to TypeScript source files without corresponding .spec.ts test files. While beneficial for major features, this creates workflow friction for simple namespace fixes and documentation updates.

## Discovery
Simple fix (changing `/memory-commit` to `/memory:memory-commit` in 2 hook files) required creating 4 test files first, even though the tests themselves had limited scope.

## Trade-offs
**Pros:**
- Forces explicit test creation before implementation
- Prevents untested code from entering the codebase
- Good for complex features

**Cons:**
- Friction for simple refactoring/fixes
- Test files for simple namespace changes feel boilerplate-heavy
- Can slow down small iterations

## Observation
The TDD hook doesn't distinguish between:
- Major feature implementation (needs tests)
- Bug fix in existing code (minimal test needs)
- Simple refactoring (often no new test paths needed)

## Future Consideration
Consider adding exceptions for:
- Pure refactoring (no new code paths)
- Namespace/reference updates (test-data only changes)
- Documentation fixes (non-functional changes)

Or allow --no-tdd override with explicit justification.
