---
id: learning-retro-mockmodule-isolation-in-separate-spec-files-prevents-test-pollution-while-enabling-comprehensive-ai-path-coverage
title: Retro - Mock.module isolation in separate spec files prevents test pollution while enabling comprehensive AI path coverage
type: learning
scope: project
created: "2026-01-16T19:39:21.033Z"
updated: "2026-01-16T19:39:21.033Z"
tags:
  - retrospective
  - process
  - testing
  - mocking
  - project
severity: medium
---

Creating thoughts-ai.spec.ts as a separate file using mock.module allowed testing the AI invocation path (lines 124-159 of thoughts.ts) without polluting the main test file. This pattern is effective for modules requiring mock isolation - separating by module concern rather than trying to isolate within a single file.
