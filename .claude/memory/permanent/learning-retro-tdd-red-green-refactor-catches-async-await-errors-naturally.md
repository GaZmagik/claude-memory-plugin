---
id: learning-retro-tdd-red-green-refactor-catches-async-await-errors-naturally
title: Retro - TDD red-green-refactor catches async-await errors naturally
type: learning
scope: project
created: "2026-01-18T18:12:20.225Z"
updated: "2026-01-18T18:12:20.225Z"
tags:
  - retrospective
  - process
  - tdd
  - async
  - project
severity: medium
---

Converting async in TDD order (tests → implementation → callers) meant each missing `await` surfaced as a test failure immediately. Tests failed with clear error messages like 'Duplicate ID' or 'Memory not found', leading us directly to the root cause (unawaited promise always truthy). This was far cleaner than static analysis or code review.
