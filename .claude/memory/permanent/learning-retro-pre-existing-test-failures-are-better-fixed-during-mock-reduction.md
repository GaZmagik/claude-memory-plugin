---
id: learning-retro-pre-existing-test-failures-are-better-fixed-during-mock-reduction
title: Retro - Pre-existing test failures are better fixed during mock reduction
type: learning
scope: project
created: "2026-01-18T02:32:22.571Z"
updated: "2026-01-18T02:32:22.571Z"
tags:
  - retrospective
  - testing
  - process
  - project
severity: medium
---

Discovered think/frontmatter.spec.ts had outdated test expecting 'status is required' but implementation allows missing status (derived later by parseThinkDocument). Fixed by updating test to document backwards compatibility behavior. Lesson: When refactoring tests in one area, run full suite to catch related issues - test failures are often in adjacent code that uses similar patterns.
