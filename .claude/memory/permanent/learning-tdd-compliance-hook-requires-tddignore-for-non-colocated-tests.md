---
id: learning-tdd-compliance-hook-requires-tddignore-for-non-colocated-tests
title: TDD compliance hook requires .tddignore for non-colocated tests
type: learning
scope: project
created: "2026-01-25T12:22:35.247Z"
updated: "2026-01-25T12:22:35.247Z"
tags:
  - tdd
  - testing
  - hooks
  - v1.1.0
  - project
---

When tests exist in tests/ directory with test- prefix (non-colocated), add entries to .tddignore so the TDD hook recognizes them. Without .tddignore entries, the PreToolUse hook blocks Write operations even if tests exist elsewhere in the project. Lesson: .tddignore is essential for non-standard test layouts.
